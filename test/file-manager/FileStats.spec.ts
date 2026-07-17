import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import FileStats from "../../app/components/file-manager/FileStats.vue";
import type { DirectorySummary } from "../../app/composables/file-manager/useFilePresentation";
import { mountWithI18n } from "../utils/i18n";

const WrapperStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h("div", attrs, slots.default?.());
  },
});

function mountStats(summary: DirectorySummary) {
  return mountWithI18n(FileStats, {
    props: {
      summary,
      formatSize: (bytes: number) => `${bytes / 1024} kB`,
      formatRelativeTime: () => "1 hour ago",
    },
    global: {
      stubs: {
        Card: WrapperStub,
        CardHeader: WrapperStub,
        CardTitle: WrapperStub,
        CardDescription: WrapperStub,
        CardContent: WrapperStub,
        Badge: WrapperStub,
      },
    },
  });
}

describe("FileStats", () => {
  it("renders four current-directory metrics", () => {
    const wrapper = mountStats({
      fileCount: 3,
      imageCount: 2,
      folderCount: 1,
      totalSize: 2048,
      latestFile: {
        pathname: "hero.png",
        contentType: "image/png",
        size: 1024,
        uploadedAt: "2026-07-17T08:00:00Z",
      },
    });

    expect(wrapper.findAll("[data-stat-card]")).toHaveLength(4);
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("2 kB");
    expect(wrapper.text()).toContain("hero.png");
    expect(wrapper.text()).toContain("1 hour ago");
  });

  it("renders valid zero and never-updated states", () => {
    const wrapper = mountStats({
      fileCount: 0,
      imageCount: 0,
      folderCount: 0,
      totalSize: 0,
    });

    expect(wrapper.text()).toContain("No updates");
    expect(wrapper.findAll("[data-stat-card]")).toHaveLength(4);
  });
});
