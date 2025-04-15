import { ChartTheme } from "@/components/sections/chart/themeButton";
import { createSlice, Draft, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { FieldDef } from "pg";

export interface Options {
  xAxis: FieldDef | undefined;
  yAxis: FieldDef | undefined;
  groupBy: FieldDef | undefined;
  theme: ChartTheme;
}

interface Visualization {
  id: string;
  resultId: string;
  options: Options;
}

interface State {
  ids: string[];
  entities: Record<string, Visualization>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

export const viewSlice = createSlice({
  name: "visualization",
  initialState,
  reducers: {
    visualizationAdded: {
      reducer: (state, action: PayloadAction<Draft<Visualization>>) => {
        state.ids.push(action.payload.id);
        state.entities[action.payload.id] = action.payload;
      },
      prepare: ({
        resultId,
        sql,
        options,
      }: {
        resultId: string;
        sql: string;
        options: Options;
      }) => {
        return {
          payload: {
            id: nanoid(),
            resultId,
            sql,
            options,
          } as Draft<Visualization>,
        };
      },
    },
    visualizationRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.ids = state.ids.filter((x) => x !== action.payload.id);
    },
    visualizationUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        options: Options;
      }>
    ) => {
      state.entities[action.payload.id].options = action.payload.options;
    },
  },
});

// Action creators
export const {
  visualizationAdded,
  visualizationRemoved,
  visualizationUpdated,
} = viewSlice.actions;

export const { reducer } = viewSlice;
