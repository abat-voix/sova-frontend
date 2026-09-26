"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { teamErrorMessage } from "@/components/team/team-errors";
import { TeamMembersTable } from "@/components/team/team-members-table";
import { useTeamList } from "@/components/team/use-team-list";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import {
  listUsers,
  setKamHead,
  usersQueryKey,
  usersRootKey,
} from "@/lib/api/users/team";
import { useLocale } from "@/providers/locale-provider";
import type { SovaUser } from "@/types/user";

const moveHeadingId = "move-kam-title";
const removeHeadingId = "remove-head-title";

const copy = {
  ru: {
    title: "Команды",
    description:
      "Команды руководителей: назначьте свободных КАМов, переведите КАМа в другую команду или снимите руководителя.",
    head: "Руководитель",
    headPlaceholder: "Выберите руководителя",
    newHead: "Новый руководитель",
    chooseHead: "Выберите руководителя, чтобы увидеть его команду.",
    team: (name: string) => `Команда: ${name}`,
    emptyTeam: "В команде пока никого.",
    freeKams: "Свободные КАМы",
    emptyFree: "Свободных КАМов нет.",
    assign: "Назначить в команду",
    move: "Перевести",
    removeHead: "Снять руководителя",
    cancel: "Отмена",
    close: "Закрыть",
    moveTitle: (name: string) => `Перевести ${name} в другую команду`,
    removeText: (name: string) => `${name} станет свободным КАМом.`,
    saved: "Команда обновлена",
  },
  en: {
    title: "Teams",
    description:
      "Heads' teams: assign KAMs without a head, move a KAM to another team or remove the head.",
    head: "Head",
    headPlaceholder: "Choose a head",
    newHead: "New head",
    chooseHead: "Choose a head to see their team.",
    team: (name: string) => `Team: ${name}`,
    emptyTeam: "The team is empty.",
    freeKams: "KAMs without a head",
    emptyFree: "There are no KAMs without a head.",
    assign: "Assign to team",
    move: "Move",
    removeHead: "Remove head",
    cancel: "Cancel",
    close: "Close",
    moveTitle: (name: string) => `Move ${name} to another team`,
    removeText: (name: string) => `${name} will have no head.`,
    saved: "The team is updated",
  },
};

async function searchHeads(term: string): Promise<LookupOption[]> {
  const page = await listUsers({ role: ["head"], search: term });
  return page.results.map((user) => ({
    id: String(user.id),
    name: user.full_name,
  }));
}

