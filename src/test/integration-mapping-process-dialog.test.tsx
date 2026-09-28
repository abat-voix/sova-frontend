import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntegrationMappingProcessDialog } from "@/components/integrations/integration-mapping-process-dialog";
import type { IntegrationMapping } from "@/types/integration";

const mapping: IntegrationMapping = {
  id: "mapping-1",
  name: "LMS B2C",
  system: "lms",
  eventType: "student.enrolled",
  direction: "incoming",
  entity: "b2c_client",
  isActive: true,
  version: 1,
  rules: [],
  createdAt: "2026-09-27T10:00:00Z",
  updatedAt: "2026-09-27T10:00:00Z",
};

function renderDialog(onProcess = vi.fn()) {
  render(
    <IntegrationMappingProcessDialog
      entityLabel="B2C-клиент"
      mapping={mapping}
      onClose={vi.fn()}
      onProcess={onProcess}
    />,
  );
  return onProcess;
}

describe("IntegrationMappingProcessDialog", () => {
  afterEach(cleanup);

  it("sends parsed payload and shows created entity", async () => {
    const onProcess = renderDialog(
      vi.fn().mockResolvedValue({
        id: "message-1",
        status: "processed",
        created: [{ entity: "b2c_client", id: "client-1" }],
        errors: [],
        warnings: ["Путь не найден: $.phone"],
      }),
    );
    fireEvent.change(screen.getByLabelText("Payload"), {
      target: { value: '{"name": "Иван"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Обработать" }));

    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(onProcess).toHaveBeenCalledWith({ name: "Иван" });
    expect(screen.getByText("client-1")).toBeTruthy();
    expect(screen.getByText("Путь не найден: $.phone")).toBeTruthy();
  });

  it("shows processing errors", async () => {
    renderDialog(
      vi.fn().mockResolvedValue({
        id: "message-2",
        status: "failed",
        created: [],
        errors: ["Отсутствует обязательное значение: $.name"],
        warnings: [],
      }),
    );
    fireEvent.change(screen.getByLabelText("Payload"), {
      target: { value: "{}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Обработать" }));

    expect(
      await screen.findByText("Отсутствует обязательное значение: $.name"),
    ).toBeTruthy();
    expect(screen.getByText("Обработка завершилась с ошибками")).toBeTruthy();
  });

  it("sends arrays as is", async () => {
    const onProcess = renderDialog(
      vi.fn().mockResolvedValue({
        id: "message-3",
        status: "failed",
        created: [{ entity: "training_payment", id: "participant-1" }],
        errors: ["Элемент 3: Обучающийся не найден."],
        warnings: ["Элемент 1: пустой элемент пропущен"],
      }),
    );
    fireEvent.change(screen.getByLabelText("Payload"), {
      target: { value: '[null, {"a": 1}, {"a": 2}]' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Обработать" }));

    expect(
      await screen.findByText("Обработка завершилась с ошибками (успешно: 1)"),
    ).toBeTruthy();
    expect(onProcess).toHaveBeenCalledWith([null, { a: 1 }, { a: 2 }]);
    expect(screen.getByText("participant-1")).toBeTruthy();
  });

  it("rejects scalar JSON without calling the server", async () => {
    const onProcess = renderDialog();
    fireEvent.change(screen.getByLabelText("Payload"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Обработать" }));

    expect(
      await screen.findByText(
        "Payload должен быть JSON-объектом или массивом.",
      ),
    ).toBeTruthy();
    expect(onProcess).not.toHaveBeenCalled();
  });

  it("loads payload from a file", async () => {
    renderDialog();
    const file = new File(['{"name": "Мария"}'], "payload.json", {
      type: "application/json",
    });
    fireEvent.change(screen.getByLabelText("JSON-файл"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Payload") as HTMLTextAreaElement).value,
      ).toBe('{"name": "Мария"}'),
    );
    expect(screen.getByText("payload.json")).toBeTruthy();
  });
});
