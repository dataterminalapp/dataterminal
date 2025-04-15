import {
  createAsyncThunk,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import { Schema, SchemaTable, SchemaView } from "./schema";
import { ConnectionOptions } from "pg-connection-string";
import { APIResponse } from "@/services/types";
import { APIErrorJSON } from "../services/error";
import { Connection, Provider } from "./connections";

export type TabType =
  | "Results"
  | "Connections"
  | "Dashboards"
  | "Browser"
  | "Audit"
  | "Preferences";
export interface Options {
  audit?: {
    entity: SchemaTable | SchemaView;
    connection: Connection;
  };
  browser?: {
    entity?: Schema | SchemaTable | SchemaView;
    connection: Connection;
  };
  connection?: {
    isAddingOptionsManually?: boolean;
    isAddingConnection: boolean;
    newConnection?: Partial<Connection>;
    viewingConnection?: Connection;
    error?: APIErrorJSON;
  };
  panelIds: Array<string>;
}

export interface Tab {
  id: string;
  name: string;
  options: Options;
  loading: boolean;
  type: TabType;
}

interface State {
  ids: string[];
  entities: Record<string, Tab>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

const getNewTabNameByType = (type: TabType, state: State) => {
  switch (type) {
    case "Connections":
      return "Connections";
    case "Results":
      return `Tab ${state.ids.length + 1}`;
    case "Browser":
      return "Browser";
    case "Audit":
      return "Audit";
    case "Dashboards":
      return "Dashboards";
    case "Preferences":
      return "Preferences";
  }
};

export const tabsSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    tabAdded: {
      reducer: (state, action: PayloadAction<Tab>) => {
        action.payload.name = getNewTabNameByType(action.payload.type, state);
        state.ids.push(action.payload.id);
        state.entities[action.payload.id] = action.payload;
      },
      prepare: (type: TabType, options?: Partial<Options>) => ({
        payload: {
          id: nanoid(),
          options: {
            browser: options?.browser,
            panelIds: options?.panelIds || [],
          },
          loading: false,
          name: "",
          type,
        },
      }),
    },
    initialTabAdded: {
      reducer: (state, action: PayloadAction<Tab>) => {
        if (state.ids.length === 0) {
          action.payload.name = getNewTabNameByType(action.payload.type, state);
          state.ids.push(action.payload.id);
          state.entities[action.payload.id] = action.payload;
        }
      },
      prepare: (type: TabType, options: Partial<Options>) => ({
        payload: {
          id: nanoid(),
          options: {
            browser: options.browser,
            panelIds: options.panelIds || [],
          },
          loading: false,
          name: "",
          type,
        },
      }),
    },
    tabRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.ids = state.ids.filter((x) => x !== action.payload.id);
      delete state.entities[action.payload.id];
    },
    tabPanelAdded: (
      state,
      action: PayloadAction<{ tabId: string; panelId: string }>
    ) => {
      const { tabId, panelId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to add panel does not exist: ", tabId);
        return;
      }
      entity.options.panelIds.push(panelId);
    },
    tabPanelRemoved: (
      state,
      action: PayloadAction<{ tabId: string; panelId: string }>
    ) => {
      const { tabId, panelId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }
      entity.options.panelIds = entity.options.panelIds.filter(
        (x) => x !== panelId
      );
    },
    tabConnectionCreationStarted: (
      state,
      action: PayloadAction<{ id: string }>
    ) => {
      const { id: tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      const newConnection: Partial<Connection> = {
        id: nanoid(),
        name: "Postgres",
        provider: "Postgres",
      };
      if (connection) {
        connection.isAddingConnection = true;
        connection.newConnection = newConnection;
      } else {
        entity.options.connection = {
          ...entity.options.connection,
          isAddingConnection: true,
          newConnection,
        };
      }
    },
    tabConnectionCreationCanceled: (
      state,
      action: PayloadAction<{ tabId: string }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        connection.isAddingConnection = false;
        connection.newConnection = undefined;
        connection.isAddingOptionsManually = false;
      }
    },
    tabConnectionNameChanged: (
      state,
      action: PayloadAction<{ tabId: string; name: string }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        const { newConnection } = connection;

        if (!newConnection) {
          console.warn("New connection does not exist: ", tabId);
          return;
        }

        newConnection.name = action.payload.name;
      }
    },
    tabConnectionStringChanged: (
      state,
      action: PayloadAction<{ tabId: string; connectionString: string }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        const { newConnection } = connection;

        if (!newConnection) {
          console.warn("New connection does not exist: ", tabId);
          return;
        }

        newConnection.connectionString = action.payload.connectionString;
      }
    },
    tabConnectionOptionsChanged: (
      state,
      action: PayloadAction<{
        tabId: string;
        connectionOptions: ConnectionOptions;
      }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        const { newConnection } = connection;

        if (!newConnection) {
          console.warn("New connection does not exist: ", tabId);
          return;
        }

        newConnection.connectionOptions = action.payload.connectionOptions;

        const { host } = action.payload.connectionOptions;
        if (host) {
          const provider = identifyProvider(host);
          newConnection.provider = provider || "Postgres";
        }
      }
    },
    tabConnectionValidationFailed: (
      state,
      action: PayloadAction<{
        tabId: string;
        error: APIErrorJSON;
      }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        connection.error = action.payload.error;
      }
    },
    tabConnectionCollapsibleChanged: (
      state,
      action: PayloadAction<{
        tabId: string;
        open: boolean;
      }>
    ) => {
      const { tabId } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      const connection = entity.options.connection;
      if (connection) {
        connection.isAddingOptionsManually = action.payload.open;
      }
    },
    tabBrowserOptionsChanges: (
      state,
      action: PayloadAction<{
        tabId: string;
        schemaEntity: Schema | SchemaTable | SchemaView;
      }>
    ) => {
      const { tabId, schemaEntity } = action.payload;
      const entity = state.entities[tabId];
      if (!entity) {
        console.warn("Tab to remove panel does not exist: ", tabId);
        return;
      }

      if (entity.options.browser) {
        entity.options.browser.entity = schemaEntity;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(testConnectionString.pending, (state, action) => {
        const { tabId } = action.meta.arg;
        state.entities[tabId].loading = true;
      })
      .addCase(testConnectionString.fulfilled, (state, action) => {
        const { tabId } = action.meta.arg;
        state.entities[tabId].loading = false;
      })
      .addCase(testConnectionString.rejected, (state, action) => {
        const { tabId } = action.meta.arg;
        state.entities[tabId].loading = false;
      });
  },
});

