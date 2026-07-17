import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { vi } from "vitest";
import { createI18n, useI18n } from "vue-i18n";
import en from "../../i18n/locales/en.json";
import zhCN from "../../i18n/locales/zh-CN.json";

export function mountWithI18n<T>(
  component: T,
  options: ComponentMountingOptions<T> = {},
  locale: "en" | "zh-CN" = "en",
) {
  vi.stubGlobal("useI18n", useI18n);
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: { en, "zh-CN": zhCN },
  });

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [...(options.global?.plugins ?? []), i18n],
    },
  });
}
