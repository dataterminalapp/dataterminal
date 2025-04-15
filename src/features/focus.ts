import { FocusState } from "@/contexts/focus";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Focus {
  tabId: string;
  panelId: string;
  resultId: string;
}

interface State {
  tabId: string | undefined;
  panelId: string | undefined;
  resultId: string | undefined;
  currentFocus: FocusState | undefined;
}

const initialState: State = {
  tabId: "",
  panelId: "",
  resultId: "",
  currentFocus: undefined,
};

export const focusSlice = createSlice({
  name: "focus",
  initialState,
  reducers: {
    focusChanged: (
      state,
      action: PayloadAction<{
        tabId?: string;
        panelId?: string;
        resultId?: string;
      }>
    ) => {
      state.tabId = action.payload.tabId;
      state.panelId = action.payload.panelId;
      state.resultId = action.payload.resultId;
    },
    currentFocusUpdated: (state, action: PayloadAction<FocusState>) => {
      state.currentFocus = action.payload;
    },
  },
});

export const { focusChanged, currentFocusUpdated } = focusSlice.actions;

export const { reducer } = focusSlice;
