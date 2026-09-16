import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the branded SOVA shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "СОВА" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Система организации взаимодействия с академической средой",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("ИТ Школа Ростелекома")).toBeInTheDocument();
    expect(
      screen.getByText("Базовая платформа готова к развитию"),
    ).toBeInTheDocument();
  });
});
