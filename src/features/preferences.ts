import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Layout } from "./panel";
import { getExplorerDefaultSize } from "@/components/sections/explorer";
import { AppConfig } from "@/components/app";

interface State {
  connectionId?: string;
  layout: Layout;
  limit: boolean;
  explorerSize: number;
}

export const preferencesSlice = createSlice({
  name: "settings",
  initialState: {
    explorerSize: getExplorerDefaultSize(),
    layout: "Terminal",
    limit: true,
  } as State,
  reducers: {
    preferredConnectionChanged: (
      state,
      action: PayloadAction<{ id: string }>
    ) => {
      state.connectionId = action.payload.id;
    },
    preferredLayoutChanged: (
      state,
      action: PayloadAction<{ layout: Layout }>
    ) => {
      state.layout = action.payload.layout;
    },
    preferredLimitChanged: (
      state,
      action: PayloadAction<{ limit: boolean }>
    ) => {
      state.limit = action.payload.limit;
    },
    appConfigLoaded: (
      state,
      action: PayloadAction<{ appConfig: AppConfig }>
    ) => {
      state.connectionId = action.payload.appConfig.defaultConnectionId;
      state.layout = action.payload.appConfig.layout;
      state.limit = action.payload.appConfig.limit || false;
      state.explorerSize =
        action.payload.appConfig.explorerSize || getExplorerDefaultSize();
    },
  },
});

export const {
  appConfigLoaded,
  preferredConnectionChanged,
  preferredLayoutChanged,
  preferredLimitChanged,
} = preferencesSlice.actions;

export const { reducer } = preferencesSlice;
