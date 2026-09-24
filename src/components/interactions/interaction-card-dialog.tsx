"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Download,
  FileText,
  Mail,
  Paperclip,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { interactionTitle } from "@/components/interactions/interaction-list";
import {
  DetailRows,
  formatFileSize,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusChip } from "@/components/ui/status-chip";
import {
  getInteractionAttachments,
  interactionAttachmentsQueryKey,
} from "@/lib/api/processes/board";
import {
  getInteractionContacts,
  interactionContactsQueryKey,
} from "@/lib/api/interactions/contacts";
import {
  getInteractionContracts,
  interactionContractsQueryKey,
} from "@/lib/api/interactions/contracts";
import {
  getInteractionDirections,
  getInteractionPrograms,
  getInteractionProducts,
  interactionDirectionsQueryKey,
  interactionProductsQueryKey,
  interactionProgramsQueryKey,
} from "@/lib/api/interactions/interactions";
import {
  getInteractionLicenses,
  interactionLicensesQueryKey,
} from "@/lib/api/interactions/licenses";
import { formatDate } from "@/lib/format-date";
import { useLocale } from "@/providers/locale-provider";
import type { ActionAttachment } from "@/types/action-attachment";
import type { Contract } from "@/types/contract";
import type { InteractionContact } from "@/types/interaction-contact";
import type { License } from "@/types/license";
import type {
  Interaction,
  InteractionDirection,
  InteractionProduct,
  InteractionProgram,
} from "@/types/workflow-board";

