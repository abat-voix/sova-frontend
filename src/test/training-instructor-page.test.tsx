import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: ["catalog.read", "catalog.update"],
      role: "kam",
    },
  }),
}));

import { TrainingInstructorPage } from "@/components/training/training-instructor-page";
import { LocaleProvider } from "@/providers/locale-provider";

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("training instructor page", () => {
  it("shows the profile by groups, qualifications and the edit link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = String(input);
        if (url === "/api/training/instructors/t1/")
          return json({
            id: "t1",
            full_name: "Петров Пётр",
            position: "Доцент кафедры",
            university: { id: "u1", name: "МГУ" },
            b2c_client: null,
            department: "",
            email: "",
            phone: "",
            telegram: "",
            academic_degree: "candidate",
            academic_title: "docent",
            teaching_experience_years: 7,
            education: "",
            directions: [{ id: "d1", name: "DevOps" }],
            programs: [{ id: "p1", name: "DevOps-инженер" }],
            lms_external_id: "",
            comment: "",
            is_active: true,
          });
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "q1",
              kind: "initial",
              completed_at: "2026-01-15",
              document_type: "certificate",
              document_number: "42",
              valid_until: null,
            },
          ],
        });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <TrainingInstructorPage instructorId="t1" />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Петров Пётр" }),
    ).toBeInTheDocument();
    const competences = screen.getByRole("region", { name: "Компетенции" });
    expect(within(competences).getByText("DevOps-инженер")).toBeInTheDocument();
    expect(screen.getByText("Кандидат наук")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Изменить" })).toHaveAttribute(
      "href",
      "/training/instructors/t1/edit",
    );
    expect(
      await screen.findByText("Обучение преподавателей"),
    ).toBeInTheDocument();
  });
});
