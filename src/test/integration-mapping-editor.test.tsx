import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntegrationMappingEditor } from "@/components/integrations/integration-mapping-editor";
import type { IntegrationEntityMetadata } from "@/types/integration";

const entities: IntegrationEntityMetadata[] = [
  {
    code: "student",
    label: "Студент",
    serializer: "StudentSerializer",
    fields: [
      {
        name: "email",
        label: "Email",
        help_text: "",
        type: "string",
        required: true,
        read_only: false,
        allow_null: false,
        many: false,
        choices: [],
      },
      {
        name: "created_at",
        label: "Создан",
        help_text: "",
        type: "datetime",
        required: false,
        read_only: true,
        allow_null: false,
        many: false,
        choices: [],
      },
    ],
  },
];

afterEach(cleanup);

function renderEditor(
  overrides: Partial<
    React.ComponentProps<typeof IntegrationMappingEditor>
  > = {},
) {
  const props: React.ComponentProps<typeof IntegrationMappingEditor> = {
    entities,
    isSaving: false,
    mapping: null,
    systems: [{ code: "lms", label: "LMS" }],
    onCancel: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onPreview: vi.fn().mockResolvedValue({
      result: { email: "student@example.test" },
      errors: ["test error"],
      warnings: [],
    }),
    ...overrides,
  };
  render(<IntegrationMappingEditor {...props} />);
  return props;
}

function fillHeader() {
  fireEvent.change(screen.getByLabelText("Название"), {
    target: { value: "Enrollment" },
  });
  fireEvent.change(screen.getByLabelText("Система"), {
    target: { value: "lms" },
  });
  fireEvent.change(screen.getByLabelText("event_type"), {
    target: { value: "student.enrolled" },
  });
  fireEvent.change(screen.getByLabelText("Сущность CRM"), {
    target: { value: "student" },
  });
}

describe("IntegrationMappingEditor", () => {
  it("builds CRM choices from metadata, excludes read-only fields and adds/removes rules", () => {
    renderEditor();
    fillHeader();
    fireEvent.click(screen.getByRole("button", { name: "Добавить правило" }));
    expect(
      screen.getByRole("option", { name: "Email (email)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /created_at/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Удалить правило 1" }));
    expect(
      screen.getByText("Добавьте первое правило сопоставления."),
    ).toBeInTheDocument();
  });

  it("blocks duplicate CRM fields and displays preview output", async () => {
    const props = renderEditor();
    fillHeader();
    fireEvent.click(screen.getByRole("button", { name: "Добавить правило" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить правило" }));
    const external = screen.getAllByLabelText("Поле внешней системы");
    const crm = screen.getAllByLabelText("Поле CRM");
    fireEvent.change(external[0], { target: { value: "$.student.email" } });
    fireEvent.change(external[1], { target: { value: "$.student.id" } });
    fireEvent.change(crm[0], { target: { value: "email" } });
    fireEvent.change(crm[1], { target: { value: "email" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText(/используется дважды/)).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Удалить правило 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
    await waitFor(() => expect(props.onPreview).toHaveBeenCalled());
    expect(screen.getByText("test error")).toBeInTheDocument();
    expect(screen.getByTestId("mapping-preview")).toHaveTextContent(
      "student@example.test",
    );
  });

  it("builds the sample of an existing mapping from its rule paths", () => {
    renderEditor({
      mapping: {
        id: "mapping-1",
        name: "Оплаты",
        system: "lms",
        eventType: "training.payment.received",
        direction: "incoming",
        entity: "student",
        isActive: true,
        version: 1,
        rules: [
          {
            sourcePath: "$.Фамилия",
            targetField: "email",
            required: true,
            defaultValue: null,
          },
        ],
        createdAt: "2026-09-28T10:00:00Z",
        updatedAt: "2026-09-28T10:00:00Z",
      },
    });
    expect(
      JSON.parse(
        (screen.getByLabelText("Пример payload") as HTMLTextAreaElement).value,
      ),
    ).toEqual({ Фамилия: "Фамилия" });
    expect(
      screen.getByRole("option", { name: "$.Фамилия" }),
    ).toBeInTheDocument();
  });

  it("sends the first array item to preview", async () => {
    const props = renderEditor();
    fillHeader();
    fireEvent.change(screen.getByLabelText("Пример payload"), {
      target: { value: '[null, {"mail": "a@b.c"}]' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Проверить" }));
    await waitFor(() => expect(props.onPreview).toHaveBeenCalled());
    expect(props.onPreview).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { mail: "a@b.c" } }),
    );
  });
});
