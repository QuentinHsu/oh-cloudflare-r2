import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import FileViewControls from "../../app/components/file-manager/FileViewControls.vue";

const ButtonStub = defineComponent({
  name: "Button",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

const InputStub = defineComponent({
  name: "Input",
  inheritAttrs: false,
  props: { modelValue: { type: [String, Number], default: "" } },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    return () =>
      h("input", {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit("update:modelValue", (event.target as HTMLInputElement).value),
      });
  },
});

const SelectStub = defineComponent({
  name: "Select",
  props: { modelValue: String },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          "aria-label": "排序字段",
          value: props.modelValue,
          onChange: (event: Event) =>
            emit("update:modelValue", (event.target as HTMLSelectElement).value),
        },
        [
          h("option", { value: "name" }, "名称"),
          h("option", { value: "uploadedAt" }, "更新时间"),
          h("option", { value: "size" }, "大小"),
        ],
      );
  },
});

function mountControls(hasActiveSearch = true) {
  return mount(FileViewControls, {
    props: {
      searchQuery: hasActiveSearch ? "cat" : "",
      sortField: "uploadedAt",
      sortDirection: "desc",
      hasActiveSearch,
      resultCount: 2,
    },
    global: {
      stubs: {
        Button: ButtonStub,
        Input: InputStub,
        Select: SelectStub,
        SelectTrigger: true,
        SelectValue: true,
        SelectContent: true,
        SelectItem: true,
      },
    },
  });
}

describe("FileViewControls", () => {
  it("emits controlled search and sort updates", async () => {
    const wrapper = mountControls();

    await wrapper.get('input[aria-label="搜索当前文件夹"]').setValue("dog");
    await wrapper.get('select[aria-label="排序字段"]').setValue("size");

    expect(wrapper.emitted("update:search-query")?.at(-1)).toEqual(["dog"]);
    expect(wrapper.emitted("update:sort-field")?.at(-1)).toEqual(["size"]);
  });

  it("exposes accessible icon actions and result count", async () => {
    const wrapper = mountControls();
    const clear = wrapper.get('button[aria-label="清除搜索"]');
    const direction = wrapper.get('button[aria-label="切换为升序"]');

    expect(clear.attributes("title")).toBe("清除搜索");
    expect(direction.attributes("title")).toBe("切换为升序");
    expect(wrapper.text()).toContain("找到 2 项");

    await clear.trigger("click");
    await direction.trigger("click");
    expect(wrapper.emitted("clear-search")).toHaveLength(1);
    expect(wrapper.emitted("toggle-sort-direction")).toHaveLength(1);
  });

  it("hides clear action and summary without active search", () => {
    const wrapper = mountControls(false);
    expect(wrapper.find('button[aria-label="清除搜索"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("找到");
  });
});
