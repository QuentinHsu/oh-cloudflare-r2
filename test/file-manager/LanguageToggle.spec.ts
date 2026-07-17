import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import LanguageToggle from "../../app/components/LanguageToggle.vue";

const TriggerStub = defineComponent({
  name: "DropdownMenuTrigger",
  setup(_, { slots }) {
    return () => h("div", slots.default?.());
  },
});

const ItemStub = defineComponent({
  name: "DropdownMenuRadioItem",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

describe("LanguageToggle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("changes locale without navigation", async () => {
    const setLocale = vi.fn<(locale: "en" | "zh-CN") => Promise<void>>().mockResolvedValue();
    vi.stubGlobal("useI18n", () => ({
      locale: ref("en"),
      locales: ref([
        { code: "en", name: "English" },
        { code: "zh-CN", name: "简体中文" },
      ]),
      setLocale,
      t: (key: string) => key,
    }));

    const wrapper = mount(LanguageToggle, {
      global: {
        stubs: {
          Button: TriggerStub,
          DropdownMenu: TriggerStub,
          DropdownMenuTrigger: TriggerStub,
          DropdownMenuContent: TriggerStub,
          DropdownMenuRadioGroup: TriggerStub,
          DropdownMenuRadioItem: ItemStub,
        },
      },
    });

    await wrapper.get('[data-locale="zh-CN"]').trigger("click");

    expect(setLocale).toHaveBeenCalledWith("zh-CN");
  });
});
