// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginReactCompiler from 'eslint-plugin-react-compiler';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);