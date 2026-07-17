import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import FileTable from "../../app/components/file-manager/FileTable.vue";
import type { BlobFile } from "../../app/components/file-manager/types";
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

const InputStub = defineComponent({
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

const CheckboxStub = defineComponent({
  inheritAttrs: false,
  props: { modelValue: Boolean },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    return () =>
      h("button", {
        ...attrs,
        role: "checkbox",
        "aria-checked": props.modelValue,
        onClick: () => emit("update:modelValue", !props.modelValue),
      });
  },
});

const imageFile: BlobFile = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 2048,
  uploadedAt: "2026-07-17T08:00:00Z",
};

function mountTable(overrides: Record<string, unknown> = {}) {
  return mountWithI18n(FileTable, {
    props: {
      folders: ["docs"],
      files: [imageFile],
      selectedFiles: new Set<string>(),
      allSelected: false,
      searchQuery: "",
      sortField: "uploadedAt",
      sortDirection: "desc",
      hasActiveSearch: false,
      resultCount: 2,
      formatSize: (bytes: number) => `${bytes / 1024} kB`,
      formatDate: () => "Jul 17, 2026",
      formatFileType: () => "PNG",
      ...overrides,
    },
    global: {
      stubs: {
        Card: WrapperStub,
        Button: ButtonStub,
        Input: InputStub,
        Checkbox: CheckboxStub,
        Select: WrapperStub,
        SelectTrigger: WrapperStub,
        SelectValue: WrapperStub,
        SelectContent: WrapperStub,
        SelectItem: WrapperStub,
        DropdownMenu: WrapperStub,
        DropdownMenuTrigger: WrapperStub,
        DropdownMenuContent: WrapperStub,
        DropdownMenuItem: ButtonStub,
        DropdownMenuSeparator: WrapperStub,
        Table: WrapperStub,
        TableHeader: WrapperStub,
        TableBody: WrapperStub,
        TableRow: WrapperStub,
        TableHead: WrapperStub,
        TableCell: WrapperStub,
      },
    },
  });
}

describe("FileTable", () => {
  it("keeps row actions visible and emits every applicable image action", async () => {
    const wrapper = mountTable({ folders: [] });
    expect(wrapper.get('[aria-label="Open actions for cat.png"]').isVisible()).toBe(true);

    await wrapper.get('[data-action="copy-raw"]').trigger("click");
    await wrapper.get('[data-action="copy-markdown"]').trigger("click");
    await wrapper.get('[data-action="rename"]').trigger("click");
    await wrapper.get('[data-action="move"]').trigger("click");
    await wrapper.get('[data-action="delete"]').trigger("click");

    expect(wrapper.emitted("copy-url")).toEqual([
      [{ pathname: imageFile.pathname, type: "raw" }],
      [{ pathname: imageFile.pathname, type: "markdown" }],
    ]);
    expect(wrapper.emitted("rename")?.[0]).toEqual([imageFile]);
    expect(wrapper.emitted("move")?.[0]).toEqual([imageFile]);
    expect(wrapper.emitted("delete")?.[0]).toEqual([imageFile.pathname]);
  });

  it("navigates folder rows without rendering folder checkboxes", async () => {
    const wrapper = mountTable({ files: [], folders: ["docs"] });
    expect(wrapper.find('[data-folder="docs"] [role="checkbox"]').exists()).toBe(false);

    const folderButton = wrapper.get('button[data-folder="docs"]');
    expect(folderButton.attributes("type")).toBe("button");
    await folderButton.trigger("click");

    expect(wrapper.emitted("navigate-folder")).toEqual([["docs"]]);
  });

  it("keeps name visible while hiding optional metadata on narrow screens", () => {
    const wrapper = mountTable();
    expect(wrapper.get('[data-column="name"]').classes()).not.toContain("hidden");
    expect(wrapper.get('[data-column="size"]').classes()).toContain("hidden");
    expect(wrapper.get('[data-column="updatedAt"]').classes()).toContain("hidden");
  });

  it("emits controlled search and file selection", async () => {
    const wrapper = mountTable();

    await wrapper.get('input[aria-label="Search this folder…"]').setValue("cat");
    await wrapper.get('[data-file="photos/cat.png"] [role="checkbox"]').trigger("click");

    expect(wrapper.emitted("update:search-query")?.at(-1)).toEqual(["cat"]);
    expect(wrapper.emitted("toggle-file")?.at(-1)).toEqual([imageFile.pathname]);
  });
});
