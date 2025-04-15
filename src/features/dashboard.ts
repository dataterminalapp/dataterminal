import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";

export interface Dashboard {
  viewsIds: Array<string>;
  id: string;
  name?: string;
}

interface State {
  ids: string[];
  entities: Record<string, Dashboard>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    dashboardAdded: {
      reducer: (state, action: PayloadAction<Dashboard>) => {
        state.ids.push(action.payload.id);
        state.entities[action.payload.id] = action.payload;
      },
      prepare: () => {
        return {
          payload: {
            id: nanoid(),
            viewsIds: [],
            name: "Dashboard",
          },
        };
      },
    },
    dashboardRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.ids = state.ids.filter((x) => x !== action.payload.id);
    },
    viewAdded: (
      state,
      action: PayloadAction<{ id: string; viewId: string }>
    ) => {
      state.entities[action.payload.id].viewsIds.push(action.payload.viewId);
    },
  },
});

// Action creators
export const { dashboardAdded, dashboardRemoved } = dashboardSlice.actions;

export const { reducer } = dashboardSlice;
