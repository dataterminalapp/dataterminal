import type { Configuration } from "webpack";
import path from "path";

import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

rules.push({
  test: /\.css$/,
  use: [
    { loader: "style-loader" },
    { loader: "css-loader" },
    { loader: "postcss-loader" },
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
    fallback: {
      buffer: require.resolve("buffer"),
    },
    alias: {
      "@/components": path.resolve(__dirname, "src/components/"),
      "@/lib": path.resolve(__dirname, "src/lib/"),
      "@/contexts": path.resolve(__dirname, "src/contexts/"),
      "@/hooks": path.resolve(__dirname, "src/hooks/"),
      "@/features": path.resolve(__dirname, "src/features/"),
      "@glideapps/glide-data-grid$": `${__dirname}/node_modules/@glideapps/glide-data-grid/dist/esm/index.js`,
    },
  },
};
