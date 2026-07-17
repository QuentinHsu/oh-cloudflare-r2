import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import LoginPage from "../../app/pages/login.vue";
import { mountWithI18n } from "../utils/i18n";

describe("login localization", () => {
  beforeEach(() => {
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("useRoute", () => ({ query: {} }));
  });

  it.each([
    ["en", "Continue with GitHub"],
    ["zh-CN", "使用 GitHub 登录"],
  ] as const)("renders the GitHub action in %s", (locale, label) => {
    const wrapper = mountWithI18n(LoginPage, {}, locale);

    expect(wrapper.get('a[href="/api/auth/github"]').text()).toBe(label);
  });

  it.each([
    ["en", "This GitHub account does not have access"],
    ["zh-CN", "该 GitHub 账户无权访问"],
  ] as const)("renders the unauthorized error in %s", (locale, message) => {
    vi.stubGlobal("useRoute", () => ({ query: { error: "unauthorized" } }));
    const wrapper = mountWithI18n(LoginPage, {}, locale);

    expect(wrapper.get('[role="alert"]').text()).toBe(message);
  });
});
