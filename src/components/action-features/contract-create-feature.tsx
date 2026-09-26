"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/http";
import {
  actionFeatureInitialQueryKey,
  boardQueryKey,
  executeActionFeature,
  getActionFeatureInitial,
} from "@/lib/api/processes/board";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureExecution,
  ContractDocument,
  CreateContractFeatureInitial,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    title: "Договор",
    hint: "Заполните данные договора — по ним будет сформирован документ из шаблона.",
    open: "Заполнить договор",
    modalTitle: "Создание договора",
    cancel: "Отмена",
    save: "Создать договор",
    saving: "Отправляем…",
    loading: "Загружаем данные взаимодействия…",
    loadError: "Не удалось загрузить данные для договора.",
    error: "Не удалось создать договор.",
    success: "Данные договора приняты. Файл будет сформирован позже.",
    created: "Создан договор",
    noNumber: "без номера",
    fileLater: "файл пока не сформирован",
    noTemplates: "Нет активных шаблонов договора. Добавьте шаблон в админке.",
    template: "Шаблон",
    general: "Основное",
    contractNumber: "Номер договора",
    contractDate: "Дата договора",
    city: "Город",
    counterparty: "Контрагент",
    name: "Полное наименование",
    shortName: "Краткое наименование",
    inn: "ИНН",
    address: "Адрес",
    email: "Email",
    phone: "Телефон",
    signatory: "Подписант со стороны контрагента",
    signatoryContact: "Из контактов взаимодействия",
    signatoryManual: "— ввести вручную —",
    fullName: "ФИО",
    position: "Должность",
    basis: "Действует на основании",
    basisPlaceholder: "Устава",
    subject: "Предмет и сумма",
    products: "Продукты",
    noProducts: "У взаимодействия нет продуктов.",
    amount: "Сумма, ₽",
    comment: "Комментарий",
  },
  en: {
    title: "Contract",
    hint: "Fill in the contract details — the document will be generated from a template.",
    open: "Fill in the contract",
    modalTitle: "New contract",
    cancel: "Cancel",
    save: "Create contract",
    saving: "Sending…",
    loading: "Loading interaction data…",
    loadError: "Could not load contract data.",
    error: "Could not create the contract.",
    success: "Contract data accepted. The file will be generated later.",
    created: "Created contract",
    noNumber: "no number",
    fileLater: "file not generated yet",
    noTemplates: "No active contract templates. Add one in the admin.",
    template: "Template",
    general: "General",
    contractNumber: "Contract number",
    contractDate: "Contract date",
    city: "City",
    counterparty: "Counterparty",
    name: "Full name",
    shortName: "Short name",
    inn: "Tax ID (INN)",
    address: "Address",
    email: "Email",
    phone: "Phone",
    signatory: "Counterparty signatory",
    signatoryContact: "From interaction contacts",
    signatoryManual: "— enter manually —",
    fullName: "Full name",
    position: "Position",
    basis: "Acting on the basis of",
    basisPlaceholder: "the Charter",
    subject: "Subject and amount",
    products: "Products",
    noProducts: "The interaction has no products.",
    amount: "Amount, ₽",
    comment: "Comment",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

type Props = {
  actionInstanceId: string;
  executionNo: number;
  csrfToken: string;
  workflowInstanceId: string;
  interaction?: InteractionShort;
  executions?: ActionFeatureExecution[];
};

export function ContractCreateFeature({
  actionInstanceId,
  csrfToken,
  workflowInstanceId,
}: Props) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState<ExecuteActionFeatureResult | null>(null);

  const savedNumber = saved
    ? String(saved.target.data.contract_number ?? "")
    : "";

  return (
    <section aria-label={text.title} className="space-y-3 border-t pt-4">
      <div>
        <h4 className="text-sm font-medium">{text.title}</h4>
        <p className="text-muted-foreground mt-1 text-xs">{text.hint}</p>
      </div>
      <Button onClick={() => setIsOpen(true)} size="m" type="button">
        {text.open}
      </Button>

      {saved ? (
        <p aria-live="polite" className="bg-secondary rounded-lg p-3 text-sm">
          {text.created}: {savedNumber || text.noNumber} · {text.fileLater}
        </p>
      ) : null}

      {isOpen ? (
        <ContractCreateDialog
          actionInstanceId={actionInstanceId}
          csrfToken={csrfToken}
          onClose={() => setIsOpen(false)}
          onCreated={(result) => {
            setSaved(result);
            setIsOpen(false);
          }}
          text={text}
          workflowInstanceId={workflowInstanceId}
        />
      ) : null}
    </section>
  );
}

