"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  listUsers,
  usersQueryKey,
  type UserListParams,
} from "@/lib/api/users/team";

/** Постраничный список пользователей раздела «Команда» со своим поиском. */
export function useTeamList(
  filters: Omit<UserListParams, "page" | "search">,
  enabled = true,
) {
  // Страница привязана к фильтрам: другой руководитель начинается с первой,
  // иначе запрос несуществующей страницы вернул бы 404
  const filtersKey = JSON.stringify(filters);
  const [pageState, setPageState] = useState({ filtersKey, page: 1 });
  const page = pageState.filtersKey === filtersKey ? pageState.page : 1;
  const [search, setSearchValue] = useState("");
  const params = { ...filters, page, search };

  function setPage(value: number) {
    setPageState({ filtersKey, page: value });
  }
  const query = useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => listUsers(params),
    queryKey: usersQueryKey("team", params),
  });

  function setSearch(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  return { page, query, search, setPage, setSearch };
}
