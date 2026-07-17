import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import BatchDeleteAlertDialog from "../../app/components/file-manager/BatchDeleteAlertDialog.vue";
import DeleteAlertDialog from "../../app/components/file-manager/DeleteAlertDialog.vue";
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

const stubs = {
  AlertDialog: WrapperStub,
  AlertDialogContent: WrapperStub,
  AlertDialogHeader: WrapperStub,
  AlertDialogTitle: WrapperStub,
  AlertDialogDescription: WrapperStub,
  AlertDialogFooter: WrapperStub,
  AlertDialogCancel: ButtonStub,
  AlertDialogAction: ButtonStub,
};

describe("delete alert dialogs", () => {
  it("describes and confirms a single permanent deletion", async () => {
    const wrapper = mountWithI18n(DeleteAlertDialog, {
      props: { open: true, fileName: "cat.png", isDeleting: false },
      global: { stubs },
    });

    expect(wrapper.text()).toContain("Delete file?");
    expect(wrapper.text()).toContain("cat.png");
    await wrapper.get('[data-action="confirm-delete"]').trigger("click");
    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });

  it("describes and cancels a batch deletion", async () => {
    const wrapper = mountWithI18n(BatchDeleteAlertDialog, {
      props: { open: true, count: 3, isDeleting: false },
      global: { stubs },
    });

    expect(wrapper.text()).toContain("Delete 3 files?");
    await wrapper.get('[data-action="cancel-delete"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
