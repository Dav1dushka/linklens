// Builds the extension (extension/), the demo site (demo/) and the test bundle (.test-build/).
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const common = { bundle: true, target: "es2022", logLevel: "warning", legalComments: "none" };

await Promise.all([
  build({ ...common, entryPoints: ["src/content.ts"], outfile: "extension/content.js", format: "iife" }),
  build({ ...common, entryPoints: ["src/popup.ts"], outfile: "extension/popup.js", format: "iife" }),
  build({ ...common, entryPoints: ["src/demo.ts"], outfile: "demo/demo.js", format: "iife", minify: true }),
]);
mkdirSync("demo/icons", { recursive: true });
cpSync("extension/icons", "demo/icons", { recursive: true });

if (process.argv.includes("--tests")) {
  rmSync(".test-build", { recursive: true, force: true });
  await build({ ...common, entryPoints: ["tests/analyze.test.ts"], outfile: ".test-build/analyze.test.mjs",
    platform: "node", format: "esm" });
}
