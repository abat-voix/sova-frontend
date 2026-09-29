export function getRealtimeUrl(location: Pick<Location, "protocol" | "host">) {
  const override = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (override) return override;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/events/`;
}
