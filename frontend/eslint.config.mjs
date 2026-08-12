import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // "next/core-web-vitals" = Next.js's recommended rules + accessibility +
  // performance checks. "next/typescript" layers in the TS-aware rules.
  // "prettier" (== eslint-config-prettier) turns off every ESLint rule that
  // would otherwise conflict with Prettier's formatting — Prettier owns
  // formatting, ESLint owns everything else.
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
