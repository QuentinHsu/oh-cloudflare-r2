import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/assets/css/main.css", "utf8");

describe("dashboard theme tokens", () => {
  it.each([
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
  ])("defines %s in light and dark themes", (token) => {
    expect(css.match(new RegExp(`${token}:`, "g")) ?? []).toHaveLength(2);
  });

  it("maps sidebar variables into Tailwind theme colors", () => {
    expect(css).toContain("--color-sidebar: var(--sidebar)");
    expect(css).toContain("--color-sidebar-foreground: var(--sidebar-foreground)");
  });
});
