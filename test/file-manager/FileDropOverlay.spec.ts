import { describe, expect, it } from "vitest";
import FileDropOverlay from "../../app/components/file-manager/FileDropOverlay.vue";
import { mountWithI18n } from "../utils/i18n";

describe("FileDropOverlay", () => {
  it("renders accessible release guidance without intercepting pointer events", () => {
    const wrapper = mountWithI18n(FileDropOverlay);
    const status = wrapper.get('[role="status"]');

    expect(status.text()).toContain("Drop to upload");
    expect(status.text()).toContain("You can upload multiple files at once");
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.classes()).toContain("pointer-events-none");
    expect(status.get("svg").attributes("aria-hidden")).toBe("true");
  });
});
