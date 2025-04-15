import {
  postfixTokenClass,
  TokenClassConsts,
  vsPlusTheme,
} from "monaco-sql-languages";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
/**
 * MONACO THEME
 */
import "monaco-sql-languages/esm/languages/pgsql/pgsql.contribution";

loader.config({ monaco });
const historyTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [{ token: "", foreground: "59595E", fontStyle: "italic" }],
  colors: {
    "editor.border": "0px", // No border
    "editor.background": "#00000000", // Transparent background
    "editor.lineHighlightBackground": "#00000000", // Transparent line highlight
    "editorGutter.background": "#00000000", // Transparent gutter
    "editorLineNumber.foreground": "#ffffff80", // Semi-transparent white for line numbers,
    "monaco-editor-background": "#00000000",
    "editor.paddingLeft": "0px",
    "monaco-editor-outline": "none",
  },
};
monaco.editor.defineTheme("history", historyTheme);
vsPlusTheme.darkThemeData.colors = {
  ...vsPlusTheme.darkThemeData.colors,
  "editor.border": "0px", // No border
  "editor.background": "#00000000", // Transparent background
  "editor.lineHighlightBackground": "#00000000", // Transparent line highlight
  "editorGutter.background": "#00000000", // Transparent gutter
  "editorLineNumber.foreground": "#ffffff80", // Semi-transparent white for line numbers,
  "monaco-editor-background": "#00000000",
  "editor.paddingLeft": "0px",
  "monaco-editor-outline": "none",

  // Widget style
  "editorFindWidget.background": "#151519", // Dark background
  "editorSuggestWidget.background": "#151519", // Dark background
  "editorSuggestWidget.border": "#27272a", // Border color
  "editorSuggestWidget.foreground": "#d4d4d4", // Foreground (text) color
  "editorSuggestWidget.selectedBackground": "#2c2c2c", // Background color of the selected item
  "editorSuggestWidget.selectedForeground": "#ffffff", // Foreground of the selected item
  "editorSuggestWidget.highlightForeground": "#22c55e", // Color of the highlighted text
  "editorSuggestWidget.focusHighlightForeground": "#22c55e",
  "editorSuggestWidget.padding": "4px",
};
vsPlusTheme.darkThemeData.rules = [
  {
    token: postfixTokenClass(TokenClassConsts.IDENTIFIER),
    foreground: "f1f5f9",
  }, // slate-100
  {
    token: postfixTokenClass(TokenClassConsts.IDENTIFIER_QUOTE),
    foreground: "f1f5f9",
  }, // slate-100
  {
    token: postfixTokenClass(TokenClassConsts.VARIABLE),
    foreground: "e2e8f0",
  }, // slate-200
  // (Functions)
  {
    token: postfixTokenClass(TokenClassConsts.PREDEFINED),
    foreground: "c084fc", // purple-400
  },
  {
    token: postfixTokenClass(TokenClassConsts.OPERATOR_KEYWORD),
    foreground: "60a5fa",
  }, // blue-400
  {
    token: postfixTokenClass(TokenClassConsts.OPERATOR),
    foreground: "60a5fa",
  }, // blue-400
  { token: postfixTokenClass(TokenClassConsts.STRING), foreground: "34d399" }, // green-400
  {
    token: postfixTokenClass(TokenClassConsts.STRING_DOUBLE),
    foreground: "34d399",
  }, // green-400
  {
    token: postfixTokenClass(TokenClassConsts.STRING_ESCAPE),
    foreground: "34d399",
  }, // emerald-400
];
monaco.editor.defineTheme("sql-dark", vsPlusTheme.darkThemeData);
monaco.editor.setTheme("sql-dark");
