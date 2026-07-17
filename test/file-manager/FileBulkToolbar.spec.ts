import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import FileBulkToolbar from "../../app/components/file-manager/FileBulkToolbar.vue";
import { mountWithI18n } from "../utils/i18n";

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

const WrapperStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("div", attrs, slots.default?.());
  },
});

function mountToolbar(selectedCount: number) {
  return mountWithI18n(FileBulkToolbar, {
    props: { selectedCount, isMoving: false, isDeleting: false },
    global: { stubs: { Button: ButtonStub, Badge: WrapperStub } },
  });
}

describe("FileBulkToolbar", () => {
  it("renders only when files are selected", () => {
    expect(mountToolbar(0).find("[data-bulk-toolbar]").exists()).toBe(false);
    expect(mountToolbar(2).get("[data-bulk-toolbar]").text()).toContain("2 selected");
  });

  it("emits move, delete, and clear actions", async () => {
    const wrapper = mountToolbar(2);

    await wrapper.get('[data-action="move"]').trigger("click");
    await wrapper.get('[data-action="delete"]').trigger("click");
    await wrapper.get('[data-action="clear"]').trigger("click");

    expect(wrapper.emitted("move")).toHaveLength(1);
    expect(wrapper.emitted("delete")).toHaveLength(1);
    expect(wrapper.emitted("clear")).toHaveLength(1);
  });
});
