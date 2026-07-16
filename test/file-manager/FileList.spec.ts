import { describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import FileList from "../../app/components/file-manager/FileList.vue";
import type { BlobFile } from "../../app/components/file-manager/types";

const ButtonStub = defineComponent({
  name: "Button",
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const listeners: Record<string, unknown> = {};
    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith("on")) listeners[key] = value;
    });
    return () => h("button", { ...attrs, ...listeners }, slots.default?.());
  },
});

describe("FileList", () => {
  const files: BlobFile[] = [
    {
      pathname: "photos/cat.png",
      contentType: "image/png",
      size: 2048,
      uploadedAt: "2024-01-02T03:04:05Z",
    },
  ];
  const folders = ["docs"];

  const baseProps = {
    status: "success",
    folders,
    files,
    isSelectionMode: false,
    selectedFiles: new Set<string>(),
    allSelected: false,
    hasSelection: false,
    hasActiveSearch: false,
    searchQuery: "",
    hasSourceItems: true,
  };

  const mountList = (overrides: Partial<typeof baseProps> = {}) =>
    mount(FileList, {
      props: { ...baseProps, ...overrides },
      global: {
        stubs: {
          Button: ButtonStub,
          Card: defineComponent({
            name: "Card",
            setup(_, { slots }) {
              return () => h("div", slots.default?.());
            },
          }),
          ScrollArea: defineComponent({
            name: "ScrollArea",
            setup(_, { slots }) {
              return () => h("div", slots.default?.());
            },
          }),
        },
      },
    });

  it("emits navigate-folder when folder clicked", async () => {
    const wrapper = mountList();
    const folderRow = wrapper.find(".cursor-pointer");
    await folderRow?.trigger("click");
    expect(wrapper.emitted("navigate-folder")).toMatchObject([[folders[0]]]);
  });

  it("emits open-preview when clicking image filename", async () => {
    const wrapper = mountList();
    const name = wrapper
      .findAll("span")
      .find((w) => w.classes().includes("flex-1") && w.text().includes("cat"));
    await name?.trigger("click");
    expect(wrapper.emitted("open-preview")).toBeTruthy();
  });

  it("emits action buttons for copy/rename/move/delete", async () => {
    const wrapper = mountList();
    const actionButtons = wrapper.findAllComponents(ButtonStub);
    expect(actionButtons.length).toBe(5);
    for (const btn of actionButtons) {
      await btn.trigger("click");
    }

    expect(wrapper.emitted("copy-url")?.[0]).toEqual([
      { pathname: files[0].pathname, type: "raw" },
    ]);
    expect(wrapper.emitted("copy-url")?.[1]).toEqual([
      { pathname: files[0].pathname, type: "markdown" },
    ]);
    expect(wrapper.emitted("rename")).toBeTruthy();
    expect(wrapper.emitted("move")).toBeTruthy();
    expect(wrapper.emitted("delete")).toBeTruthy();
  });

  it("shows the ordinary empty state for an empty source directory", () => {
    const wrapper = mountList({
      folders: [],
      files: [],
      hasActiveSearch: true,
      searchQuery: "invoice",
      hasSourceItems: false,
    });
    expect(wrapper.text()).toContain("暂无文件");
    expect(wrapper.text()).not.toContain("没有找到");
  });

  it("shows and clears an active search with no visible results", async () => {
    const wrapper = mountList({
      folders: [],
      files: [],
      hasActiveSearch: true,
      searchQuery: "invoice",
      hasSourceItems: true,
    });

    expect(wrapper.text()).toContain("没有找到与“invoice”匹配的文件或文件夹");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("clear-search")).toHaveLength(1);
  });
});
