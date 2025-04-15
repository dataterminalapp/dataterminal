import { ClientResult } from "@/services/local/types";
import { APIResponse } from "@/services/types";
import { APIError, APIErrorJSON } from "../services/error";
import {
  createAsyncThunk,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import { IPosition } from "monaco-editor";
import { getCurrentSearchPath } from "@/lib/utils";

export const DEFAULT_PANEL_SIZE = 55;

export type Layout = "Terminal" | "IDE" | "Notebook";
export interface Panel {
  id: string;
  resultIds: Array<string>;
  loading: boolean;
  layout: Layout;
  historyIndex?: number;
  input?: string;
  cursorPosition?: IPosition;
  queriesSelected?: number;
  charactersSelected?: number;
  transactionId?: string;
  analyzeMode: boolean;
  limit: boolean;
  chart?: {
    resultId: string;
    open: boolean;
  };
  panelSize: number;
  searchPath?: Array<string>;
}

interface State {
  ids: string[];
  entities: Record<string, Panel>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

export const panelsSlice = createSlice({
  name: "panels",
  initialState,
  reducers: {
    panelRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.ids = state.ids.filter((x) => x !== action.payload.id);
      delete state.entities[action.payload.id];
    },
    multiplePanelsRemoved: (
      state,
      action: PayloadAction<{ ids: Array<string> }>
    ) => {
      state.ids = state.ids.filter((x) => !action.payload.ids.includes(x));
      action.payload.ids.forEach((id) => delete state.entities[id]);
    },
    panelAdded: {
      reducer: (state, action: PayloadAction<Panel>) => {
        state.ids.push(action.payload.id);
        state.entities[action.payload.id] = action.payload;
      },
      prepare: ({ layout, limit }: { layout: Layout; limit: boolean }) => {
        return {
          payload: {
            id: nanoid(),
            resultIds: [],
            loading: false,
            layout,
            analyzeMode: false,
            limit,
            panelSize: DEFAULT_PANEL_SIZE,
          },
        };
      },
    },
    initialPanelAdded: {
      reducer: (state, action: PayloadAction<Panel>) => {
        if (state.ids.length === 0) {
          state.ids.push(action.payload.id);
          state.entities[action.payload.id] = action.payload;
        }
      },
      prepare: ({ layout, limit }: { layout: Layout; limit: boolean }) => {
        return {
          payload: {
            id: nanoid(),
            resultIds: [],
            loading: false,
            layout,
            analyzeMode: false,
            limit,
            panelSize: DEFAULT_PANEL_SIZE,
          },
        };
      },
    },
    resultAdded: (
      state,
      action: PayloadAction<{ panelId: string; resultId: string }>
    ) => {
      const { panelId, resultId } = action.payload;
      const entity = state.entities[panelId];
      if (!entity) {
        console.warn("Entity to add result does not exist: ", panelId);
        return;
      }
      entity.resultIds.push(resultId);
    },
    resultRemoved: (
      state,
      action: PayloadAction<{ panelId: string; resultId: string }>
    ) => {
      const { panelId, resultId } = action.payload;
      const entity = state.entities[panelId];
      if (!entity) {
        console.warn("Panel to remove result does not exist: ", panelId);
        return;
      }
      entity.resultIds = entity.resultIds.filter((x) => x !== resultId);
    },
    queryStarted: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].loading = true;
    },
    queryFinished: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].loading = false;
    },
    historyIndexIncreased: (state, action: PayloadAction<{ id: string }>) => {
      const index = state.entities[action.payload.id].historyIndex;
      if (typeof index === "number") {
        if (index < state.entities[action.payload.id].resultIds.length - 1) {
          state.entities[action.payload.id].historyIndex = index + 1;
        }
      } else {
        if (state.entities[action.payload.id].resultIds.length > 0) {
          state.entities[action.payload.id].historyIndex = 0;
        }
      }
    },
    historyIndexDecreased: (state, action: PayloadAction<{ id: string }>) => {
      const index = state.entities[action.payload.id].historyIndex;
      if (typeof index === "number") {
        if (index === 0) {
          state.entities[action.payload.id].historyIndex = undefined;
        } else {
          state.entities[action.payload.id].historyIndex = index - 1;
        }
      }
    },
    historyIndexCleared: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].historyIndex = undefined;
    },
    inputUpdated: (
      state,
      action: PayloadAction<{ id: string; input?: string }>
    ) => {
      // It is necessary to use input as a string and not undefined.
      // Otherwise the editor value will not update if it is undefined and previously had a value.
      state.entities[action.payload.id].input = action.payload.input;
    },
    layoutUpdated: (
      state,
      action: PayloadAction<{ id: string; layout: Layout }>
    ) => {
      state.entities[action.payload.id].layout = action.payload.layout;
      state.entities[action.payload.id].historyIndex = undefined;
    },
    layoutToggled: (state, action: PayloadAction<{ id: string }>) => {
      if (state.entities[action.payload.id].layout === "Terminal") {
        state.entities[action.payload.id].layout = "IDE";
        state.entities[action.payload.id].historyIndex = undefined;
      } else if (state.entities[action.payload.id].layout === "IDE") {
        state.entities[action.payload.id].layout = "Terminal";
        state.entities[action.payload.id].historyIndex = undefined;
      }
    },
    cursorPositionUpdated: (
      state,
      action: PayloadAction<{ id: string; position: IPosition }>
    ) => {
      state.entities[action.payload.id].cursorPosition =
        action.payload.position;
    },
    transactionStarted: (
      state,
      action: PayloadAction<{ id: string; transactionId: string }>
    ) => {
      state.entities[action.payload.id].transactionId =
        action.payload.transactionId;
    },
    transactionEnded: (
      state,
      action: PayloadAction<{ id: string; position: IPosition }>
    ) => {
      state.entities[action.payload.id].transactionId = undefined;
    },
    analyzeModeToggled: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].analyzeMode =
        !state.entities[action.payload.id].analyzeMode;
    },
    limitChanged: (
      state,
      action: PayloadAction<{ id: string; limit: boolean }>
    ) => {
      state.entities[action.payload.id].limit = action.payload.limit;
    },
    queriesSelectedChanged: (
      state,
      action: PayloadAction<{ id: string; queriesSelected?: number }>
    ) => {
      state.entities[action.payload.id].queriesSelected =
        action.payload.queriesSelected;
    },
    charactersSelectedChanged: (
      state,
      action: PayloadAction<{ id: string; charactersSelected?: number }>
    ) => {
      state.entities[action.payload.id].charactersSelected =
        action.payload.charactersSelected;
    },
    chartDialogChanged: (
      state,
      action: PayloadAction<{
        id: string;
        chart?: {
          resultId: string;
          open: boolean;
        };
      }>
    ) => {
      state.entities[action.payload.id].chart = action.payload.chart;
    },
    panelSizeChanged: (
      state,
      action: PayloadAction<{
        id: string;
        size: number;
      }>
    ) => {
      state.entities[action.payload.id].panelSize = action.payload.size;
    },
    searchPathChanged: (
      state,
      action: PayloadAction<{ searchPath?: Array<string>; panelId: string }>
    ) => {
      state.entities[action.payload.panelId].searchPath =
        action.payload.searchPath;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runQuery.pending, (state, action) => {
        const { panelId } = action.meta.arg;
        state.entities[panelId].loading = true;
        if (!action.meta.arg.skipInputUpdate) {
          state.entities[panelId].input = action.meta.arg.sql;
        }
      })
      .addCase(runQuery.fulfilled, (state, action) => {
        const { panelId } = action.meta.arg;

        // We do this manually after both, the result and the analyze result are done.
        if (!state.entities[panelId].analyzeMode) {
          state.entities[panelId].loading = false;
        }
        state.entities[panelId].historyIndex = undefined;

        if (!action.meta.arg.skipInputUpdate) {
          state.entities[panelId].input = undefined;
        }
      })
      .addCase(runQuery.rejected, (state, action) => {
        const { panelId } = action.meta.arg;
        if (!state.entities[panelId].analyzeMode) {
          state.entities[panelId].loading = false;
        }
        if (!action.meta.arg.skipInputUpdate) {
          state.entities[panelId].input = undefined;
        }
      });
  },
});

