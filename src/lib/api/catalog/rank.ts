/**
 * Отбор по месту в рейтинге каталога. Место считает бэкенд — оно общее для
 * всех и не зависит от поиска и других отборов. `all` параметры не отправляет.
 */
export type RankFilter = "all" | "top10" | "ranked" | "unranked";

export const topRankLimit = 10;

/** Параметры запроса для отбора по рейтингу. */
export function rankParams(filter: RankFilter) {
  return {
    has_rank:
      filter === "ranked" || filter === "top10"
        ? "true"
        : filter === "unranked"
          ? "false"
          : undefined,
    rank_max: filter === "top10" ? topRankLimit : undefined,
  };
}

/** Отбор по рейтингу показывает места по порядку, остальные — как раньше. */
export function rankOrdering(filter: RankFilter, fallback?: string) {
  return filter === "ranked" || filter === "top10" ? "rank" : fallback;
}
