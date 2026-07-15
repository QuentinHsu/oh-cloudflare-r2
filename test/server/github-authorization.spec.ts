import { describe, expect, it } from "vitest";
import {
  isGithubUserAllowed,
  parseAllowedGithubUserIds,
} from "../../server/utils/github-authorization";

describe("GitHub authorization", () => {
  it("parses positive numeric IDs and removes duplicates", () => {
    expect(parseAllowedGithubUserIds(" 123,456,123 ")).toEqual(new Set([123, 456]));
  });

  it.each([undefined, null, "", "   ", "123,invalid", "0", "-1", "1.5"])(
    "treats %j as invalid configuration",
    (value) => {
      expect(parseAllowedGithubUserIds(value)).toBeNull();
    },
  );

  it("allows only IDs in a valid configuration", () => {
    expect(isGithubUserAllowed(123, "123,456")).toBe(true);
    expect(isGithubUserAllowed(999, "123,456")).toBe(false);
  });

  it("fails closed for invalid configuration", () => {
    expect(isGithubUserAllowed(123, "123,invalid")).toBe(false);
  });
});
