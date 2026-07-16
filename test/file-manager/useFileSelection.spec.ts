import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFileSelection } from "../../app/composables/file-manager/useFileSelection";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  { pathname: "a.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
  { pathname: "b.png", contentType: "image/png", size: 1, uploadedAt: "2026-01-01" },
];

describe("useFileSelection", () => {
  it("toggles individual and all-file selection", () => {
    const selection = useFileSelection(ref(files));

    selection.toggleSelectionMode();
    selection.toggleFileSelection("a.png");
    expect(selection.hasSelection.value).toBe(true);
    expect(selection.allSelected.value).toBe(false);

    selection.toggleSelectAll();
    expect(selection.allSelected.value).toBe(true);
    selection.toggleSelectAll();
    expect(selection.selectedFiles.value.size).toBe(0);
  });

  it("clears selection when leaving selection mode", () => {
    const selection = useFileSelection(ref(files));
    selection.toggleSelectionMode();
    selection.toggleFileSelection("a.png");
    selection.toggleSelectionMode();

    expect(selection.isSelectionMode.value).toBe(false);
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
    selection.toggleSelectionMode();

    visibleFiles.value = [files[1]];
    selection.toggleSelectAll();

    expect([...selection.selectedFiles.value]).toEqual(["b.png"]);
    expect(selection.allSelected.value).toBe(true);
  });
});
