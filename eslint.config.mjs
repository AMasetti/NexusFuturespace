import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  // These components render user-supplied src props (data URIs / local assets),
  // not remote images — Next.js Image optimisation doesn't apply here.
  {
    files: [
      "components/hud/visualization/MicroscopyViewer.tsx",
      "components/hud/panels/SuitViewer.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
