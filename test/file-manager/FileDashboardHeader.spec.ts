import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import FileDashboardHeader from "../../app/components/file-manager/FileDashboardHeader.vue";

const WrapperStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("div", attrs, slots.default?.());
  },
});

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

describe("FileDashboardHeader", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("emits root and path breadcrumb navigation", async () => {
    vi.stubGlobal("useI18n", () => ({ t: (key: string) => key }));
    const wrapper = mount(FileDashboardHeader, {
      props: { pathParts: ["images", "campaign"] },
      global: {
        stubs: {
          SidebarTrigger: ButtonStub,
          Breadcrumb: WrapperStub,
          BreadcrumbList: WrapperStub,
          BreadcrumbItem: WrapperStub,
          BreadcrumbLink: ButtonStub,
          BreadcrumbPage: WrapperStub,
          BreadcrumbSeparator: WrapperStub,
          Separator: WrapperStub,
        },
      },
    });

    await wrapper.get('[data-path-index="-1"]').trigger("click");
    await wrapper.get('[data-path-index="0"]').trigger("click");

    expect(wrapper.emitted("navigate")).toEqual([[-1], [0]]);
  });
});
