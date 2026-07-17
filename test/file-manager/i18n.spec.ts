import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const localePaths = ["i18n/locales/en.json", "i18n/locales/zh-CN.json"] as const;

function localesExist(): boolean {
  return localePaths.every((path) => existsSync(path));
}

function readLocales() {
  return localePaths.map((path) => JSON.parse(readFileSync(path, "utf8"))) as [
    Record<string, any>,
    Record<string, any>,
  ];
}

function flattenKeys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child as Record<string, unknown>, path)
      : [path];
  });
}

describe("dashboard locales", () => {
  it("provides English and Simplified Chinese locale resources", () => {
    expect(localesExist()).toBe(true);
  });

  it("keeps locale key sets identical", () => {
    if (!localesExist()) return;
    const [en, zhCN] = readLocales();
    expect(flattenKeys(zhCN)).toEqual(flattenKeys(en));
  });

  it("contains critical file workflows in both languages", () => {
    if (!localesExist()) return;
    const locales = readLocales();

    for (const messages of locales) {
      expect(messages.sidebar.upload).toBeTruthy();
      expect(messages.files.actions.delete).toBeTruthy();
      expect(messages.files.states.retry).toBeTruthy();
      expect(messages.dialogs.batchMove.title).toBeTruthy();
      expect(messages.errors.partial.title).toBeTruthy();
    }
  });
});