export const {
  resultAdded,
  resultRemoved,
  panelAdded,
  initialPanelAdded,
  panelRemoved,
  multiplePanelsRemoved,
  queryStarted,
  queryFinished,
  historyIndexCleared,
  historyIndexDecreased,
  historyIndexIncreased,
  inputUpdated,
  layoutUpdated,
  layoutToggled,
  cursorPositionUpdated,
  transactionStarted,
  transactionEnded,
  analyzeModeToggled,
  limitChanged,
  queriesSelectedChanged,
  charactersSelectedChanged,
  chartDialogChanged,
  panelSizeChanged,
  searchPathChanged,
} = panelsSlice.actions;

export const { reducer } = panelsSlice;

interface Args {
  panelId: string;
  sql: string | undefined;
  skipInputUpdate?: boolean;
  limit?: boolean;
}

export const runQuery = createAsyncThunk<
  APIResponse<ClientResult, APIErrorJSON>,
  Args
>(
  "panels/runQuery",
  async ({
    panelId,
    sql,
    limit,
  }: {
    panelId: string;
    sql: string | undefined;
    limit?: boolean;
  }) => {
    const response: APIResponse<ClientResult, APIErrorJSON> = await (
      window as Window
    ).electronAPI.query(sql || "", undefined, panelId, limit);
    if (!sql) console.warn("SQL code is empty.");

    return response;
  }
);

export const isResultSelected = (
  state: State,
  panelId: string,
  resultId: string
) => {
  const resultIds = state.entities[panelId].resultIds;
  const historyIndex = state.entities[panelId].historyIndex;
  const focusedIndex =
    resultIds.length -
    (typeof historyIndex === "number" ? historyIndex : -1) -
    1;
  return resultIds[focusedIndex] === resultId;
};

export const setupSearchPath = createAsyncThunk<
  APIResponse<Array<string>, APIErrorJSON>,
  { panelId: string }
>("panels/setupSearchPath", async ({ panelId }: { panelId: string }) => {
  try {
    const [searchPathString] = await getCurrentSearchPath(panelId);
    const searchPath = searchPathString.split(",").map((x) => x.trim());

    return {
      data: searchPath,
    };
  } catch (err) {
    console.error("Error getting schemas: ", err);
    return {
      error: APIError.normalizeError(err, "Error fetching schemas").toJSON(),
    };
  }
});
