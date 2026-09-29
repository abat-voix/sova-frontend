import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  availableChannels,
  ChannelCheckboxes,
} from "@/components/contacts/contact-channels";

afterEach(cleanup);

describe("availableChannels", () => {
  it("offers only channels with filled contact fields", () => {
    expect(
      availableChannels({ email: "a@b.ru", phone: " ", telegram: "ivanov" }),
    ).toEqual(["email", "telegram"]);
  });
});

describe("ChannelCheckboxes", () => {
  it("disables channels without data and hints what to fill", () => {
    const onChange = vi.fn();
    render(
      <ChannelCheckboxes
        available={["email"]}
        idPrefix="channel"
        label="Способы связи"
        locale="ru"
        onChange={onChange}
        value={["email", "phone"]}
      />,
    );

    const phone = screen.getByLabelText("Телефон") as HTMLInputElement;
    expect(phone.disabled).toBe(true);
    expect(phone.checked).toBe(false);
    expect(
      screen.getByText(
        "Чтобы выбрать способ связи, укажите у контакта Telegram, телефон",
      ),
    ).toBeTruthy();

    // Снятие почты не возвращает недоступный телефон
    fireEvent.click(screen.getByLabelText("Почта"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
