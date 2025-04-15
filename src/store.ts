import { configureStore } from "@reduxjs/toolkit";
import { reducer as resultsSliceReducer } from "./features/result";
import { Layout, reducer as panelsSliceReducer } from "./features/panel";
import { reducer as tabsSliceReducer } from "./features/tabs";
import { reducer as focusSliceReducer } from "./features/focus";
import { reducer as explorerSliceReducer } from "./features/explorer";
import { reducer as sidebarSliceReducer } from "./features/sidebar";
import { reducer as schemaSliceReducer } from "./features/schema";
import { reducer as transactionsSliceReducer } from "./features/transactions";
import { reducer as globalSliceReducer } from "./features/global";
import { reducer as dashboardSliceReducer } from "./features/dashboard";
import { reducer as preferencesSliceReducer } from "./features/preferences";
import { reducer as connectionsSliceReducer } from "./features/connections";
import { reducer as workspaceSliceReducer } from "./features/workspace";
import { getExplorerDefaultSize } from "./components/sections/explorer";

export const store = configureStore({
  preloadedState: {
    explorer: {
      enabled: false,
      size: getExplorerDefaultSize(),
    },
    focus: {
      tabId: "",
      panelId: "",
      resultId: "",
      currentFocus: undefined,
    },
    panels: {
      entities: {},
      ids: [],
    },
    tabs: {
      entities: {},
      ids: [],
    },
    dashboards: {
      entities: {},
      ids: [],
    },
    preferences: {
      explorerSize: getExplorerDefaultSize(),
      layout: "Terminal" as Layout,
      limit: true,
    },
    connections: {
      entities: {},
      ids: [],
    },
    schema: {
      schemas: { ids: [], entities: {} },
      tables: { ids: [], entities: {} },
      columns: { ids: [], entities: {} },
      views: { ids: [], entities: {} },
      functions: { ids: [], entities: {} },
      userFunctions: { ids: [], entities: {} },
      procedures: { ids: [], entities: {} },
      relationships: {
        byParent: {},
        byChild: {},
      },
      entities: {},
      loading: true,
    },
  },
  reducer: {
    results: resultsSliceReducer,
    panels: panelsSliceReducer,
    tabs: tabsSliceReducer,
    focus: focusSliceReducer,
    explorer: explorerSliceReducer,
    sidebar: sidebarSliceReducer,
    schema: schemaSliceReducer,
    transactions: transactionsSliceReducer,
    global: globalSliceReducer,
    dashboards: dashboardSliceReducer,
    preferences: preferencesSliceReducer,
    connections: connectionsSliceReducer,
    workspace: workspaceSliceReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
