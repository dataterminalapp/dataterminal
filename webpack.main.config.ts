import type { Configuration } from "webpack";
import path from "path";
import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  // Put your normal webpack config below here
  module: {
    rules: [
      {
        test: /\.(jsx|tsx)$/,
        use: [
          {
            loader: path.resolve(__dirname, "reactCompilerLoader"),
            options: {
              // Custom options if necessary
            },
          },
        ],
        exclude: /node_modules/,
      },
      ...rules,
    ],
  },
  plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    alias: {
      "@/components": path.resolve(__dirname, "src/components/"),
      "@/lib": path.resolve(__dirname, "src/lib/"),
      "@/contexts": path.resolve(__dirname, "src/contexts/"),
      "@/hooks": path.resolve(__dirname, "src/hooks/"),
      "@/features": path.resolve(__dirname, "src/features/"),
    },
  },
  externals: {
    "libpg-query": "commonjs libpg-query",
  },
};
