import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import FileStatePanel from "../../app/components/file-manager/FileStatePanel.vue";
import { mountWithI18n } from "../utils/i18n";

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

function mountState(state: Record<string, unknown>) {
  return mountWithI18n(FileStatePanel, {
    props: { state },
    global: {
      stubs: {
        Card: WrapperStub,
        CardContent: WrapperStub,
        Button: ButtonStub,
        Skeleton: WrapperStub,
      },
    },
  });
}

describe("FileStatePanel", () => {
  it.each([
    ["loading", { kind: "loading" }],
    ["error", { kind: "error" }],
    ["empty", { kind: "empty" }],
    ["no-results", { kind: "no-results", query: "cat", count: 0 }],
  ] as const)("renders the %s state", (kind, state) => {
    const wrapper = mountState(state);
    expect(wrapper.attributes("data-state")).toBe(kind);
  });

  it("emits the recovery action for actionable states", async () => {
    const error = mountState({ kind: "error" });
    await error.get('[data-action="retry"]').trigger("click");
    expect(error.emitted("retry")).toHaveLength(1);

    const empty = mountState({ kind: "empty" });
    await empty.get('[data-action="upload"]').trigger("click");
    expect(empty.emitted("upload")).toHaveLength(1);

    const noResults = mountState({ kind: "no-results", query: "cat", count: 0 });
    await noResults.get('[data-action="clear-search"]').trigger("click");
    expect(noResults.emitted("clear-search")).toHaveLength(1);
  });
});
