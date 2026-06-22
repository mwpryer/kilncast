import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    admin: "src/admin.ts",
    web: "src/web.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
