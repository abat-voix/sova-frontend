"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { teamErrorMessage } from "@/components/team/team-errors";
import { TeamMembersTable } from "@/components/team/team-members-table";
import { useTeamList } from "@/components/team/use-team-list";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { claimKam, releaseKam, usersRootKey } from "@/lib/api/users/team";
import { useLocale } from "@/providers/locale-provider";
import type { SovaUser } from "@/types/user";

const releaseHeadingId = "release-kam-title";

const copy = {
  ru: {
    title: "Моя команда",
    description: "КАМы вашей команды и свободные КАМы, которых можно забрать.",
    myTeam: "Моя команда",
    freeKams: "Свободные КАМы",
    emptyTeam: "В команде пока никого. Добавьте свободных КАМов ниже.",
    emptyFree: "Свободных КАМов нет.",
    claim: "Добавить в команду",
    release: "Отпустить",
    cancel: "Отмена",
    close: "Закрыть",
    releaseTitle: "Отпустить КАМа?",
    releaseText: (name: string) =>
      `${name} станет свободным КАМом. Его взаимодействия останутся видны всем руководителям, назначения ответственных не изменятся.`,
    claimed: (name: string) => `${name} — в вашей команде`,
    released: (name: string) => `${name} больше не в вашей команде`,
  },
  en: {
    title: "My team",
    description: "Your team's KAMs and KAMs without a head you can take.",
    myTeam: "My team",
    freeKams: "KAMs without a head",
    emptyTeam: "Your team is empty. Add KAMs without a head below.",
    emptyFree: "There are no KAMs without a head.",
    claim: "Add to team",
    release: "Release",
    cancel: "Cancel",
    close: "Close",
    releaseTitle: "Release the KAM?",
    releaseText: (name: string) =>
      `${name} will have no head. Their interactions stay visible to all heads; responsibles do not change.`,
    claimed: (name: string) => `${name} joined your team`,
    released: (name: string) => `${name} left your team`,
  },
};

/** Рабочее место руководителя: своя команда (отпустить) и свободные КАМы (забрать). */
export function HeadTeamWorkspace({ csrfToken }: { csrfToken: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const mine = useTeamList({ team: "mine" });
  const free = useTeamList({ team: "free" });
  const [releasing, setReleasing] = useState<SovaUser | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: usersRootKey });
  }

  function handleError(error: unknown) {
    toast.error(teamErrorMessage(error, locale));
    refresh();
  }

  const claim = useMutation({
    mutationFn: (user: SovaUser) => claimKam(user.id, csrfToken),
    onError: handleError,
    onSuccess: (_, user) => {
      toast.success(text.claimed(user.full_name));
      refresh();
    },
  });
  const release = useMutation({
    mutationFn: (user: SovaUser) => releaseKam(user.id, csrfToken),
    onError: handleError,
    onSettled: () => setReleasing(null),
    onSuccess: (_, user) => {
      toast.success(text.released(user.full_name));
      refresh();
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-medium">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.description}</p>
      </header>

      <TeamMembersTable
        caption={text.myTeam}
        count={mine.query.data?.count ?? 0}
        empty={text.emptyTeam}
        isError={mine.query.isError}
        isLoading={mine.query.isPending}
        onPageChange={mine.setPage}
        onRetry={() => void mine.query.refetch()}
        onSearchChange={mine.setSearch}
        page={mine.page}
        renderAction={(user) => (
          <Button
            aria-label={`${text.release}: ${user.full_name}`}
            colorScheme="neutral"
            onClick={() => setReleasing(user)}
            size="s"
            type="button"
            variant="outline"
          >
            {text.release}
          </Button>
        )}
        rows={mine.query.data?.results ?? []}
        search={mine.search}
      />

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
        renderAction={(user) => (
          <Button
            aria-label={`${text.claim}: ${user.full_name}`}
            disabled={claim.isPending}
            onClick={() => claim.mutate(user)}
            size="s"
            type="button"
            variant="secondary"
          >
            {text.claim}
          </Button>
        )}
        rows={free.query.data?.results ?? []}
        search={free.search}
      />

      {releasing ? (
        <Modal
          closeLabel={text.close}
          labelledBy={releaseHeadingId}
          onClose={() => setReleasing(null)}
        >
          <div className="p-6">
            <h2 className="pr-10 text-lg font-medium" id={releaseHeadingId}>
              {text.releaseTitle}
            </h2>
            <p className="text-muted-foreground mt-2">
              {text.releaseText(releasing.full_name)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                colorScheme="neutral"
                onClick={() => setReleasing(null)}
                size="m"
                type="button"
                variant="outline"
              >
                {text.cancel}
              </Button>
              <Button
                disabled={release.isPending}
                onClick={() => release.mutate(releasing)}
                size="m"
                type="button"
              >
                {text.release}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
