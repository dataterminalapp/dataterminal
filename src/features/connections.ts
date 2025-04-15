import { AppConfig } from "@/components/app";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ConnectionOptions } from "pg-connection-string";

export interface ConnectionsConfig {
  connectionList: Array<Connection>;
  connectionId: string;
  defaultConnectionId: string;
}

export type Provider =
  | "Neon"
  | "Supabase"
  | "AWS"
  | "GCP"
  | "Azure"
  | "Yugabyte"
  | "Timescale"
  | "Quest"
  | "Postgres";

export interface Connection {
  id: string;
  name: string;
  provider?: Provider;
  connectionString: string;
  connectionOptions?: ConnectionOptions;
}

interface State {
  ids: Array<string>;
  entities: Record<string, Connection>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

export const explorerSlice = createSlice({
  name: "explorer",
  initialState,
  reducers: {
    connectionAdded: (
      state,
      action: PayloadAction<{
        connection: Connection;
      }>
    ) => {
      state.ids.push(action.payload.connection.id);
      state.entities[action.payload.connection.id] = action.payload.connection;
    },
    connectionRemoved: (
      state,
      action: PayloadAction<{
        id: string;
      }>
    ) => {
      state.ids = state.ids.filter((x) => x !== action.payload.id);
      delete state.entities[action.payload.id];
    },
    updateConnectionName: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
      }>
    ) => {
      state.entities[action.payload.id].name = action.payload.name;
    },
    appConfigLoaded: (
      state,
      action: PayloadAction<{ appConfig: AppConfig }>
    ) => {
      action.payload.appConfig.connectionList.forEach((connection) => {
        state.entities[connection.id] = connection;
      });
      // I do it outside the forEach and without using push, to make it unique for each load.
      // Otherwise, if the useEffect runs two times, we have duplicated connections.
      state.ids = action.payload.appConfig.connectionList.map((x) => x.id);
    },
  },
});

export const {
  appConfigLoaded,
  connectionAdded,
  connectionRemoved,
  updateConnectionName,
} = explorerSlice.actions;
export const { reducer } = explorerSlice;
