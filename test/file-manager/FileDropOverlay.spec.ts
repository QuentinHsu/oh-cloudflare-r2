import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FileDropOverlay from "../../app/components/file-manager/FileDropOverlay.vue";

describe("FileDropOverlay", () => {
  it("renders accessible release guidance without intercepting pointer events", () => {
    const wrapper = mount(FileDropOverlay);
    const status = wrapper.get('[role="status"]');

    expect(status.text()).toContain("释放以上传文件");
    expect(status.text()).toContain("支持同时上传多个文件");
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.classes()).toContain("pointer-events-none");
    expect(status.get("svg").attributes("aria-hidden")).toBe("true");
  });
});
