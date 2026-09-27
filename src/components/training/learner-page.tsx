"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  DetailRows,
  registryCopy,
} from "@/components/registry/registry-shared";
import { BackLink } from "@/components/training/back-link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusChip } from "@/components/ui/status-chip";
import {
  getLearner,
  getLearnerPersonalData,
} from "@/lib/api/training/learners";
import { trainingStreamHref } from "@/lib/api/training/streams";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { LearnerPersonalData } from "@/types/training";

const personalDataHeadingId = "learner-personal-data-title";

const copy = {
  ru: {
    back: "Все обучающиеся",
    loading: "Загружаем обучающегося…",
    error: "Не удалось загрузить обучающегося.",
    email: "Email",
    phone: "Телефон",
    createdAt: "Загружен",
    consent: "Согласие на обработку ПД",
    contacts: "Контакты",
    participations: "Участие в потоках",
    noParticipations: "Обучающийся пока не участвует в заявках потоков.",
    stream: "Поток",
    paid: "Оплачено",
    notPaid: "Не оплачено",
    enrolled: "Зачислен",
    notEnrolled: "Не зачислен",
    personalData: "Персональные данные",
    personalDataNote:
      "Просмотр записан в журнал доступа к персональным данным.",
    personalDataError: "Не удалось загрузить персональные данные.",
    loadingPersonalData: "Загружаем персональные данные…",
  },
  en: {
    back: "All learners",
    loading: "Loading the learner…",
    error: "The learner could not be loaded.",
    email: "Email",
    phone: "Phone",
    createdAt: "Uploaded",
    consent: "Personal data consent",
    contacts: "Contacts",
    participations: "Stream participation",
    noParticipations: "The learner is not in any stream application yet.",
    stream: "Stream",
    paid: "Paid",
    notPaid: "Not paid",
    enrolled: "Enrolled",
    notEnrolled: "Not enrolled",
    personalData: "Personal data",
    personalDataNote: "This view is recorded in the personal data access log.",
    personalDataError: "Personal data could not be loaded.",
    loadingPersonalData: "Loading personal data…",
  },
} as const;

/** Подписи полей персональных данных — как колонки файла «Пользователи». */
const personalDataLabels: [keyof LearnerPersonalData, string][] = [
  ["email", "Email"],
  ["phone", "Телефон"],
  ["gender", "Пол"],
  ["birth_date", "Дата рождения"],
  ["last_name_dative", "Фамилия (дательный падеж)"],
  ["first_name_dative", "Имя (дательный падеж)"],
  ["middle_name_dative", "Отчество (дательный падеж)"],
  ["snils", "СНИЛС"],
  ["passport_series", "Серия паспорта"],
  ["passport_number", "Номер паспорта"],
  ["passport_issued_by", "Кем выдан паспорт"],
  ["passport_issued_at", "Дата выдачи паспорта"],
  ["passport_division_code", "Код подразделения"],
  ["registration_region", "Регион регистрации"],
  ["registration_locality", "Населённый пункт регистрации"],
  ["registration_street", "Улица регистрации"],
  ["registration_house", "Дом регистрации"],
  ["registration_apartment", "Квартира регистрации"],
  ["registration_postcode", "Индекс регистрации"],
  ["education_level", "Образование"],
  ["diploma_qualification", "Профессия по диплому"],
  ["diploma_institution", "Учебное заведение по диплому"],
  ["diploma_last_name", "Фамилия, указанная в дипломе"],
  ["diploma_series", "Серия диплома"],
  ["diploma_number", "Номер диплома"],
  ["diploma_registration_number", "Регистрационный номер диплома"],
  ["diploma_issued_at", "Дата выдачи диплома"],
];

