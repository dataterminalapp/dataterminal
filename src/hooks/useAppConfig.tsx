import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppSelector } from "./useRedux";
import { APIResponse } from "@/services/types";
import { APIError } from "../services/error";
import { useToast } from "./useToast";
import { AppConfig } from "@/components/app";

/**
 * Custom hook to handle the app's config
 */
const useAppConfig = () => {
  const { toast } = useToast();
  const connectionList = useAppSelector((state) => state.connections.entities);
  const defaultConnectionId = useAppSelector(
    (state) => state.preferences.connectionId
  );
  const layout = useAppSelector((state) => state.preferences.layout);
  const limit = useAppSelector((state) => state.preferences.limit);
  const explorerSize = useAppSelector(
    (state) => state.preferences.explorerSize
  );

  const connectionListRef = useRef(Object.values(connectionList));
  const defaultConnectionIdRef = useRef(defaultConnectionId);
  const layoutRef = useRef(layout);
  const limitRef = useRef(limit);
  const explorerSizeRef = useRef(explorerSize);

  useEffect(() => {
    connectionListRef.current = Object.values(connectionList);
  }, [connectionList]);
  useEffect(() => {
    defaultConnectionIdRef.current = defaultConnectionId;
  }, [defaultConnectionId]);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);
  useEffect(() => {
    explorerSizeRef.current = explorerSize;
  }, [explorerSize]);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  /**
   * The idea about save config is the following one:
   *
   * We dispatch a change to the store, but at the same time we are calling saveConfig,
   * and during that lapse it is very possible that the refereces contain an old value
   * because the useEffect didn't run yet.
   *
   * At the same time we do not want to have the whole app config all around all the time,
   * so to avoid sending the whole config, we just send the fields that changed.
   *
   * In this way we make sure that the newest fields are updated, and we do not need to carry
   * the other app config fields all around.
   *
   */
  const saveConfig = useCallback(async (appConfig: Partial<AppConfig>) => {
    /**
     * So what's the issue here?
     *
     * It can happen the following:
     * ```
     *  if (newDefaultConnectionId) {
     *     saveConfig({ defaultConnection: newDefaultConnectionId});
     *     dispatch(defaultConnectionChanged( { id: newDefaultConnectionId }))
     *  }
     *
     *  saveConfig({ explorerSize: 35 });
     * ```
     *
     * The issue about this code flow, is that the first saveConfig will run correct,
     * but the second saveConfig will use an old value for defaultConnection,
     * because it read the value from the useEffect and again we have a sort of race condition.
     * So to avoid also this scenario we update the references here so we can do it before the useEffect.
     */
    if (appConfig.connectionList !== undefined) {
      connectionListRef.current = appConfig.connectionList;
    }

    if (appConfig.defaultConnectionId !== undefined) {
      defaultConnectionIdRef.current = appConfig.defaultConnectionId;
    }

    if (appConfig.explorerSize !== undefined) {
      explorerSizeRef.current = appConfig.explorerSize;
    }

    if (appConfig.layout !== undefined) {
      layoutRef.current = appConfig.layout;
    }

    if (appConfig.limit !== undefined) {
      limitRef.current = appConfig.limit;
    }

    try {
      const newAppConfig = {
        connectionList: Object.values(connectionListRef.current),
        defaultConnectionId: defaultConnectionIdRef.current,
        layout: layoutRef.current,
        limit: limitRef.current,
        explorerSize: explorerSizeRef.current,
        ...appConfig,
      };

      const { error }: APIResponse<boolean, Error> = await (
        window as Window
      ).electronAPI.saveAppConfig(newAppConfig);

      if (error) {
        console.error("Saving config return error: ", error);
      }
    } catch (err) {
      toast({
        title: "Error saving config",
        description: APIError.normalizeError(err, "Unknown error").message,
      });
      console.error("Error saving config: ", err);
    }
  }, []);

  const loadConfig = useCallback(async (): Promise<
    APIResponse<AppConfig | undefined, Error>
  > => {
    return await (window as Window).electronAPI.getAppConfig();
  }, []);

  return useMemo(
    () => ({
      saveConfig,
      loadConfig,
    }),
    [saveConfig, loadConfig]
  );
};

export default useAppConfig;
