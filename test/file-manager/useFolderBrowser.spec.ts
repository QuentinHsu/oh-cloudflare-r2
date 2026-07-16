import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFolderBrowser } from "../../app/composables/file-manager/useFolderBrowser";

describe("useFolderBrowser", () => {
  it("navigates folders and breadcrumbs", () => {
    const browser = useFolderBrowser(ref(["photos/2026", "docs"]));

    browser.navigateToFolder("photos");
    browser.navigateToFolder("2026");
    expect(browser.currentPath.value).toBe("photos/2026/");
    expect(browser.pathParts.value).toEqual(["photos", "2026"]);

    browser.navigateToPath(0);
    expect(browser.currentPath.value).toBe("photos/");
    browser.navigateToPath(-1);
    expect(browser.currentPath.value).toBe("");
  });

  it("builds the tree and expands parents without duplicates", () => {
    const browser = useFolderBrowser(ref(["photos/2026/events", "photos/2025"]));

    expect(browser.folderTree.value[0]?.name).toBe("photos");
    browser.expandPathParents("photos/2026/events");
    browser.expandPathParents("photos/2026");
    expect(browser.expandedFolders.value).toEqual(["photos", "photos/2026", "photos/2026/events"]);

    browser.toggleFolder("photos/2026");
    expect(browser.expandedFolders.value).toEqual(["photos", "photos/2026/events"]);
  });
});
