import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from '@eslint/eslintrc'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})


const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable rules related to unused variables
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
      // Disable other commonly annoying rules
      "react/display-name": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      
      // Make console statements warnings instead of errors
      "no-console": "warn",
      
      // Relax TypeScript strictness
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-inferrable-types": "off"
    }
  }
];
