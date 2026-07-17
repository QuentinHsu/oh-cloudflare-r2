import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import en from "../../i18n/locales/en.json";
import zhCN from "../../i18n/locales/zh-CN.json";

export function mountWithI18n<T>(
  component: T,
  options: ComponentMountingOptions<T> = {},
  locale: "en" | "zh-CN" = "en",
) {
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
