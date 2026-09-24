import { afterEach, describe, expect, it, vi } from "vitest";

import { RealtimeClient } from "@/lib/realtime/realtime-client";
import { getRealtimeUrl } from "@/lib/realtime/url";

class FakeSocket {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn((code = 1000) => {
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  });

  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("realtime URL", () => {
  it("selects ws/wss from the page and supports an override", () => {
    expect(
      getRealtimeUrl({ protocol: "https:", host: "sova.example" } as Location),
    ).toBe("wss://sova.example/ws/events/");
    expect(
      getRealtimeUrl({ protocol: "http:", host: "localhost:3000" } as Location),
    ).toBe("ws://localhost:3000/ws/events/");
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "ws://localhost:8001/ws/events/");
    expect(
      getRealtimeUrl({ protocol: "https:", host: "ignored" } as Location),
    ).toBe("ws://localhost:8001/ws/events/");
  });
});

describe("RealtimeClient", () => {
  it("is idempotent and delivers each event id once", () => {
    const sockets: FakeSocket[] = [];
    const listener = vi.fn();
    const client = new RealtimeClient({
      url: "ws://localhost/ws/events/",
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.subscribe(listener);

    client.start();
    client.start();
    sockets[0].open();
    const event = {
      version: 1,
      id: "0199f5db-2778-7000-8000-000000000001",
      type: "messaging.conversation_created",
      occurred_at: "2026-09-24T12:00:00.000Z",
      data: { conversation_id: "0199f5db-2778-7000-8000-000000000002" },
    };
    sockets[0].message(event);
    sockets[0].message(event);

    expect(sockets).toHaveLength(1);
    expect(listener).toHaveBeenCalledOnce();
    client.stop();
    expect(sockets[0].close).toHaveBeenCalledWith(1000, "Client stopped");
  });

  it("falls back to reconnecting after the connection window", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const statuses: string[] = [];
    const client = new RealtimeClient({
      url: "ws://localhost/ws/events/",
      createSocket: () => socket,
      random: () => 0.5,
    });
    client.subscribeStatus((status) => statuses.push(status));

    client.start();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(socket.close).toHaveBeenCalledWith(1011, "Connection timeout");
    expect(statuses).toContain("reconnecting");
    client.stop();
  });

  it("stops retrying after an unauthorized close", async () => {
    const socket = new FakeSocket();
    const expired = vi.fn();
    const client = new RealtimeClient({
      url: "ws://localhost/ws/events/",
      createSocket: () => socket,
      onAuthExpired: expired,
    });
    client.start();
    socket.open();

    socket.close(4401);
    await Promise.resolve();

    expect(client.getStatus()).toBe("unauthorized");
    expect(expired).toHaveBeenCalledOnce();
  });
});
