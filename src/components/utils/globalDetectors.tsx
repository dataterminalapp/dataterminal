import { focusChanged } from "@/features/focus";
import { searchOpenChanged, manageConnectionsOpened } from "@/features/global";
import { layoutToggled, panelAdded } from "@/features/panel";
import { tabAdded } from "@/features/tabs";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { useCallback, useEffect, useMemo } from "react";
import { handleRemoveTab } from "../layout/tabs";
import DetectBoardKey from "../utils/shortcuts/detectBoardKey";
import buildCompletionService, {
  CompletionServiceBuilder,
} from "../sections/code/completionService";
import { LanguageIdEnum, setupLanguageFeatures } from "monaco-sql-languages";
import "../sections/code/theme";

/**
 * A side component is used hear to avoid re-rendering on the main app when panelId changes,
 * but we can still capture the board key at the top level.
 * @returns
 */
const GlobalDetectors = () => {
  const tabs = useAppSelector((state) => state.tabs.entities);
  const tabIds = useAppSelector((state) => state.tabs.ids);
  const panelId = useAppSelector((state) => state.focus.panelId);
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const tabId = useAppSelector(
    (state) => state.focus.tabId || state.tabs.entities[0]?.id
  );
  const currentConnectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connection = useAppSelector(
    (state) =>
      currentConnectionId && state.connections.entities[currentConnectionId]
  );
  const panelIds = useAppSelector((state) =>
    tabId ? state.tabs.entities[tabId]?.options.panelIds : undefined
  );
  const currentSchemaName = useAppSelector(
    (state) => state.workspace.schema.current
  );
  const schemas = useAppSelector((state) =>
    currentSchemaName ? state.schema.schemas.entities : undefined
  );
  const searchPath = useAppSelector((state) => state.workspace.searchPath);
  const preferedLayout = useAppSelector((state) => state.preferences.layout);
  const preferedLimit = useAppSelector((state) => state.preferences.limit);

  /**
   * Memos
   */
  const completionService = useMemo(() => {
    return new CompletionServiceBuilder();
  }, []);

  const dispatch = useAppDispatch();
  const onLayoutChange = useCallback(() => {
    if (panelId) {
      dispatch(
        layoutToggled({
          id: panelId,
        })
      );
    }
  }, [panelId]);

  const onGlobalSearchOpened = useCallback(() => {
    dispatch(searchOpenChanged(true));
  }, []);

  const onSchemaBrowserOpened = useCallback(() => {
    const schema =
      schemas &&
      Object.values(schemas).find((x) => searchPath?.includes(x.name));
    if (connection && schema) {
      const panelAddedResult = dispatch(
        panelAdded({ layout: "Terminal", limit: false })
      );
      const tabAddedResult = dispatch(
        tabAdded("Browser", {
          browser: {
            connection,
            entity: schema,
          },
          panelIds: [panelAddedResult.payload.id],
        })
      );
      dispatch(
        focusChanged({
          tabId: tabAddedResult.payload.id,
          panelId: tabAddedResult.payload.options.panelIds[0],
        })
      );
    }
    dispatch(searchOpenChanged(false));
  }, [dispatch, connection, schemas, searchPath]);

  const onNewTabKeyPress = useCallback(() => {
    const panelAddedResult = dispatch(
      panelAdded({ layout: preferedLayout, limit: preferedLimit })
    );
    const tabAddedResult = dispatch(
      tabAdded("Results", { panelIds: [panelAddedResult.payload.id] })
    );
    dispatch(
      focusChanged({
        tabId: tabAddedResult.payload.id,
        panelId: panelAddedResult.payload.id,
      })
    );
  }, [dispatch, tabs, tabAdded, preferedLayout, preferedLimit]);

  const onCloseTabKeyPress = useCallback(() => {
    handleRemoveTab({
      dispatch,
      panelIds: panelIds || [],
      tabId,
      currentTabId,
      tabIds,
      tabs,
    });
  }, [dispatch, panelIds, tabIds, tabId, currentTabId, tabs]);

  const handleOnManageConnectionsKeyPress = useCallback(() => {
    dispatch(manageConnectionsOpened());
  }, [dispatch]);

  useEffect(() => {
    setupLanguageFeatures(LanguageIdEnum.PG, {
      completionItems: {
        completionService: buildCompletionService(completionService),
      },
      diagnostics: false,
    });
  }, [completionService]);

  useEffect(
    () =>
      completionService.updateSchemas(schemas ? Object.values(schemas) : []),
    [completionService, schemas]
  );

  useEffect(
    () => completionService.updateSearchPath(new Set(searchPath)),
    [completionService, searchPath]
  );

  return (
    <>
      <DetectBoardKey
        meta
        boardKey="e"
        preventDefault
        stopPropagation
        onKeyPress={onLayoutChange}
      />
      <DetectBoardKey
        meta
        boardKey="p"
        preventDefault
        stopPropagation
        onKeyPress={onGlobalSearchOpened}
      />
      <DetectBoardKey
        meta
        shift
        boardKey="p"
        preventDefault
        stopPropagation
        onKeyPress={onSchemaBrowserOpened}
      />
      <DetectBoardKey
        meta
        boardKey="t"
        preventDefault
        stopPropagation
        onKeyPress={onNewTabKeyPress}
      />
      <DetectBoardKey
        meta
        boardKey="w"
        preventDefault
        stopPropagation
        onKeyPress={onCloseTabKeyPress}
      />
      <DetectBoardKey
        meta
        boardKey="o"
        onKeyPress={handleOnManageConnectionsKeyPress}
      />
    </>
  );
};

export default GlobalDetectors;
