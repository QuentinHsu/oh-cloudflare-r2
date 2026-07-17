import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import AppSidebar from "../../app/components/AppSidebar.vue";
import type { FolderNode } from "../../app/components/file-manager/types";

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

const FolderNodeStub = defineComponent({
  name: "FolderTreeNode",
  props: ["node"],
  emits: ["select", "toggle"],
  setup(props, { emit }) {
    return () =>
      h("div", [
        h(
          "button",
          {
            "data-folder-path": (props.node as FolderNode).path,
            onClick: () => emit("select", (props.node as FolderNode).path),
          },
          (props.node as FolderNode).name,
        ),
        h("button", {
          "data-toggle-path": (props.node as FolderNode).path,
          onClick: () => emit("toggle", (props.node as FolderNode).path),
        }),
      ]);
  },
});

const folderTree: FolderNode[] = [
  {
    name: "images",
    path: "images",
    children: [{ name: "campaign", path: "images/campaign", children: [] }],
  },
];

function mountSidebar() {
  vi.stubGlobal("useI18n", () => ({ t: (key: string) => key }));
  return mount(AppSidebar, {
    props: {
      folderTree,
      currentPath: "",
      expandedFolders: [],
      isUploading: false,
    },
    global: {
      stubs: {
        Sidebar: WrapperStub,
        SidebarHeader: WrapperStub,
        SidebarContent: WrapperStub,
        SidebarFooter: WrapperStub,
        SidebarGroup: WrapperStub,
        SidebarGroupContent: WrapperStub,
        SidebarGroupLabel: WrapperStub,
        SidebarMenu: WrapperStub,
        SidebarMenuItem: WrapperStub,
        SidebarMenuButton: ButtonStub,
        SidebarRail: WrapperStub,
        FolderTreeNode: FolderNodeStub,
        ThemeToggle: true,
        LanguageToggle: true,
        UserMenu: true,
        Button: ButtonStub,
      },
    },
  });
}

describe("AppSidebar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("navigates to the selected folder", async () => {
    const wrapper = mountSidebar();

    await wrapper.get('[data-folder-path="images"]').trigger("click");

    expect(wrapper.emitted("navigate")?.at(-1)).toEqual(["images"]);
  });

  it("keeps expansion separate from navigation", async () => {
    const wrapper = mountSidebar();

    await wrapper.get('[data-toggle-path="images"]').trigger("click");

    expect(wrapper.emitted("toggle-folder")?.at(-1)).toEqual(["images"]);
    expect(wrapper.emitted("navigate")).toBeUndefined();
  });

  it("emits a detached FileList-like upload batch", async () => {
    const wrapper = mountSidebar();
    const file = new File(["notes"], "notes.txt", { type: "text/plain" });
    const files = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
    } as unknown as FileList;
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: files });

    await input.trigger("change");

    const payload = wrapper.emitted("files-selected")?.[0]?.[0] as FileList;
    expect(payload.item(0)?.name).toBe("notes.txt");
    expect(input.element.value).toBe("");
  });
});
