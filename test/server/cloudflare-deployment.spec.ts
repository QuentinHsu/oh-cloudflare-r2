import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const requiredCompatibilityFlags = ["nodejs_compat", "no_nodejs_compat_v2"];

describe("Cloudflare deployment configuration", () => {
  it("enables Nitro Node compatibility in the project Wrangler config", () => {
    const config = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");

    for (const flag of requiredCompatibilityFlags) {
      expect(config).toContain(`"${flag}"`);
    }
  });

  it("documents the same compatibility flags for parent repositories", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");

    for (const flag of requiredCompatibilityFlags) {
      expect(readme).toContain(`"${flag}"`);
    }
  });
});
