/**
 * Health-check — по схеме `HealthResponse` из `docs/SOVA API.yaml`.
 *
 * Возвращается на `GET /api/health/`. `200` — всё в порядке,
 * `503` — что-то из зависимостей недоступно.
 */
export type HealthResponse = {
  status: string;
  database: string;
  cache: string;
};