function ContractCreateDialog({
  actionInstanceId,
  csrfToken,
  onClose,
  onCreated,
  text,
  workflowInstanceId,
}: {
  actionInstanceId: string;
  csrfToken: string;
  onClose: () => void;
  onCreated: (result: ExecuteActionFeatureResult) => void;
  text: Text;
  workflowInstanceId: string;
}) {
  const initialQuery = useQuery({
    queryKey: actionFeatureInitialQueryKey(actionInstanceId, "contract.create"),
    queryFn: () => getActionFeatureInitial(actionInstanceId, "contract.create"),
    // Реквизиты могли поменяться в каталоге — каждое открытие берёт свежие.
    gcTime: 0,
  });
  const titleId = `${actionInstanceId}-contract-create-title`;

  return (
    <Modal closeLabel={text.cancel} labelledBy={titleId} onClose={onClose}>
      <div className="border-b px-5 py-4 pr-14">
        <h2 className="text-lg font-medium" id={titleId}>
          {text.modalTitle}
        </h2>
      </div>
      {initialQuery.data ? (
        <ContractForm
          actionInstanceId={actionInstanceId}
          csrfToken={csrfToken}
          initial={initialQuery.data}
          onClose={onClose}
          onCreated={onCreated}
          text={text}
          workflowInstanceId={workflowInstanceId}
        />
      ) : (
        <p
          className={
            initialQuery.isError
              ? "px-5 py-6 text-sm text-[var(--atmr-brand-orange)]"
              : "text-muted-foreground px-5 py-6 text-sm"
          }
        >
          {initialQuery.isError ? text.loadError : text.loading}
        </p>
      )}
    </Modal>
  );
}

