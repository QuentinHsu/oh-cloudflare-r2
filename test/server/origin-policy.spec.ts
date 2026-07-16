import { describe, expect, it } from "vitest";
import {
  getRequestOrigin,
  isOriginAllowed,
  parseAllowedOrigins,
} from "../../server/utils/origin-policy";

describe("origin policy", () => {
  it("parses configured origins without empty entries", () => {
    expect(parseAllowedOrigins("https://a.example, *.example.com, ")).toEqual([
      "https://a.example",
      "*.example.com",
    ]);
  });

  it("returns null for malformed Origin and Referer values", () => {
    expect(getRequestOrigin("not a url", undefined)).toBeNull();
    expect(getRequestOrigin(undefined, "://bad")).toBeNull();
  });

  it("prefers Origin over Referer", () => {
    expect(getRequestOrigin("https://origin.example/path", "https://referer.example/path")).toBe(
      "https://origin.example",
    );
  });

  it("matches exact origins and wildcard subdomains safely", () => {
    expect(isOriginAllowed("https://app.example.com", ["*.example.com"])).toBe(true);
    expect(isOriginAllowed("https://example.com", ["*.example.com"])).toBe(true);
    expect(isOriginAllowed("https://app.example.com", ["https://*.example.com"])).toBe(true);
    expect(isOriginAllowed("http://app.example.com", ["https://*.example.com"])).toBe(false);
    expect(isOriginAllowed("https://example.com.evil.test", ["*.example.com"])).toBe(false);
  });
});
