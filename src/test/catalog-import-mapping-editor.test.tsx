import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CatalogImportMappingEditor } from "@/components/catalog-import/catalog-import-mapping-editor";
import type { CatalogImportMappingField } from "@/types/catalog-import";

const fields: CatalogImportMappingField[] = [
  {
    target_field: "name",
    label: "Название",
    required: true,
    source_column: "Вендор",
  },
  {
    target_field: "external_code",
    label: "Внешний код",
    required: false,
    source_column: null,
  },
];

function renderEditor(
  overrides: Partial<Parameters<typeof CatalogImportMappingEditor>[0]> = {},
) {
  const props = {
    fields,
    headers: [] as string[],
    isSaving: false,
    serverErrors: {},
    onDirtyChange: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
  render(<CatalogImportMappingEditor {...props} />);
  return props;
}

describe("CatalogImportMappingEditor", () => {
  it("saves the whole mapping; an empty optional field means unmapped", () => {
    const props = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Сохранить маппинг" }));

    expect(props.onSave).toHaveBeenCalledWith({
      name: "Вендор",
      external_code: "",
    });
  });

  it("blocks saving when a required field is empty", () => {
    const props = renderEditor();

    fireEvent.change(screen.getByLabelText(/Название/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить маппинг" }));

    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Укажите колонку файла.")).toBeInTheDocument();
  });

  it("blocks one column mapped to two fields, ignoring case and spaces", () => {
    const props = renderEditor();

    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: " вендор " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить маппинг" }));

    expect(props.onSave).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("Колонка уже выбрана для другого поля."),
    ).toHaveLength(2);
  });

  it("offers file headers as suggestions and warns about columns missing in the file", () => {
    renderEditor({ headers: ["ВЕНДОР", "Код"] });

    expect(
      screen.getAllByRole("option", { name: "Код", hidden: true }),
    ).not.toHaveLength(0);
    // «Вендор» есть в файле как «ВЕНДОР» — сравнение без регистра, предупреждения нет
    expect(screen.queryByText("Колонки нет в файле.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Артикул" },
    });
    expect(screen.getByText("Колонки нет в файле.")).toBeInTheDocument();
  });

  it("does not suggest a header already chosen for another field", () => {
    renderEditor({ headers: ["ВЕНДОР", "Код"] });

    const options = (id: string) =>
      Array.from(
        document.getElementById(`${id}-options`)?.querySelectorAll("option") ??
          [],
      ).map((option) => option.value);
    const listOf = (label: RegExp) => options(screen.getByLabelText(label).id);

    // «Вендор» занят полем «Название» — сравнение без регистра
    expect(listOf(/Внешний код/)).toEqual(["Код"]);
    expect(listOf(/Название/)).toEqual(["ВЕНДОР", "Код"]);

    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Код" },
    });
    expect(listOf(/Название/)).toEqual(["ВЕНДОР"]);
    expect(listOf(/Внешний код/)).toEqual(["Код"]);
  });

  it("reports dirty state and shows server errors next to the field", () => {
    const props = renderEditor({
      serverErrors: { "mappings.name": ["Колонка не найдена."] },
    });

    expect(screen.getByText("Колонка не найдена.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Код" },
    });
    expect(props.onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});
