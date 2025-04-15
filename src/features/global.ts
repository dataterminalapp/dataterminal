import { Auth } from "@/services/auth";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface State {
  openSearch: boolean;
  openManageConnections: boolean;
  requiresAuth?: {
    description: string;
  };
  auth?: Auth;
}

const initialState: State = {
  openSearch: false,
  openManageConnections: false,
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    searchOpenChanged: (state, action: PayloadAction<boolean>) => {
      if (action.payload === true) {
        state.openManageConnections = false;
        state.openSearch = true;
      } else {
        state.openSearch = false;
      }
    },
    manageConnectionsOpened: (state) => {
      state.openManageConnections = true;
      state.openSearch = false;
    },
    manageConnectionsClosed: (state) => {
      state.openManageConnections = false;
    },
    requiresAuthDialogClosed: (state) => {
      state.requiresAuth = undefined;
    },
    requiresAuthDialogOpened: (
      state,
      action: PayloadAction<{ description: string }>
    ) => {
      state.requiresAuth = action.payload;
    },
    authLoaded: (state, action: PayloadAction<{ auth: Auth }>) => {
      state.auth = action.payload.auth;
    },
  },
});

export const {
  searchOpenChanged,
  manageConnectionsOpened,
  manageConnectionsClosed,
  requiresAuthDialogClosed,
  requiresAuthDialogOpened,
  authLoaded,
} = globalSlice.actions;

export const { reducer } = globalSlice;
