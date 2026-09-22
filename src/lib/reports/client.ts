import { publicEnv } from "@/lib/env";

import { getCsrfToken } from "./csrf";
import { ReportApiError, type ApiErrorBody } from "./types";

const BASE_URL = `${publicEnv.NEXT_PUBLIC_API_URL}/api/reports/`;

export async function reportsApi<T>(
  path: string,
  options: {
    body?: unknown;
    signal?: AbortSignal;
    method?: "GET" | "POST";
  } = {},
): Promise<T> {
  const { body, signal, method = body ? "POST" : "GET" } = options;

  const res = await fetch(new URL(path, BASE_URL), {
    method,
    credentials: "include",
    headers: body
      ? { "Content-Type": "application/json", "X-CSRFToken": getCsrfToken() }
      : {},
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    let data: ApiErrorBody | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    throw new ReportApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}
