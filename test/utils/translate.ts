import en from "../../i18n/locales/en.json";
import zhCN from "../../i18n/locales/zh-CN.json";

export function createTestTranslate(locale: "en" | "zh-CN" = "zh-CN") {
  const messages = locale === "en" ? en : zhCN;

  return (key: string, values: Record<string, unknown> = {}): string => {
    const message = key.split(".").reduce<unknown>((value, segment) => {
      if (!value || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[segment];
    }, messages);

    if (typeof message !== "string") return key;
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      message,
    );
  };
}
