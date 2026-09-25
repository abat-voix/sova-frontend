import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { LocaleProvider } from "@/providers/locale-provider";

const options: LookupOption[] = [
  { id: "1", name: "Ольга Филинова" },
  { hint: "войдёт в вашу команду", id: "2", name: "Иван Петров" },
];

function renderSelect(value: LookupOption[], lockedIds: string[] = []) {
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>
        <MultiEntitySelect
          id="managers"
          label="Ответственные"
          lockedIds={lockedIds}
          onChange={onChange}
          placeholder="Выберите"
          queryKey={["test"]}
          search={async () => options}
          value={value}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
  return onChange;
}

describe("MultiEntitySelect", () => {
  it("shows an option hint", async () => {
    renderSelect([]);
    fireEvent.click(screen.getByRole("combobox", { name: "Ответственные" }));

    expect(
      await screen.findByText("войдёт в вашу команду"),
    ).toBeInTheDocument();
  });

  it("does not unselect a locked value", async () => {
    const onChange = renderSelect([options[0]], ["1"]);
    fireEvent.click(screen.getByRole("combobox", { name: "Ответственные" }));

    const locked = await screen.findByRole("option", {
      name: /Ольга Филинова/,
    });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps locked values when clearing", () => {
    const onChange = renderSelect(options, ["1"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Очистить: Ответственные" }),
    );

    expect(onChange).toHaveBeenCalledWith([options[0]]);
  });

  it("hides clearing when only locked values are selected", () => {
    renderSelect([options[0]], ["1"]);

    expect(
      screen.queryByRole("button", { name: "Очистить: Ответственные" }),
    ).toBeNull();
  });
});