const copy = {
  ru: {
    active: "Активно",
    attachments: "Вложения действий",
    attachmentsEmpty: "Вложений пока нет.",
    close: "Закрыть",
    comment: "Комментарий",
    composition: "Направления, программы и продукты",
    compositionEmpty: "Ничего пока не добавлено.",
    contacts: "Контактные лица",
    contactsEmpty: "Контакты пока не привязаны.",
    contracts: "Договоры",
    contractsEmpty: "Договоров пока нет.",
    corrected: "Скорректирован",
    createdAt: "Создано",
    documents: "Документы",
    download: "Скачать",
    draft: "Черновик",
    edit: "Редактировать",
    error: "Не удалось загрузить.",
    files: "файлов",
    inactive: "Неактивно",
    kindB2C: "B2C-клиент",
    kindUniversity: "Вуз",
    licenses: "Лицензии",
    licensesEmpty: "Лицензий пока нет.",
    loading: "Загружаем…",
    noValue: "Не указано",
    overview: "Общее",
    responsible: "Ответственный",
    retry: "Повторить",
    sent: "Отправлен",
    signed: "Подписан",
    signedShort: "Подписана",
    superseded: "Заменена",
    unassigned: "не назначен",
    unassignedProducts: "Продукты без программы",
    unnamed: "Без названия",
    unsigned: "Не подписана",
    updatedAt: "Изменено",
    uploadedBy: "Загрузил",
    validUntil: "Действует до",
  },
  en: {
    active: "Active",
    attachments: "Action attachments",
    attachmentsEmpty: "No attachments yet.",
    close: "Close",
    comment: "Comment",
    composition: "Directions, programs, and products",
    compositionEmpty: "Nothing has been added yet.",
    contacts: "Contact people",
    contactsEmpty: "No contacts are linked yet.",
    contracts: "Contracts",
    contractsEmpty: "No contracts yet.",
    corrected: "Corrected",
    createdAt: "Created",
    documents: "Documents",
    download: "Download",
    draft: "Draft",
    edit: "Edit",
    error: "Could not load.",
    files: "files",
    inactive: "Inactive",
    kindB2C: "B2C client",
    kindUniversity: "University",
    licenses: "Licenses",
    licensesEmpty: "No licenses yet.",
    loading: "Loading…",
    noValue: "Not provided",
    overview: "Overview",
    responsible: "Responsible",
    retry: "Retry",
    sent: "Sent",
    signed: "Signed",
    signedShort: "Signed",
    superseded: "Superseded",
    unassigned: "unassigned",
    unassignedProducts: "Products without a program",
    unnamed: "Untitled",
    unsigned: "Unsigned",
    updatedAt: "Updated",
    uploadedBy: "Uploaded by",
    validUntil: "Valid until",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

/** Тот же локальный паттерн состояний, что и в `InteractionList`/`InteractionsWorkspace`. */
function SectionState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-3 text-xs">
      <p>{label}</p>
      {onRetry && retryLabel ? (
        <Button
          colorScheme="neutral"
          onClick={onRetry}
          size="s"
          type="button"
          variant="ghost"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-t pt-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ContractStageChip({
  contract,
  text,
}: {
  contract: Contract;
  text: Text;
}) {
  if (contract.signed_at)
    return <StatusChip tone="positive">{text.signed}</StatusChip>;
  if (contract.corrected_at)
    return <StatusChip tone="accent">{text.corrected}</StatusChip>;
  if (contract.sent_at)
    return <StatusChip tone="accent">{text.sent}</StatusChip>;

  return <StatusChip>{text.draft}</StatusChip>;
}

function ContractsSection({ interactionId }: { interactionId: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionContractsQueryKey(interactionId),
    queryFn: () => getInteractionContracts(interactionId),
  });
  const contracts = query.data?.results ?? [];

  return (
    <div>
      <h4 className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
        {text.contracts}
      </h4>
      {query.isPending ? (
        <SectionState label={text.loading} />
      ) : query.isError ? (
        <SectionState
          label={text.error}
          onRetry={() => void query.refetch()}
          retryLabel={text.retry}
        />
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {text.contractsEmpty}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {contracts.map((contract) => (
            <li
              className="bg-secondary/40 flex items-center gap-3 rounded-lg border p-3"
              key={contract.id}
            >
              <FileText
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {contract.contract_number}
                </span>
                <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <ContractStageChip contract={contract} text={text} />
                  {contract.files_count > 0 ? (
                    <span className="flex items-center gap-1">
                      <Paperclip aria-hidden="true" className="size-3" />
                      {contract.files_count} {text.files}
                    </span>
                  ) : null}
                </span>
              </span>
              {contract.download_url ? (
                <Button
                  asChild
                  colorScheme="neutral"
                  size="icon"
                  variant="ghost"
                >
                  <a
                    aria-label={`${text.download}: ${contract.contract_number}`}
                    download
                    href={contract.download_url}
                    title={text.download}
                  >
                    <Download aria-hidden="true" className="size-4" />
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LicenseStateChip({ license, text }: { license: License; text: Text }) {
  if (!license.is_active) return <StatusChip>{text.superseded}</StatusChip>;

  return (
    <StatusChip tone={license.is_signed ? "positive" : "neutral"}>
      {license.is_signed ? text.signedShort : text.unsigned}
    </StatusChip>
  );
}

function LicensesSection({ interactionId }: { interactionId: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionLicensesQueryKey(interactionId),
    queryFn: () => getInteractionLicenses(interactionId),
  });
  const licenses = query.data?.results ?? [];

  return (
    <div className="mt-4">
      <h4 className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
        {text.licenses}
      </h4>
      {query.isPending ? (
        <SectionState label={text.loading} />
      ) : query.isError ? (
        <SectionState
          label={text.error}
          onRetry={() => void query.refetch()}
          retryLabel={text.retry}
        />
      ) : licenses.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {text.licensesEmpty}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {licenses.map((license) => (
            <li
              className="bg-secondary/40 rounded-lg border p-3"
              key={license.id}
            >
              <span className="block truncate text-sm font-medium">
                {license.interaction_product.product.name}
              </span>
              <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <LicenseStateChip license={license} text={text} />
                {license.valid_until_year ? (
                  <span>
                    {text.validUntil} {license.valid_until_year}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentsSection({ interactionId }: { interactionId: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionAttachmentsQueryKey(interactionId),
    queryFn: () => getInteractionAttachments(interactionId),
  });
  const attachments = query.data?.results ?? [];

  return (
    <div className="mt-4">
      <h4 className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
        {text.attachments}
      </h4>
      {query.isPending ? (
        <SectionState label={text.loading} />
      ) : query.isError ? (
        <SectionState
          label={text.error}
          onRetry={() => void query.refetch()}
          retryLabel={text.retry}
        />
      ) : attachments.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {text.attachmentsEmpty}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {attachments.map((attachment: ActionAttachment) => (
            <li
              className="bg-secondary/40 flex items-center gap-3 rounded-lg border p-3"
              key={attachment.id}
            >
              <Paperclip
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {attachment.original_name}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {formatFileSize(attachment.size, locale) ?? ""}
                  {attachment.uploaded_by
                    ? ` · ${text.uploadedBy}: ${attachment.uploaded_by.full_name}`
                    : ""}
                </span>
              </span>
              <Button asChild colorScheme="neutral" size="icon" variant="ghost">
                <a
                  aria-label={`${text.download}: ${attachment.original_name}`}
                  download
                  href={attachment.download_url}
                  title={text.download}
                >
                  <Download aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContactsSection({ interactionId }: { interactionId: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionContactsQueryKey(interactionId),
    queryFn: () => getInteractionContacts(interactionId),
  });
  const contacts = query.data ?? [];

  return (
    <Section title={text.contacts}>
      {query.isPending ? (
        <SectionState label={text.loading} />
      ) : query.isError ? (
        <SectionState
          label={text.error}
          onRetry={() => void query.refetch()}
          retryLabel={text.retry}
        />
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground text-xs">{text.contactsEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((link: InteractionContact) => {
            const contact = link.contact_person;
            return (
              <li
                className="bg-secondary/40 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm"
                key={link.id}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <User
                    aria-hidden="true"
                    className="text-muted-foreground size-3.5"
                  />
                  {contact.full_name}
                </span>
                {contact.position ? (
                  <span className="text-muted-foreground text-xs">
                    {contact.position}
                  </span>
                ) : null}
                {contact.email ? (
                  <a
                    className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                    href={`mailto:${contact.email}`}
                  >
                    <Mail aria-hidden="true" className="size-3" />
                    {contact.email}
                  </a>
                ) : null}
                {contact.phone ? (
                  <a
                    className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                    href={`tel:${contact.phone}`}
                  >
                    <Phone aria-hidden="true" className="size-3" />
                    {contact.phone}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

type ProgramNode = {
  program: InteractionProgram;
  products: InteractionProduct[];
};

type DirectionNode = {
  direction: InteractionDirection;
  programs: ProgramNode[];
};

function buildCompositionTree(
  directions: InteractionDirection[],
  programs: InteractionProgram[],
  products: InteractionProduct[],
) {
  const programsByDirection = new Map<string, InteractionProgram[]>();
  for (const program of programs) {
    const list = programsByDirection.get(program.direction.id) ?? [];
    list.push(program);
    programsByDirection.set(program.direction.id, list);
  }

  const productsByProgram = new Map<string, InteractionProduct[]>();
  const unassignedProducts: InteractionProduct[] = [];
  for (const product of products) {
    if (product.interaction_program) {
      const list = productsByProgram.get(product.interaction_program) ?? [];
      list.push(product);
      productsByProgram.set(product.interaction_program, list);
    } else {
      unassignedProducts.push(product);
    }
  }

  const directionNodes: DirectionNode[] = directions.map((direction) => ({
    direction,
    programs: (programsByDirection.get(direction.direction.id) ?? []).map(
      (program) => ({
        program,
        products: productsByProgram.get(program.id) ?? [],
      }),
    ),
  }));

  return { directionNodes, unassignedProducts };
}

function InactiveBadge({ text }: { text: Text }) {
  return <Badge variant="neutral">{text.inactive}</Badge>;
}

function CompositionSection({ interaction }: { interaction: Interaction }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const interactionId = interaction.id;

  const directionsQuery = useQuery({
    queryKey: interactionDirectionsQueryKey(interactionId),
    queryFn: () => getInteractionDirections(interactionId),
  });
  const programsQuery = useQuery({
    queryKey: interactionProgramsQueryKey(interactionId),
    queryFn: () => getInteractionPrograms(interactionId),
  });
  const productsQuery = useQuery({
    queryKey: interactionProductsQueryKey(interactionId),
    queryFn: () => getInteractionProducts(interactionId),
  });

  const isPending =
    directionsQuery.isPending ||
    programsQuery.isPending ||
    productsQuery.isPending;
  const isError =
    directionsQuery.isError || programsQuery.isError || productsQuery.isError;

  const { directionNodes, unassignedProducts } = buildCompositionTree(
    directionsQuery.data?.results ?? [],
    programsQuery.data?.results ?? [],
    productsQuery.data?.results ?? [],
  );
  const isEmpty =
    directionNodes.length === 0 && unassignedProducts.length === 0;

  function retryAll() {
    void directionsQuery.refetch();
    void programsQuery.refetch();
    void productsQuery.refetch();
  }

  return (
    <Section
      title={`${text.composition} (${interaction.directions_count} · ${interaction.programs_count} · ${interaction.products_count})`}
    >
      {isPending ? (
        <SectionState label={text.loading} />
      ) : isError ? (
        <SectionState
          label={text.error}
          onRetry={retryAll}
          retryLabel={text.retry}
        />
      ) : isEmpty ? (
        <p className="text-muted-foreground text-xs">{text.compositionEmpty}</p>
      ) : (
        <div className="space-y-3">
          {directionNodes.map(({ direction, programs }) => (
            <div
              className="bg-secondary/40 rounded-xl border p-3"
              key={direction.id}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {direction.direction.name}
                </span>
                {!direction.is_active ? <InactiveBadge text={text} /> : null}
              </div>

              {programs.length > 0 ? (
                <ul className="mt-2 space-y-2 pl-4">
                  {programs.map(({ program, products }) => (
                    <li key={program.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{program.program.name}</span>
                        {!program.is_active ? (
                          <InactiveBadge text={text} />
                        ) : null}
                      </div>

                      {products.length > 0 ? (
                        <ul className="mt-1 space-y-1 pl-4">
                          {products.map((product) => (
                            <li
                              className="text-muted-foreground flex items-center gap-2 text-sm"
                              key={product.id}
                            >
                              <span>{product.product.name}</span>
                              {!product.is_active ? (
                                <InactiveBadge text={text} />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {unassignedProducts.length > 0 ? (
            <div>
              <p className="text-muted-foreground text-xs">
                {text.unassignedProducts}
              </p>
              <ul className="mt-1 space-y-1 pl-4">
                {unassignedProducts.map((product) => (
                  <li
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                    key={product.id}
                  >
                    <span>{product.product.name}</span>
                    {!product.is_active ? <InactiveBadge text={text} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  );
}

export function InteractionCardDialog({
  interaction,
  onClose,
  onEdit,
}: {
  interaction: Interaction;
  onClose: () => void;
  onEdit: (interaction: Interaction) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const isB2C = Boolean(interaction.b2c_client);

  return (
    <Modal
      closeLabel={text.close}
      labelledBy="interaction-card-title"
      onClose={onClose}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-5 py-4 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            {isB2C ? (
              <User
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
            ) : (
              <Building2
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
            )}
            <h2 className="text-lg font-medium" id="interaction-card-title">
              {interactionTitle(interaction, text.unnamed)}
            </h2>
            <StatusChip tone={interaction.is_active ? "positive" : "neutral"}>
              {interaction.is_active ? text.active : text.inactive}
            </StatusChip>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {isB2C ? text.kindB2C : text.kindUniversity}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section title={text.overview}>
            <DetailRows
              noValue={common.noValue}
              rows={[
                [
                  text.responsible,
                  interaction.current_responsible?.manager.full_name ??
                    text.unassigned,
                ],
                [text.comment, interaction.comment || null],
                [text.createdAt, formatDate(interaction.created_at, locale)],
                [text.updatedAt, formatDate(interaction.updated_at, locale)],
              ]}
            />
          </Section>

          <CompositionSection interaction={interaction} />

          <ContactsSection interactionId={interaction.id} />

          <Section title={text.documents}>
            <ContractsSection interactionId={interaction.id} />
            <LicensesSection interactionId={interaction.id} />
            <AttachmentsSection interactionId={interaction.id} />
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button
            colorScheme="neutral"
            onClick={onClose}
            size="m"
            type="button"
            variant="outline"
          >
            {text.close}
          </Button>
          <Button onClick={() => onEdit(interaction)} size="m" type="button">
            {text.edit}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
