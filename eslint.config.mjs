import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  // next/core-web-vitals enables only a SUBSET of jsx-a11y (alt-text, aria-props
  // and friends). The recommended set adds the rules that catch the defects that
  // actually reach users: labels with no control, interactive roles on
  // non-interactive elements, click handlers with no keyboard equivalent.
  ...compat.extends("next/core-web-vitals", "next/typescript", "plugin:jsx-a11y/recommended"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts", "scripts/**"]
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Our form controls are Radix wrappers, not bare <input>. Without this the
      // rule cannot see the association and reports every one of them — which
      // would mean turning the rule off, and losing the case it exists for: a
      // <label> with no control in it at all.
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          controlComponents: ["Switch", "Checkbox", "Input", "Textarea", "Select", "RadioGroupItem"],
          depth: 3
        }
      ]
    }
  }
];

export default eslintConfig;
