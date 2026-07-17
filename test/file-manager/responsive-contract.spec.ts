import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard responsive and theme contract", () => {
  it("keeps critical mobile targets and responsive columns explicit", () => {
    const sources = [
      "app/components/AppSidebar.vue",
      "app/components/file-manager/FileDashboardHeader.vue",
      "app/components/file-manager/FileTable.vue",
      "app/components/file-manager/FileBulkToolbar.vue",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(sources).toMatch(/size-11|min-h-11|h-11/);
    expect(sources).toMatch(/md:/);
    expect(sources).toMatch(/hidden.*sm:table-cell/);
    expect(sources).toMatch(/hidden.*md:table-cell/);
  });

  it("uses semantic surfaces and respects reduced motion", () => {
    const businessSources = [
      "app/components/FileManager.vue",
      "app/components/AppSidebar.vue",
      "app/components/ThemeToggle.vue",
      "app/components/UserMenu.vue",
      "app/components/file-manager/FileTable.vue",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const styles = readFileSync("app/assets/css/main.css", "utf8");

    expect(businessSources).not.toMatch(/bg-white|text-black|(?:bg|text|border)-gray-/);
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toMatch(/--destructive-foreground:\s*oklch\(0\.985 0 0\)/);
    expect(styles.match(/--destructive-foreground:\s*oklch\(0\.985 0 0\)/g)).toHaveLength(2);
  });

  it("keeps user-facing copy in locale resources", () => {
    const localizedSources = [
      "app/app.vue",
      "app/pages/login.vue",
      "app/components/ThemeToggle.vue",
      "app/components/UserMenu.vue",
      "app/composables/file-manager/fileOperationUtils.ts",
      "app/composables/file-manager/useBatchFileOperations.ts",
      "app/composables/file-manager/useFileDropzone.ts",
      "app/composables/file-manager/useFileOperations.ts",
      "app/composables/file-manager/useFilePreview.ts",
      "app/composables/file-manager/useFileUpload.ts",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(localizedSources).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("keeps dialogs inside mobile viewports and folder choices keyboard accessible", () => {
    const dialogPrimitives = [
      "app/components/ui/dialog/DialogContent.vue",
      "app/components/ui/alert-dialog/AlertDialogContent.vue",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const folderDialogs = [
      "app/components/file-manager/UploadDialog.vue",
      "app/components/file-manager/MoveDialog.vue",
      "app/components/file-manager/BatchMoveDialog.vue",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const alertActions = [
      "app/components/ui/alert-dialog/AlertDialogAction.vue",
      "app/components/ui/alert-dialog/AlertDialogCancel.vue",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(dialogPrimitives).toContain("w-[calc(100%-2rem)]");
    expect(dialogPrimitives).toContain("max-h-[calc(100vh-2rem)]");
    expect(folderDialogs).not.toMatch(/<div[^>]*@click=/);
    expect(alertActions).toContain("min-h-11");
  });

  it("gives every primary mobile navigation control an explicit touch target", () => {
    const sidebar = readFileSync("app/components/AppSidebar.vue", "utf8");
    const header = readFileSync("app/components/file-manager/FileDashboardHeader.vue", "utf8");

    expect(sidebar).toMatch(/class="min-h-11 md:min-h-8"[\s\S]{0,100}data-folder-path=""/);
    expect(header).toMatch(
      /class="flex min-h-11 min-w-11[^"]*"[\s\S]{0,100}:data-path-index="index"/,
    );
  });

  it("keeps the collapsed sidebar in a single aligned icon column", () => {
    const sidebar = readFileSync("app/components/AppSidebar.vue", "utf8");
    const themeToggle = readFileSync("app/components/ThemeToggle.vue", "utf8");
    const userMenu = readFileSync("app/components/UserMenu.vue", "utf8");

    expect(sidebar).toMatch(/group-data-\[collapsible=icon\]:size-8/);
    expect(sidebar).toMatch(/data-folder-tree[^>]*group-data-\[collapsible=icon\]:hidden/);
    expect(themeToggle).toContain("group-data-[collapsible=icon]:size-8");
    expect(userMenu).toContain("group-data-[collapsible=icon]:size-8");
  });
});