function PersonalDataModal({
  learnerId,
  onClose,
}: {
  learnerId: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  // Не кэшируем: каждая выдача персональных данных — отдельная запись в журнале
  const query = useQuery({
    queryKey: ["training", "learners", "personal-data", learnerId],
    queryFn: () => getLearnerPersonalData(learnerId),
    gcTime: 0,
  });

  return (
    <Modal
      closeLabel={common.close}
      labelledBy={personalDataHeadingId}
      onClose={onClose}
    >
      <div className="border-b px-5 py-4 pr-14">
        <h2 className="text-lg font-medium" id={personalDataHeadingId}>
          {text.personalData}
        </h2>
        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <ShieldAlert aria-hidden="true" className="size-4" />
          {text.personalDataNote}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {query.data ? (
          <DetailRows
            noValue={common.noValue}
            rows={personalDataLabels.map(([field, label]) => [
              label,
              query.data[field] as string | null,
            ])}
          />
        ) : query.isError ? (
          <p className="py-3 text-sm text-[var(--atmr-brand-orange)]">
            {text.personalDataError}
          </p>
        ) : (
          <p className="text-muted-foreground py-3 text-sm">
            {text.loadingPersonalData}
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Страница обучающегося: контакты (маской), участие в потоках с оплатой и
 * зачислением; полные персональные данные — администратору, с журналом.
 */
export function LearnerPage({ learnerId }: { learnerId: string }) {
  const { locale } = useLocale();
  const { user } = useAuth();
  const canReadPersonalData =
    user !== null && can(user, "training.personal_data.read");
  const text = copy[locale];
  const common = registryCopy[locale];
  const [showPersonalData, setShowPersonalData] = useState(false);
  const learnerQuery = useQuery({
    queryKey: ["training", "learners", "detail", learnerId],
    queryFn: () => getLearner(learnerId),
  });
  const learner = learnerQuery.data;

  if (!learner)
    return (
      <div className="space-y-4">
        <BackLink href="/training/learners" label={text.back} />
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {learnerQuery.isError ? (
            text.error
          ) : (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loading}
            </>
          )}
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      <BackLink href="/training/learners" label={text.back} />

      <header className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5">
        <h1 className="text-2xl font-medium">{learner.full_name}</h1>
        {canReadPersonalData ? (
          <Button
            colorScheme="neutral"
            onClick={() => setShowPersonalData(true)}
            size="m"
            type="button"
            variant="outline"
          >
            <ShieldAlert aria-hidden="true" className="size-4" />
            {text.personalData}
          </Button>
        ) : null}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section
          aria-label={text.contacts}
          className="bg-card rounded-xl border p-4"
        >
          <h2 className="text-lg font-medium">{text.contacts}</h2>
          <DetailRows
            noValue={common.noValue}
            rows={[
              [text.email, learner.email],
              [text.phone, learner.phone],
              [
                text.consent,
                learner.consent_at
                  ? formatDate(learner.consent_at, locale)
                  : null,
              ],
              [text.createdAt, formatDate(learner.created_at, locale)],
            ]}
          />
        </section>

        <section
          aria-label={text.participations}
          className="bg-card space-y-3 rounded-xl border p-4"
        >
          <h2 className="text-lg font-medium">{text.participations}</h2>
          {learner.participations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {text.noParticipations}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="py-1 font-medium">{text.stream}</th>
                  <th className="py-1 font-medium">{text.paid}</th>
                  <th className="py-1 font-medium">{text.enrolled}</th>
                </tr>
              </thead>
              <tbody>
                {learner.participations.map((participation) => (
                  <tr className="border-t" key={participation.id}>
                    <td className="py-2">
                      <Link
                        className="underline"
                        href={trainingStreamHref(participation.stream)}
                      >
                        {participation.stream_name}
                      </Link>
                    </td>
                    <td className="py-2">
                      <StatusChip
                        tone={participation.is_paid ? "positive" : "neutral"}
                      >
                        {participation.is_paid ? text.paid : text.notPaid}
                      </StatusChip>
                    </td>
                    <td className="py-2">
                      <StatusChip
                        tone={
                          participation.is_enrolled ? "positive" : "neutral"
                        }
                      >
                        {participation.is_enrolled
                          ? text.enrolled
                          : text.notEnrolled}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {showPersonalData ? (
        <PersonalDataModal
          learnerId={learner.id}
          onClose={() => setShowPersonalData(false)}
        />
      ) : null}
    </div>
  );
}
