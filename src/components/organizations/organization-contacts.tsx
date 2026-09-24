"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { LoaderCircle, Mail, Phone, UserRound, UsersRound } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { getContactPersons } from "@/lib/api/catalog/contact-persons";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    title: "Контактные лица",
    empty: "Контактные лица не указаны",
    error: "Не удалось загрузить контактные лица.",
    loading: "Загружаем контактные лица…",
    loadMore: "Показать ещё",
    loadingMore: "Загружаем…",
    retry: "Повторить",
  },
  en: {
    title: "Contact people",
    empty: "No contact people provided",
    error: "Could not load contact people.",
    loading: "Loading contact people…",
    loadMore: "Show more",
    loadingMore: "Loading…",
    retry: "Retry",
  },
} as const;

/**
 * Контактные лица контрагента — вуза или B2C-клиента. Модуль скрывает
 * пагинацию каталога и состояния запроса, чтобы карточка знала только ID.
 */
export function OrganizationContacts({
  b2cClientId,
  universityId,
}: {
  b2cClientId?: string;
  universityId?: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const contactsQuery = useInfiniteQuery({
    queryKey: [
      "catalog",
      "contact-persons",
      b2cClientId ? "b2c-client" : "university",
      b2cClientId ?? universityId,
    ],
    queryFn: ({ pageParam }) =>
      getContactPersons({ b2cClientId, page: pageParam, universityId }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const contacts = useMemo(
    () => contactsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [contactsQuery.data],
  );
  const count = contactsQuery.data?.pages[0]?.count;

  return (
    <section aria-label={text.title} className="mt-5 border-t pt-4">
      <div className="flex items-center gap-2">
        <UsersRound
          aria-hidden="true"
          className="text-muted-foreground size-4"
        />
        <h3 className="text-sm font-medium">{text.title}</h3>
        {count !== undefined ? (
          <span className="text-muted-foreground text-xs">{count}</span>
        ) : null}
      </div>

      {contactsQuery.isPending ? (
        <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {text.loading}
        </p>
      ) : contactsQuery.isError ? (
        <div className="mt-3 space-y-2">
          <p className="text-muted-foreground text-sm">{text.error}</p>
          <Button
            colorScheme="neutral"
            onClick={() => void contactsQuery.refetch()}
            size="s"
            type="button"
            variant="outline"
          >
            {text.retry}
          </Button>
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">{text.empty}</p>
      ) : (
        <>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {contacts.map((contact) => (
              <li className="bg-secondary/70 rounded-lg p-3" key={contact.id}>
                <div className="flex items-start gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-5 font-medium break-words">
                      {contact.full_name}
                    </p>
                    {contact.position ? (
                      <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
                        {contact.position}
                      </p>
                    ) : null}
                  </div>
                </div>
                {contact.email || contact.phone ? (
                  <div className="mt-2 space-y-1 pl-6 text-xs">
                    {contact.email ? (
                      <a
                        className="flex items-center gap-2 break-all hover:underline"
                        href={`mailto:${contact.email}`}
                      >
                        <Mail
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        {contact.email}
                      </a>
                    ) : null}
                    {contact.phone ? (
                      <a
                        className="flex items-center gap-2 hover:underline"
                        href={`tel:${contact.phone}`}
                      >
                        <Phone
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        {contact.phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {contactsQuery.hasNextPage ? (
            <Button
              className="mt-3 w-full"
              colorScheme="neutral"
              disabled={contactsQuery.isFetchingNextPage}
              onClick={() => void contactsQuery.fetchNextPage()}
              size="m"
              type="button"
              variant="outline"
            >
              {contactsQuery.isFetchingNextPage ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : null}
              {contactsQuery.isFetchingNextPage
                ? text.loadingMore
                : text.loadMore}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
