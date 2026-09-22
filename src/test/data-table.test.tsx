import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
} from "@/components/ui/data-table";

type Row = {
  city: string;
  id: string;
  name: string;
};

const rows: Row[] = [
  { city: "Тюмень", id: "1", name: "Анна" },
  { city: "Казань", id: "2", name: "Борис" },
];

const columns: DataTableColumn<Row>[] = [
  {
    name: "name",
    render: (row) => row.name,
    sortField: "full_name",
    title: "Имя",
  },
  { name: "city", render: (row) => row.city, title: "Город" },
];

const labels: DataTableLabels = {
  empty: "Ничего не найдено.",
  error: "Не удалось загрузить список.",
  loading: "Загружаем…",
  retry: "Повторить",
  sortAscending: "Сортировать по возрастанию",
  sortDescending: "Сортировать по убыванию",
  sortNone: "Отменить сортировку",
};

function renderTable(
  props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
) {
  return render(
    <DataTable
      caption="Таблица"
      columns={columns}
      getRowId={(row) => row.id}
      labels={labels}
      rows={rows}
      {...props}
    />,
  );
}

afterEach(cleanup);

describe("DataTable", () => {
  it("walks sorting from none through ascending and descending back to none", () => {
    const onSortChange = vi.fn();
    const { rerender } = renderTable({ onSortChange });

    fireEvent.click(screen.getByRole("button", { name: /Имя/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({
      direction: "asc",
      field: "full_name",
    });

    rerender(
      <DataTable
        caption="Таблица"
        columns={columns}
        getRowId={(row) => row.id}
        labels={labels}
        onSortChange={onSortChange}
        rows={rows}
        sort={{ direction: "asc", field: "full_name" }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Имя/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    fireEvent.click(screen.getByRole("button", { name: /Имя/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({
      direction: "desc",
      field: "full_name",
    });

    rerender(
      <DataTable
        caption="Таблица"
        columns={columns}
        getRowId={(row) => row.id}
        labels={labels}
        onSortChange={onSortChange}
        rows={rows}
        sort={{ direction: "desc", field: "full_name" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Имя/ }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it("leaves a column without a sort field unsortable", () => {
    renderTable({ onSortChange: vi.fn() });

    expect(screen.queryByRole("button", { name: /Город/ })).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: "Город" }),
    ).not.toHaveAttribute("aria-sort");
  });

  it("reports the row the user picks", () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    fireEvent.click(screen.getByText("Борис"));

    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("opens the row the user activates from the keyboard", () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    fireEvent.keyDown(screen.getByText("Анна").closest("tr")!, {
      key: "Enter",
    });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("offers a retry when the list failed to load", () => {
    const onRetry = vi.fn();
    renderTable({ isError: true, onRetry, rows: [] });

    expect(
      screen.getByText("Не удалось загрузить список."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hides the footer while the list is empty", () => {
    renderTable({ footer: <p>Постранично</p>, rows: [] });

    expect(screen.getByText("Ничего не найдено.")).toBeInTheDocument();
    expect(screen.queryByText("Постранично")).toBeNull();
  });
});
