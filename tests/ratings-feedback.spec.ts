import { expect, test } from "@playwright/test";
import {
  buildVersionFeedback,
  encodeVerdict,
  normalizeVerdict,
  parseSubmittedVerdict,
  transitionVersionFeedback,
  type FeedbackAggregate,
} from "../src/lib/ratings-feedback";

function feedback(voteCount: number, failCount: number) {
  return buildVersionFeedback({
    totalStars: voteCount * 4,
    voteCount,
    failCount,
  });
}

test.describe("community failure verdict logic", () => {
  test("uses the literal half-or-more threshold without a quorum", () => {
    expect(buildVersionFeedback({})).toBeNull();
    expect(feedback(0, 1)?.failed).toBe(true);
    expect(feedback(1, 1)?.failed).toBe(true);
    expect(feedback(2, 1)?.failed).toBe(false);
    expect(feedback(2, 2)?.failed).toBe(true);
  });

  test("keeps star averages separate from failure verdicts", () => {
    const result = buildVersionFeedback({
      totalStars: 9,
      voteCount: 2,
      failCount: 3,
      "failCategory:wont-load": 2,
      "failCategory:other": 1,
    });

    expect(result).toMatchObject({
      average: 4.5,
      starCount: 2,
      failCount: 3,
      totalVerdicts: 5,
      failRatio: 0.6,
      failed: true,
      failureCategories: { "wont-load": 2, other: 1 },
    });
  });

  test("normalizes legacy votes and encodes new verdicts", () => {
    expect(normalizeVerdict(4)).toEqual({ type: "rating", stars: 4 });
    expect(normalizeVerdict("5")).toEqual({ type: "rating", stars: 5 });
    expect(normalizeVerdict("fail:crash-freeze")).toEqual({
      type: "fail",
      category: "crash-freeze",
    });
    expect(normalizeVerdict("fail:unknown")).toBeNull();
    expect(encodeVerdict({ type: "fail", category: "wont-start" })).toBe(
      "fail:wont-start",
    );
  });

  test("validates new and legacy submission payloads", () => {
    expect(parseSubmittedVerdict({ stars: 3 })).toEqual({
      type: "rating",
      stars: 3,
    });
    expect(
      parseSubmittedVerdict({
        verdict: { type: "fail", category: "controls-broken" },
      }),
    ).toEqual({ type: "fail", category: "controls-broken" });
    expect(parseSubmittedVerdict({ verdict: { type: "rating", stars: 0 } })).toBeNull();
    expect(parseSubmittedVerdict({ verdict: { type: "fail", category: "spam" } })).toBeNull();
  });

  test("transitions stars, failures, and categories without double counting", () => {
    let result = transitionVersionFeedback(null, undefined, {
      type: "rating",
      stars: 2,
    });
    expect(result).toMatchObject({ average: 2, starCount: 1, failCount: 0 });

    result = transitionVersionFeedback(
      result,
      { type: "rating", stars: 2 },
      { type: "rating", stars: 5 },
    );
    expect(result).toMatchObject({ average: 5, starCount: 1, failCount: 0 });

    result = transitionVersionFeedback(
      result,
      { type: "rating", stars: 5 },
      { type: "fail", category: "wont-load" },
    );
    expect(result).toMatchObject({
      average: null,
      starCount: 0,
      failCount: 1,
      failureCategories: { "wont-load": 1 },
    });

    result = transitionVersionFeedback(
      result,
      { type: "fail", category: "wont-load" },
      { type: "fail", category: "crash-freeze" },
    );
    expect(result).toMatchObject({
      failCount: 1,
      failureCategories: { "crash-freeze": 1 },
    });
    expect(result?.failureCategories["wont-load"]).toBeUndefined();

    result = transitionVersionFeedback(
      result,
      { type: "fail", category: "crash-freeze" },
      { type: "rating", stars: 4 },
    );
    expect(result).toMatchObject({ average: 4, starCount: 1, failCount: 0 });
  });

  test("ignores negative legacy aggregate fields", () => {
    const aggregate: FeedbackAggregate = {
      totalStars: -8,
      voteCount: -2,
      failCount: -1,
    };
    expect(buildVersionFeedback(aggregate)).toBeNull();
  });
});
