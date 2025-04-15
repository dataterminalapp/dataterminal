import { IpcMainInvokeEvent, safeStorage } from "electron";
import Store from "electron-store";
import { APIResponse } from "./types";
import { APIError } from "./error";
import { AppConfig } from "@/components/app";
import log from "electron-log/main";
import { machineIdSync } from "node-machine-id";

const STORE_CONFIG_FIELD = "config";
const ENCRYPTION_KEY_ROOT = "228d56de-b5ae-4ca3-92ec-573a01dd0b27";

export const getStoreConfigField = () => {
  return machineIdSync() + STORE_CONFIG_FIELD;
};

export const getStore = () => {
  return new Store({
    encryptionKey: ENCRYPTION_KEY_ROOT,
  });
};

export const saveAppConfig = (
  event: IpcMainInvokeEvent,
  config: AppConfig
): APIResponse<boolean, Error> => {
  try {
    log.info("Saving app config.");
    const encryptedConfig = safeStorage.encryptString(JSON.stringify(config));
    const store = getStore();
    store.set(getStoreConfigField(), encryptedConfig);

    return {
      data: true,
    };
  } catch (err) {
    console.error("Error writing app config: ", err);
    return {
      error: APIError.normalizeError(err, "Error writing app config."),
    };
  }
};

export const getAppConfig = (): APIResponse<
  Partial<AppConfig> | undefined,
  Error
> => {
  try {
    const store = getStore();
    log.info("Getting app config.");
    const appEncryptedConfig = store.get(getStoreConfigField());
    if (appEncryptedConfig) {
      const buffer = Buffer.from(appEncryptedConfig as string, "utf-8");
      const appDecryptedConfigString = safeStorage.decryptString(
        buffer
      ) as unknown as string;
      const appConfig = JSON.parse(appDecryptedConfigString);
      return {
        data: appConfig,
      };
    } else {
      log.info("Empty encrypted config.");
      return {
        data: undefined,
      };
    }
  } catch (err) {
    console.error("Error getting app config: ", err);
    return {
      error: APIError.normalizeError(err, "Error getting app config."),
    };
  }
};
