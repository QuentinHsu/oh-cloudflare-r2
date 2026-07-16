import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useFileView } from "../../app/composables/file-manager/useFileView";
import type { BlobFile } from "../../app/components/file-manager/types";

const files: BlobFile[] = [
  {
    pathname: "photos/Zebra-10.png",
    contentType: "image/png",
    size: 100,
    uploadedAt: "2026-01-03T00:00:00Z",
  },
  {
    pathname: "photos/alpha-2.png",
    contentType: "image/png",
    size: 300,
    uploadedAt: "2026-01-01T00:00:00Z",
  },
  {
    pathname: "photos/alpha-10.png",
    contentType: "image/png",
    size: 200,
    uploadedAt: "2026-01-02T00:00:00Z",
  },
];

describe("useFileView", () => {
  it("filters current-folder folders and filenames without case sensitivity", () => {
    const view = useFileView(ref(["Receipts", "Travel"]), ref(files));

    view.searchQuery.value = "  ALPHA  ";

    expect(view.visibleFolders.value).toEqual([]);
    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "photos/alpha-10.png",
      "photos/alpha-2.png",
    ]);
    expect(view.hasActiveSearch.value).toBe(true);
    expect(view.resultCount.value).toBe(2);

    view.searchQuery.value = "receipt";
    expect(view.visibleFolders.value).toEqual(["Receipts"]);
    expect(view.visibleFiles.value).toEqual([]);
  });

  it("treats blank search as inactive and keeps uploadedAt descending by default", () => {
    const view = useFileView(ref(["Travel", "docs"]), ref(files));

    view.searchQuery.value = "   ";

    expect(view.hasActiveSearch.value).toBe(false);
    expect(view.visibleFolders.value).toEqual(["docs", "Travel"]);
    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "photos/Zebra-10.png",
      "photos/alpha-10.png",
      "photos/alpha-2.png",
    ]);
    expect(view.resultCount.value).toBe(5);
  });

  it.each([
    ["name", "asc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
    ["name", "desc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
    ["uploadedAt", "asc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
    ["uploadedAt", "desc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
    ["size", "asc", ["photos/Zebra-10.png", "photos/alpha-10.png", "photos/alpha-2.png"]],
    ["size", "desc", ["photos/alpha-2.png", "photos/alpha-10.png", "photos/Zebra-10.png"]],
  ] as const)("sorts by %s %s", (field, direction, expected) => {
    const view = useFileView(ref([]), ref(files));
    view.sortField.value = field;
    view.sortDirection.value = direction;

    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual(expected);
  });

  it("uses filename and pathname as deterministic ascending tie-breakers", () => {
    const tied: BlobFile[] = [
      {
        pathname: "b/same.png",
        contentType: "image/png",
        size: 10,
        uploadedAt: "2026-01-01",
      },
      {
        pathname: "c/zeta.png",
        contentType: "image/png",
        size: 10,
        uploadedAt: "2026-01-01",
      },
      {
        pathname: "a/same.png",
        contentType: "image/png",
        size: 10,
        uploadedAt: "2026-01-01",
      },
    ];
    const view = useFileView(ref([]), ref(tied));
    view.sortField.value = "size";
    view.sortDirection.value = "desc";

    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "a/same.png",
      "b/same.png",
      "c/zeta.png",
    ]);
  });

  it("uses case-sensitive pathname order when collated names are equal", () => {
    const tied: BlobFile[] = [
      {
        pathname: "a/same.png",
        contentType: "image/png",
        size: 10,
        uploadedAt: "2026-01-01",
      },
      {
        pathname: "A/same.png",
        contentType: "image/png",
        size: 10,
        uploadedAt: "2026-01-01",
      },
    ];
    const view = useFileView(ref([]), ref(tied));
    view.sortField.value = "size";

    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "A/same.png",
      "a/same.png",
    ]);
  });

  it("treats invalid dates as timestamp zero", () => {
    const dated: BlobFile[] = [
      {
        pathname: "valid.png",
        contentType: "image/png",
        size: 1,
        uploadedAt: "2026-01-01",
      },
      {
        pathname: "invalid.png",
        contentType: "image/png",
        size: 1,
        uploadedAt: "not-a-date",
      },
    ];
    const view = useFileView(ref([]), ref(dated));
    view.sortDirection.value = "asc";

    expect(view.visibleFiles.value.map((file) => file.pathname)).toEqual([
      "invalid.png",
      "valid.png",
    ]);
  });

  it("clears search and toggles direction without resetting the sort field", () => {
    const view = useFileView(ref([]), ref(files));
    view.searchQuery.value = "alpha";
    view.sortField.value = "size";

    view.clearSearch();
    view.toggleSortDirection();

    expect(view.searchQuery.value).toBe("");
    expect(view.sortField.value).toBe("size");
    expect(view.sortDirection.value).toBe("asc");
  });
});