function ContractForm({
  actionInstanceId,
  csrfToken,
  initial,
  onClose,
  onCreated,
  text,
  workflowInstanceId,
}: {
  actionInstanceId: string;
  csrfToken: string;
  initial: CreateContractFeatureInitial;
  onClose: () => void;
  onCreated: (result: ExecuteActionFeatureResult) => void;
  text: Text;
  workflowInstanceId: string;
}) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState(initial.templates[0]?.id ?? "");
  const [draft, setDraft] = useState<ContractDocument>(initial.document);
  const [signatoryId, setSignatoryId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const availableProducts = initial.document.products;

  const mutation = useMutation({
    mutationFn: () =>
      executeActionFeature(
        actionInstanceId,
        "contract.create",
        { template: templateId, document: draft },
        csrfToken,
      ),
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(
          error.detail ??
            (Object.keys(error.fieldErrors).length > 0 ? null : text.error),
        );
      } else {
        setFormError(text.error);
      }
    },
    onSuccess: (result) => {
      toast.success(text.success);
      void queryClient.invalidateQueries({
        queryKey: boardQueryKey(workflowInstanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["processes", "action-instances"],
      });
      onCreated(result);
    },
  });

  function update<Key extends keyof ContractDocument>(
    key: Key,
    value: ContractDocument[Key],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function updateNested<
    Group extends "counterparty" | "signatory",
    Key extends keyof ContractDocument[Group],
  >(group: Group, key: Key, value: ContractDocument[Group][Key]) {
    setDraft((previous) => ({
      ...previous,
      [group]: { ...previous[group], [key]: value },
    }));
  }

  function selectSignatory(contactId: string) {
    setSignatoryId(contactId);
    const contact = initial.contacts.find((item) => item.id === contactId);
    if (!contact) return;
    setDraft((previous) => ({
      ...previous,
      signatory: {
        ...previous.signatory,
        full_name: contact.full_name,
        position: contact.position,
      },
    }));
  }

  function toggleProduct(name: string, checked: boolean) {
    setDraft((previous) => ({
      ...previous,
      // Порядок — как у продуктов взаимодействия, а не как их отмечали.
      products: availableProducts.filter((item) =>
        item === name ? checked : previous.products.includes(item),
      ),
    }));
  }

  const fieldId = (name: string) =>
    `${actionInstanceId}-contract-${name.replaceAll(".", "-")}`;

  function field(
    name: string,
    label: string,
    input: {
      value: string;
      onChange: (value: string) => void;
      required?: boolean;
      type?: string;
      maxLength?: number;
      placeholder?: string;
      inputMode?: "decimal" | "numeric";
    },
  ) {
    const errors = fieldErrors[`draft.${name}`] ?? [];
    return (
      <div>
        <label
          className="text-muted-foreground text-xs"
          htmlFor={fieldId(name)}
        >
          {label}
          {input.required ? " *" : ""}
        </label>
        <Input
          aria-invalid={errors.length > 0 || undefined}
          className="mt-1"
          id={fieldId(name)}
          inputMode={input.inputMode}
          maxLength={input.maxLength}
          onChange={(event) => input.onChange(event.target.value)}
          placeholder={input.placeholder}
          required={input.required}
          type={input.type ?? "text"}
          value={input.value}
        />
        <FieldErrors messages={errors} />
      </div>
    );
  }

  const canSubmit =
    templateId !== "" &&
    draft.counterparty.name.trim().length > 0 &&
    !mutation.isPending;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldErrors({});
        setFormError(null);
        mutation.mutate();
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {initial.templates.length === 0 ? (
          <p className="text-sm text-[var(--atmr-brand-orange)]">
            {text.noTemplates}
          </p>
        ) : (
          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor={fieldId("template")}
            >
              {text.template} *
            </label>
            <Select
              className="mt-1"
              id={fieldId("template")}
              onChange={(event) => setTemplateId(event.target.value)}
              required
              value={templateId}
            >
              {initial.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
            <FieldErrors messages={fieldErrors.template ?? []} />
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">{text.general}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {field("contract_number", text.contractNumber, {
              maxLength: 255,
              onChange: (value) => update("contract_number", value),
              value: draft.contract_number,
            })}
            {field("contract_date", text.contractDate, {
              onChange: (value) => update("contract_date", value || null),
              type: "date",
              value: draft.contract_date ?? "",
            })}
            {field("city", text.city, {
              maxLength: 255,
              onChange: (value) => update("city", value),
              value: draft.city,
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t pt-4">
          <legend className="mb-2 text-sm font-medium">
            {text.counterparty}
          </legend>
          {field("counterparty.name", text.name, {
            maxLength: 500,
            onChange: (value) => updateNested("counterparty", "name", value),
            required: true,
            value: draft.counterparty.name,
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("counterparty.short_name", text.shortName, {
              maxLength: 255,
              onChange: (value) =>
                updateNested("counterparty", "short_name", value),
              value: draft.counterparty.short_name,
            })}
            {field("counterparty.inn", text.inn, {
              inputMode: "numeric",
              maxLength: 12,
              onChange: (value) => updateNested("counterparty", "inn", value),
              value: draft.counterparty.inn,
            })}
          </div>
          {field("counterparty.address", text.address, {
            maxLength: 1000,
            onChange: (value) => updateNested("counterparty", "address", value),
            value: draft.counterparty.address,
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("counterparty.email", text.email, {
              maxLength: 254,
              onChange: (value) => updateNested("counterparty", "email", value),
              type: "email",
              value: draft.counterparty.email,
            })}
            {field("counterparty.phone", text.phone, {
              maxLength: 50,
              onChange: (value) => updateNested("counterparty", "phone", value),
              type: "tel",
              value: draft.counterparty.phone,
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t pt-4">
          <legend className="mb-2 text-sm font-medium">{text.signatory}</legend>
          {initial.contacts.length > 0 ? (
            <div>
              <label
                className="text-muted-foreground text-xs"
                htmlFor={fieldId("signatory-contact")}
              >
                {text.signatoryContact}
              </label>
              <Select
                className="mt-1"
                id={fieldId("signatory-contact")}
                onChange={(event) => selectSignatory(event.target.value)}
                value={signatoryId}
              >
                <option value="">{text.signatoryManual}</option>
                {initial.contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.position
                      ? `${contact.full_name} · ${contact.position}`
                      : contact.full_name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("signatory.full_name", text.fullName, {
              maxLength: 255,
              onChange: (value) =>
                updateNested("signatory", "full_name", value),
              value: draft.signatory.full_name,
            })}
            {field("signatory.position", text.position, {
              maxLength: 255,
              onChange: (value) => updateNested("signatory", "position", value),
              value: draft.signatory.position,
            })}
          </div>
          {field("signatory.basis", text.basis, {
            maxLength: 255,
            onChange: (value) => updateNested("signatory", "basis", value),
            placeholder: text.basisPlaceholder,
            value: draft.signatory.basis,
          })}
        </fieldset>

        <fieldset className="space-y-3 border-t pt-4">
          <legend className="mb-2 text-sm font-medium">{text.subject}</legend>
          <div>
            <p className="text-muted-foreground text-xs">{text.products}</p>
            {availableProducts.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {text.noProducts}
              </p>
            ) : (
              <div className="mt-1 space-y-1">
                {availableProducts.map((name) => (
                  <label className="flex items-center gap-2 text-sm" key={name}>
                    <input
                      checked={draft.products.includes(name)}
                      onChange={(event) =>
                        toggleProduct(name, event.target.checked)
                      }
                      type="checkbox"
                    />
                    {name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {field("amount", text.amount, {
            inputMode: "decimal",
            onChange: (value) =>
              update("amount", value.trim() ? value.replace(",", ".") : null),
            value: draft.amount ?? "",
          })}
          <div>
            <label
              className="text-muted-foreground text-xs"
              htmlFor={fieldId("comment")}
            >
              {text.comment}
            </label>
            <textarea
              className="border-border bg-background/60 mt-1 min-h-20 w-full rounded-md border px-3 py-2 text-sm"
              id={fieldId("comment")}
              onChange={(event) => update("comment", event.target.value)}
              value={draft.comment}
            />
          </div>
        </fieldset>

        {formError ? (
          <p className="text-sm text-[var(--atmr-brand-orange)]">{formError}</p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <Button
          colorScheme="neutral"
          onClick={onClose}
          size="m"
          type="button"
          variant="outline"
        >
          {text.cancel}
        </Button>
        <Button disabled={!canSubmit} size="m" type="submit">
          {mutation.isPending ? text.saving : text.save}
        </Button>
      </div>
    </form>
  );
}

function FieldErrors({ messages }: { messages: string[] }) {
  return messages.map((message) => (
    <p className="mt-1 text-xs text-[var(--atmr-brand-orange)]" key={message}>
      {message}
    </p>
  ));
}