/** Рабочее место администратора: команды всех руководителей и свободные КАМы. */
export function AdminTeamsWorkspace({ csrfToken }: { csrfToken: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [selectedHead, setSelectedHead] = useState<LookupOption | null>(null);
  const [moving, setMoving] = useState<SovaUser | null>(null);
  const [newHead, setNewHead] = useState<LookupOption | null>(null);
  const [removing, setRemoving] = useState<SovaUser | null>(null);
  const headId = selectedHead ? Number(selectedHead.id) : undefined;
  const team = useTeamList({ head: headId }, headId !== undefined);
  const free = useTeamList({ role: ["kam"], team: "free" });

  const setHead = useMutation({
    mutationFn: ({ headId, kam }: { headId: number | null; kam: SovaUser }) =>
      setKamHead(kam.id, headId, csrfToken),
    onError: (error) => {
      toast.error(teamErrorMessage(error, locale));
      void queryClient.invalidateQueries({ queryKey: usersRootKey });
    },
    onSettled: () => {
      setMoving(null);
      setNewHead(null);
      setRemoving(null);
    },
    onSuccess: () => {
      toast.success(text.saved);
      void queryClient.invalidateQueries({ queryKey: usersRootKey });
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.description}</p>
      </header>

      <div className="max-w-md">
        <EntitySelect
          id="team-head"
          label={text.head}
          onChange={setSelectedHead}
          placeholder={text.headPlaceholder}
          queryKey={usersQueryKey("heads")}
          search={searchHeads}
          value={selectedHead}
        />
      </div>

      {selectedHead ? (
        <TeamMembersTable
          caption={text.team(selectedHead.name)}
          count={team.query.data?.count ?? 0}
          empty={text.emptyTeam}
          isError={team.query.isError}
          isLoading={team.query.isPending}
          onPageChange={team.setPage}
          onRetry={() => void team.query.refetch()}
          onSearchChange={team.setSearch}
          page={team.page}
          renderAction={(kam) => (
            <div className="flex justify-end gap-2">
              <Button
                aria-label={`${text.move}: ${kam.full_name}`}
                colorScheme="neutral"
                onClick={() => setMoving(kam)}
                size="s"
                type="button"
                variant="outline"
              >
                {text.move}
              </Button>
              <Button
                aria-label={`${text.removeHead}: ${kam.full_name}`}
                colorScheme="neutral"
                onClick={() => setRemoving(kam)}
                size="s"
                type="button"
                variant="outline"
              >
                {text.removeHead}
              </Button>
            </div>
          )}
          rows={team.query.data?.results ?? []}
          search={team.search}
        />
      ) : (
        <p className="text-muted-foreground">{text.chooseHead}</p>
      )}

      <TeamMembersTable
        caption={text.freeKams}
        count={free.query.data?.count ?? 0}
        empty={text.emptyFree}
        isError={free.query.isError}
        isLoading={free.query.isPending}
        onPageChange={free.setPage}
        onRetry={() => void free.query.refetch()}
        onSearchChange={free.setSearch}
        page={free.page}
        renderAction={(kam) => (
          <Button
            aria-label={`${text.assign}: ${kam.full_name}`}
            disabled={headId === undefined || setHead.isPending}
            onClick={() =>
              headId !== undefined && setHead.mutate({ headId, kam })
            }
            size="s"
            type="button"
            variant="secondary"
          >
            {text.assign}
          </Button>
        )}
        rows={free.query.data?.results ?? []}
        search={free.search}
      />

      {moving ? (
        <Modal
          allowContentOverflow
          closeLabel={text.close}
          labelledBy={moveHeadingId}
          onClose={() => setMoving(null)}
        >
          <div className="space-y-4 p-6">
            <h2 className="pr-10 text-lg font-medium" id={moveHeadingId}>
              {text.moveTitle(moving.full_name)}
            </h2>
            <EntitySelect
              excludeIds={selectedHead ? [selectedHead.id] : []}
              id="team-new-head"
              label={text.newHead}
              onChange={setNewHead}
              placeholder={text.headPlaceholder}
              queryKey={usersQueryKey("heads")}
              search={searchHeads}
              value={newHead}
            />
            <div className="flex justify-end gap-2">
              <Button
                colorScheme="neutral"
                onClick={() => setMoving(null)}
                size="m"
                type="button"
                variant="outline"
              >
                {text.cancel}
              </Button>
              <Button
                disabled={newHead === null || setHead.isPending}
                onClick={() =>
                  newHead &&
                  setHead.mutate({ headId: Number(newHead.id), kam: moving })
                }
                size="m"
                type="button"
              >
                {text.move}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          closeLabel={text.close}
          labelledBy={removeHeadingId}
          onClose={() => setRemoving(null)}
        >
          <div className="p-6">
            <h2 className="pr-10 text-lg font-medium" id={removeHeadingId}>
              {text.removeHead}
            </h2>
            <p className="text-muted-foreground mt-2">
              {text.removeText(removing.full_name)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                colorScheme="neutral"
                onClick={() => setRemoving(null)}
                size="m"
                type="button"
                variant="outline"
              >
                {text.cancel}
              </Button>
              <Button
                disabled={setHead.isPending}
                onClick={() => setHead.mutate({ headId: null, kam: removing })}
                size="m"
                type="button"
              >
                {text.removeHead}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