export const testConnectionString = createAsyncThunk<
  APIResponse<boolean, APIErrorJSON>,
  {
    tabId: string;
    connectionString: string;
  }
>(
  "tabs/testConnectionString",
  async ({ connectionString }: { tabId: string; connectionString: string }) => {
    const response: APIResponse<boolean, APIErrorJSON> = await (
      window as Window
    ).electronAPI.testConnectionString(connectionString);

    return response;
  }
);

const identifyProvider = (connectionString: string): Provider | undefined => {
  if (connectionString.includes("neon")) return "Neon";
  if (connectionString.includes("supabase")) return "Supabase";
  // if (connectionString.includes("yugabyte")) return "Yugabyte";
  if (connectionString.includes("timescale")) return "Timescale";
  // if (connectionString.includes("quest")) return "Quest";
  if (connectionString.includes("rds.amazonaws.com")) return "AWS";
  if (connectionString.includes("cloud.google.com")) return "GCP";
  if (connectionString.includes("azure")) return "Azure";
  if (connectionString.includes("postgres")) return "Postgres";
  return undefined;
};

export const {
  tabAdded,
  initialTabAdded,
  tabRemoved,
  tabPanelAdded,
  tabPanelRemoved,
  tabConnectionCreationStarted,
  tabConnectionCreationCanceled,
  tabConnectionStringChanged,
  tabConnectionOptionsChanged,
  tabConnectionValidationFailed,
  tabConnectionNameChanged,
  tabConnectionCollapsibleChanged,
  tabBrowserOptionsChanges,
} = tabsSlice.actions;

export const { reducer } = tabsSlice;
