import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import webpack from "webpack";
import dotenv from "dotenv";
dotenv.config();

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: "webpack-infrastructure",
  }),
  new MonacoWebpackPlugin({
    features: [],
    languages: [],
    customLanguages: [
      {
        label: "pgsql",
        entry: "monaco-sql-languages/esm/languages/pgsql/pgsql.contribution",
        worker: {
          id: "/esm/languages/pgsql/",
          entry: "monaco-sql-languages/esm/languages/pgsql/pgsql.worker",
        },
      },
    ],
  }),
  new webpack.ProvidePlugin({
    Buffer: ["buffer", "Buffer"],
  }),
  new webpack.DefinePlugin({
    "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN),
  }),
];
