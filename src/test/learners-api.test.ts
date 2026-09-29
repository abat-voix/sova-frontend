import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/http";
import { addNewApplicationLearner } from "@/lib/api/training/applications";
import {
  createLearner,
  existingLearnerId,
  updateLearnerPersonalData,
} from "@/lib/api/training/learners";

const learner = {
  email: "",
  first_name: "Иван",
  is_active: true,
  last_name: "Иванов",
  middle_name: "",
  phone: "+7 999 123-45-67",
};

function stubFetch() {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ id: "l1" }), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    return { body: JSON.parse(String(init.body)), method: init.method, url };
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("learners api", () => {
  it("posts a new learner", async () => {
    const call = stubFetch();

    await createLearner(learner, "csrf");

    expect(call()).toEqual({
      body: learner,
      method: "POST",
      url: "/api/training/learners/",
    });
  });

  it("patches personal data", async () => {
    const call = stubFetch();

    await updateLearnerPersonalData("l1", { snils: "123" }, "csrf");

    expect(call()).toEqual({
      body: { snils: "123" },
      method: "PATCH",
      url: "/api/training/learners/l1/personal-data/",
    });
  });

  it("adds a new learner to an application", async () => {
    const call = stubFetch();

    await addNewApplicationLearner("a1", learner, false, "csrf");

    expect(call()).toEqual({
      body: { application: "a1", is_paid: false, new_learner: learner },
      method: "POST",
      url: "/api/training/application-learners/",
    });
  });

  it("reads the found learner id from learner_exists", () => {
    const error = new ApiError(
      409,
      "learner_exists",
      "уже есть",
      "уже есть",
      {},
      { code: "learner_exists", detail: "уже есть", learner: "l7" },
    );

    expect(existingLearnerId(error)).toBe("l7");
    expect(existingLearnerId(new Error("x"))).toBeNull();
  });
});
