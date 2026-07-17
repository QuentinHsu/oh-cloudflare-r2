import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import BatchMoveDialog from "../../app/components/file-manager/BatchMoveDialog.vue";
import MoveDialog from "../../app/components/file-manager/MoveDialog.vue";
import PreviewDialog from "../../app/components/file-manager/PreviewDialog.vue";
import RenameDialog from "../../app/components/file-manager/RenameDialog.vue";
import UploadDialog from "../../app/components/file-manager/UploadDialog.vue";
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
  setup(props, { attrs }) {
    return () => h("input", { ...attrs, value: props.modelValue });
  },
});

const stubs = {
  Dialog: WrapperStub,
  DialogContent: WrapperStub,
  DialogHeader: WrapperStub,
  DialogTitle: WrapperStub,
  DialogDescription: WrapperStub,
  DialogFooter: WrapperStub,
  Button: ButtonStub,
  Input: InputStub,
  Label: WrapperStub,
  FolderTreeNode: true,
};

describe("localized file dialogs", () => {
  it("renders upload copy in English", () => {
    const wrapper = mountWithI18n(UploadDialog, {
      props: {
        open: true,
        pendingCount: 2,
        uploadPath: "",
        folderTree: [],
        expandedFolders: [],
        isUploading: false,
      },
      global: { stubs },
    });
    expect(wrapper.text()).toContain("Upload 2 files");
    expect(wrapper.text()).toContain("Upload");
  });

  it("renders single and batch move copy in English", () => {
    const move = mountWithI18n(MoveDialog, {
      props: {
        open: true,
        fileName: "cat.png",
        folderTree: [],
        expandedFolders: [],
        targetPath: "",
        isMoving: false,
      },
      global: { stubs },
    });
    expect(move.text()).toContain("Move file");

    const batch = mountWithI18n(BatchMoveDialog, {
      props: {
        open: true,
        count: 3,
        folderTree: [],
        expandedFolders: [],
        targetPath: "",
        isBatchMoving: false,
      },
      global: { stubs },
    });
    expect(batch.text()).toContain("Move 3 files");
  });

  it("renders rename and preview copy in English", () => {
    const rename = mountWithI18n(RenameDialog, {
      props: {
        open: true,
        currentName: "cat.png",
        newFileName: "cat.png",
        isRenaming: false,
      },
      global: { stubs },
    });
    expect(rename.text()).toContain("Rename file");

    const preview = mountWithI18n(PreviewDialog, {
      props: { open: true, fileName: "cat.png", src: "" },
      global: { stubs },
    });
    expect(preview.text()).toContain("Preview cat.png");
    expect(preview.text()).toContain("Copy Markdown");
  });
});
