import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public file routes", () => {
  it.each([
    "server/routes/api/blob/[...pathname].get.ts",
    "server/routes/images/[...pathname].get.ts",
  ])("validates paths before serving in %s", (path) => {
    const source = read(path);
    expect(source).toContain("parseFilePath");
    expect(source).toContain("blob.serve");
  });

  it("retains the image content security policy", () => {
    const source = read("server/routes/images/[...pathname].get.ts");
    expect(source).toContain('"Content-Security-Policy"');
    expect(source).toContain("\"default-src 'none';\"");
  });
});
