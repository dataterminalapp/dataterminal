import type {
  ForgeConfig,
  ForgeConfigPlugin,
} from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerZIP } from "@electron-forge/maker-zip";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import dotenv from "dotenv";
dotenv.config();

export const BINARIES_BUCKET = process.env["BINARIES_BUCKET"];
export const BINARIES_UPDATE_MANIFEST_URL = `${BINARIES_BUCKET}/data-terminal/${process.platform}/${process.arch}`;
export const build = process.env.FORGE_COMMAND !== "start";
export const KEYCHAIN_PROFILE = process.env["KEYCHAIN_PROFILE"];

if (build && typeof KEYCHAIN_PROFILE !== "string") {
  throw new Error("Keychain profile is missing.");
}

const plugins: ForgeConfigPlugin[] = [];

if (build) {
  plugins.push({
    name: "@electron-forge/plugin-auto-unpack-natives",
    config: {},
  });
}

plugins.push(
  new WebpackPlugin({
    mainConfig,
    renderer: {
      config: rendererConfig,
      entryPoints: [
        {
          html: "./src/index.html",
          js: "./src/renderer.ts",
          name: "main_window",
          preload: {
            js: "./src/preload.ts",
          },
        },
      ],
    },
  })
);

if (build) {
  plugins.push({
    name: "@timfish/forge-externals-plugin",
    config: {
      externals: ["libpg-query"],
      includeDeps: true,
    },
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    osxSign: {},
    osxNotarize: {
      keychainProfile: KEYCHAIN_PROFILE as string,
    },
    asar: {
      unpack: "**/node_modules/libpg-query/**/*",
    },
    protocols: [
      {
        name: "Data Terminal",
        schemes: ["data-terminal"],
      },
    ],
    icon: "images/icon",
  },
  rebuildConfig: {
    extraModules: ["libpg-query"],
  },
  publishers: [
    {
      name: "@electron-forge/publisher-s3",
      config: {
        bucket: "dataterminal-binaries",
        public: true,
      },
    },
  ],
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
        icon: "images/icon.icns",
      },
    },
    new MakerSquirrel({
      remoteReleases: BINARIES_BUCKET,
    }),
    new MakerZIP({
      macUpdateManifestBaseUrl: BINARIES_UPDATE_MANIFEST_URL,
    }),
    new MakerRpm({}),
    new MakerDeb({
      options: {
        name: "data-terminal",
        homepage: "www.dataterminal.app",
        categories: ["Development"],
        productName: "Data Terminal",
        mimeType: ["x-scheme-handler/data-terminal"],
      },
    }),
  ],
  plugins,
};

export default config;
