import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFileSelection } from "../../app/composables/file-manager/useFileSelection";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  { pathname: "a.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
  { pathname: "b.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
];

describe("useFileSelection", () => {
  it("selects files without entering a separate mode", () => {
    const selection = useFileSelection(ref(files));

    selection.toggleFileSelection("a.png");
    expect(selection.hasSelection.value).toBe(true);
    expect(selection.allSelected.value).toBe(false);

    expect("isSelectionMode" in selection).toBe(false);
    expect("toggleSelectionMode" in selection).toBe(false);
  });

  it("selects and clears every visible file", () => {
    const selection = useFileSelection(ref(files));

    selection.toggleSelectAll();
    expect(selection.allSelected.value).toBe(true);
    selection.toggleSelectAll();
    expect(selection.selectedFiles.value.size).toBe(0);
  });

  it("does not report all-selected for an empty list", () => {
    const selection = useFileSelection(ref([]));
    selection.toggleSelectAll();
    expect(selection.allSelected.value).toBe(false);
  });

  it("selects only files in the reactive visible list", () => {
    const visibleFiles = ref(files);
    const selection = useFileSelection(visibleFiles);

    visibleFiles.value = [files[1]];
    selection.toggleSelectAll();

    expect([...selection.selectedFiles.value]).toEqual(["b.png"]);
    expect(selection.allSelected.value).toBe(true);
  });

  it("replaces the complete selection", () => {
    const selection = useFileSelection(ref(files));
    selection.toggleFileSelection("a.png");
    selection.replaceSelection(["b.png"]);

    expect([...selection.selectedFiles.value]).toEqual(["b.png"]);
  });
});
