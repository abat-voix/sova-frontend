import {
  parseRealtimeEvent,
  type RealtimeEvent,
} from "@/lib/realtime/protocol";

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "unauthorized"
  | "stopped";

type SocketLike = Pick<
  WebSocket,
  | "close"
  | "send"
  | "readyState"
  | "onopen"
  | "onclose"
  | "onerror"
  | "onmessage"
>;

type RealtimeClientOptions = {
  url: string;
  createSocket?: (url: string) => SocketLike;
  onAuthExpired?: () => unknown | Promise<unknown>;
  checkSession?: () => boolean | Promise<boolean>;
  random?: () => number;
};

const heartbeatIntervalMs = 45_000;
const pongTimeoutMs = 15_000;
const stableConnectionMs = 60_000;
const connectionTimeoutMs = 5_000;
const dedupeTtlMs = 5 * 60_000;
const dedupeMaxSize = 1_000;
const openState = 1;

export class RealtimeClient {
  private readonly listeners = new Set<(event: RealtimeEvent) => void>();
  private readonly statusListeners = new Set<
    (status: RealtimeStatus) => void
  >();
  private readonly seenEvents = new Map<string, number>();
  private readonly options: RealtimeClientOptions;
  private socket: SocketLike | null = null;
  private status: RealtimeStatus = "idle";
  private started = false;
  private generation = 0;
  private reconnectAttempt = 0;
  private checkedSessionForOutage = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private pongTimer: ReturnType<typeof setTimeout> | undefined;
  private stableTimer: ReturnType<typeof setTimeout> | undefined;
  private connectionTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingPingId: string | null = null;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.reconnectAttempt = 0;
    this.checkedSessionForOutage = false;
    this.connect(false);
  }

  stop() {
    if (!this.started && this.status === "stopped") return;
    this.started = false;
    this.generation += 1;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "Client stopped");
    this.setStatus("stopped");
  }

  subscribe(listener: (event: RealtimeEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: (status: RealtimeStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus() {
    return this.status;
  }

  private connect(reconnecting: boolean) {
    if (!this.started) return;
    this.clearConnectionTimers();
    const generation = ++this.generation;
    this.setStatus(reconnecting ? "reconnecting" : "connecting");
    const socket = (this.options.createSocket ?? ((url) => new WebSocket(url)))(
      this.options.url,
    );
    this.socket = socket;
    let opened = false;
    this.connectionTimer = setTimeout(() => {
      if (this.isCurrent(generation, socket) && !opened) {
        socket.close(1011, "Connection timeout");
      }
    }, connectionTimeoutMs);

    socket.onopen = () => {
      if (!this.isCurrent(generation, socket)) return;
      opened = true;
      if (this.connectionTimer) clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
      this.checkedSessionForOutage = false;
      this.setStatus("connected");
      this.startHeartbeat(generation, socket);
      this.stableTimer = setTimeout(() => {
        if (this.isCurrent(generation, socket)) this.reconnectAttempt = 0;
      }, stableConnectionMs);
    };
    socket.onmessage = (message) => {
      if (!this.isCurrent(generation, socket)) return;
      this.handleMessage(message.data);
    };
    socket.onerror = () => {
      // `close` owns retry decisions; browsers expose no useful error details here.
    };
    socket.onclose = (event) => {
      if (!this.isCurrent(generation, socket)) return;
      this.socket = null;
      this.clearConnectionTimers();
      void this.handleClose(event.code, opened);
    };
  }

  private async handleClose(code: number, opened: boolean) {
    if (!this.started) return;
    if (code === 4400 || code === 4403) {
      this.started = false;
      this.setStatus("stopped");
      console.error(`Realtime stopped after server close code ${code}`);
      return;
    }
    if (code === 4401) {
      this.started = false;
      this.setStatus("unauthorized");
      await this.options.onAuthExpired?.();
      return;
    }
    if (code === 4001) {
      this.scheduleReconnect(0, false);
      return;
    }

    if (!opened && !this.checkedSessionForOutage && this.options.checkSession) {
      this.checkedSessionForOutage = true;
      try {
        const authenticated = await this.options.checkSession();
        if (!authenticated) {
          this.started = false;
          this.setStatus("unauthorized");
          await this.options.onAuthExpired?.();
          return;
        }
      } catch {
        // A failed session check may be the same temporary outage; keep fallback alive.
      }
    }
    this.scheduleReconnect(this.nextBackoff(), true);
  }

  private scheduleReconnect(delay: number, increaseAttempt: boolean) {
    if (!this.started) return;
    this.setStatus("reconnecting");
    if (increaseAttempt) this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(true), delay);
  }

  private nextBackoff() {
    const baseSeconds = [1, 2, 4, 8, 15, 30][
      Math.min(this.reconnectAttempt, 5)
    ];
    const jitter = 0.8 + (this.options.random ?? Math.random)() * 0.4;
    return baseSeconds * 1_000 * jitter;
  }

  private startHeartbeat(generation: number, socket: SocketLike) {
    this.heartbeatTimer = setInterval(() => {
      if (
        !this.isCurrent(generation, socket) ||
        socket.readyState !== openState
      )
        return;
      const id = crypto.randomUUID();
      this.pendingPingId = id;
      socket.send(JSON.stringify({ type: "ping", id }));
      if (this.pongTimer) clearTimeout(this.pongTimer);
      this.pongTimer = setTimeout(() => {
        if (this.isCurrent(generation, socket))
          socket.close(1011, "Pong timeout");
      }, pongTimeoutMs);
    }, heartbeatIntervalMs);
  }

  private handleMessage(data: unknown) {
    if (typeof data !== "string") return;
    try {
      const payload = JSON.parse(data) as unknown;
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "pong"
      ) {
        if ("id" in payload && payload.id === this.pendingPingId) {
          this.pendingPingId = null;
          if (this.pongTimer) clearTimeout(this.pongTimer);
          this.pongTimer = undefined;
        }
        return;
      }
      const parsed = parseRealtimeEvent(payload);
      if (parsed.kind !== "event") {
        console.warn(
          "Ignored invalid or unsupported realtime event",
          parsed.kind,
        );
        return;
      }
      if (this.isDuplicate(parsed.event.id)) return;
      this.listeners.forEach((listener) => listener(parsed.event));
    } catch {
      console.warn("Ignored malformed realtime frame");
    }
  }

  private isDuplicate(id: string) {
    const now = Date.now();
    for (const [eventId, seenAt] of this.seenEvents) {
      if (now - seenAt > dedupeTtlMs) this.seenEvents.delete(eventId);
    }
    if (this.seenEvents.has(id)) return true;
    this.seenEvents.set(id, now);
    while (this.seenEvents.size > dedupeMaxSize) {
      const oldest = this.seenEvents.keys().next().value as string | undefined;
      if (!oldest) break;
      this.seenEvents.delete(oldest);
    }
    return false;
  }

  private isCurrent(generation: number, socket: SocketLike) {
    return (
      this.started && generation === this.generation && socket === this.socket
    );
  }

  private setStatus(status: RealtimeStatus) {
    if (status === this.status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private clearConnectionTimers() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    if (this.stableTimer) clearTimeout(this.stableTimer);
    if (this.connectionTimer) clearTimeout(this.connectionTimer);
    this.heartbeatTimer = undefined;
    this.pongTimer = undefined;
    this.stableTimer = undefined;
    this.connectionTimer = undefined;
    this.pendingPingId = null;
  }

  private clearTimers() {
    this.clearConnectionTimers();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }
}
