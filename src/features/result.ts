import { DEFAULT_ROWS_PER_PAGE } from "@/components/table";
import { ClientResult } from "@/services/local/types";
import { APIErrorJSON } from "../services/error";
import { createSlice, Draft, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { ChartTheme } from "@/components/sections/chart/themeButton";
import { ChartTypeRegistry } from "chart.js";
import {
  AutoGridColumn,
  GridColumn,
} from "@glideapps/glide-data-grid/dist/dts";

export type Data = ClientResult | undefined;

interface ChartOptions {
  xAxisIndex: number | undefined;
  yAxisIndex: number | undefined;
  groupByIndex: number | undefined;
  theme: ChartTheme;
  type: keyof ChartTypeRegistry;

  // Needed for the builder/toolbar.
  sheetOpen?: boolean;
  axisActive?: string;
}

interface UIState {
  columns?: Array<GridColumn | AutoGridColumn>;
  searchFilter?: string;
  searchFilterEnabled: boolean;
  regionVisible: number;
  sort?: {
    type: "desc" | "asc";
    column: number;
  };
  fadeEnabled: boolean;
  estimatedHeight: number;
  pageIndex: number;
  allRowSelected?: boolean;
  rowSelection?: number[] | undefined;
  rowSelectionLength?: number | undefined;
  selectedCells: Record<string, string>;

  planTypeSelected?: string;
  planTypeSubIndexSelected?: number;
  planFadeEnabled: boolean;

  chart: ChartOptions;
}

export interface Result {
  id: string;
  panelId: string;
  data?: Data;
  filteredData?: Data;
  editedData?: Data;
  edits?: Record<number, Record<number, unknown>>;
  error?: APIErrorJSON;
  sql: string;
  uiState: UIState;
  timing: number | undefined;
  transactionId?: string;
  analyze?: ClientResult<Array<string>>;
}

interface State {
  ids: string[];
  entities: Record<string, Result>;
  idsByPanelId: Record<string, Record<string, true>>;
}

const initialState: State = {
  ids: [],
  entities: {},
  idsByPanelId: {},
};

const getEntityById = (
  state: Draft<State>,
  action: PayloadAction<{ id: string }>
) => {
  const { id } = action.payload;
  const entity = state.entities[id];
  return entity;
};

const heightEstimator = (result: Omit<Result, "id" | "uiState">) => {
  const base = 93;
  const severity = result.error?.databaseError?.severity;
  if (severity === "ERROR" || severity === "PANIC" || severity === "FATAL") {
    return 92;
  }
  const sqlLines = result.sql.split("\n").length * 16;
  const tableHeight = Math.min(result.data?.rows.length || 0.5, 10) * 28;

  return base + sqlLines + tableHeight;
};

const findXAxis = (data?: Data): number | undefined => {
  if (!data?.fields?.length) {
    return undefined;
  }

  // PostgreSQL data type OIDs for common types
  const DATA_TYPES = {
    TIMESTAMP: {
      TIMESTAMP: 1114, // timestamp
      TIMESTAMPTZ: 1184, // timestamp with time zone
      DATE: 1082, // date
      TIME: 1083, // time
      TIMETZ: 1266, // time with time zone
    },
    STRING: {
      TEXT: 25, // text
      VARCHAR: 1043, // character varying
      CHAR: 18, // character
      NAME: 19, // name
    },
  };

  // Common patterns for date/time column names
  const TIME_RELATED_PATTERNS = [
    /^date$/i,
    /^time$/i,
    /^timestamp$/i,
    /^created[_]?at$/i,
    /^updated[_]?at$/i,
    /^datetime$/i,
    /^period$/i,
    /^year$/i,
    /^month$/i,
  ];

  // Helper to check if a field is time-related by name
  const isTimeRelatedField = (fieldName: string): boolean =>
    TIME_RELATED_PATTERNS.some((pattern) => pattern.test(fieldName));

  // Create sets for efficient type checking
  const TIMESTAMP_TYPES = new Set([
    DATA_TYPES.TIMESTAMP.TIMESTAMP,
    DATA_TYPES.TIMESTAMP.TIMESTAMPTZ,
    DATA_TYPES.TIMESTAMP.DATE,
    DATA_TYPES.TIMESTAMP.TIME,
    DATA_TYPES.TIMESTAMP.TIMETZ,
  ]);

  const STRING_TYPES = new Set([
    DATA_TYPES.STRING.TEXT,
    DATA_TYPES.STRING.VARCHAR,
    DATA_TYPES.STRING.CHAR,
    DATA_TYPES.STRING.NAME,
  ]);

  // Selection priority:
  // 1. Time-related fields with matching name pattern
  // 2. Any timestamp/date field
  // 3. String fields with time-related names
  // 4. Any string field
  // 5. First available field as fallback

  // 1. Look for timestamp fields with time-related names
  const timeFieldWithPattern = data.fields.findIndex(
    (field) =>
      TIMESTAMP_TYPES.has(field.dataTypeID) && isTimeRelatedField(field.name)
  );
  if (timeFieldWithPattern >= 0) {
    return timeFieldWithPattern;
  }

  // 2. Look for any timestamp field
  const timeField = data.fields.findIndex((field) =>
    TIMESTAMP_TYPES.has(field.dataTypeID)
  );
  if (timeField >= 0) {
    return timeField;
  }

  // 3. Look for string fields with time-related names
  const stringFieldWithTimePattern = data.fields.findIndex(
    (field) =>
      STRING_TYPES.has(field.dataTypeID) && isTimeRelatedField(field.name)
  );
  if (stringFieldWithTimePattern >= 0) {
    return stringFieldWithTimePattern;
  }

  // 4. Look for any string field
  const stringField = data.fields.findIndex((field) =>
    STRING_TYPES.has(field.dataTypeID)
  );
  if (stringField >= 0) {
    return stringField;
  }

  // 5. Fallback to the first field.
  return 0;
};

const findYAxis = (data?: Data, xAxisIndex?: number): number | undefined => {
  if (!data?.fields?.length) {
    return undefined;
  }

  // Define numeric types with clear documentation
  const NUMERIC_TYPE_IDS = new Set([
    20, // bigint
    21, // smallint
    23, // integer
    700, // real
    701, // double precision
    1700, // numeric
  ]);

  // Common patterns for ID-like column names
  const ID_PATTERNS = [
    /^id$/i,
    /_id$/i,
    /^key$/i,
    /_key$/i,
    /^uuid$/i,
    /^index$/i,
    /^serial$/i,
  ];

  // Helper to check if a field name matches ID patterns
  const isIdField = (fieldName: string): boolean =>
    ID_PATTERNS.some((pattern) => pattern.test(fieldName));

  // Get all numeric fields
  const numericFields = data.fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => NUMERIC_TYPE_IDS.has(field.dataTypeID));

  if (!numericFields.length) {
    return undefined;
  }

  // Find first non-ID numeric field
  const suitableField = numericFields.find(
    ({ field, index }) => !isIdField(field.name) && index !== xAxisIndex
  );

  // Return first suitable field or first numeric field if all are ID-like
  return suitableField?.index || numericFields[0].index;
};

export const resultsSlice = createSlice({
  name: "results",
  initialState,
  reducers: {
    // Draft is needed because the table contains `readonly` fields and Typescript doesn't like this.
    // Adding the `Draft` type makes Typescript happy.
    resultAdded: {
      reducer: (state, action: PayloadAction<Draft<Result>>) => {
        const { id } = action.payload;
        if (state.entities[id]) {
          console.warn("Duplicated entry for entity: Results - ID: ", id);
          return;
        }

        state.entities[id] = action.payload;
        state.ids.push(id);
        if (state.idsByPanelId[action.payload.panelId]) {
          state.idsByPanelId[action.payload.panelId][id] = true;
        } else {
          state.idsByPanelId[action.payload.panelId] = {
            [id]: true,
          };
        }
      },
      prepare: (result: Omit<Result, "id" | "uiState">) => {
        const xAxisIndex = findXAxis(result.data);
        return {
          payload: {
            ...result,
            id: nanoid(),
            uiState: {
              fadeEnabled: true,
              estimatedHeight: heightEstimator(result),
              pageIndex: 0,
              planFadeEnabled: true,
              searchFilterEnabled: false,
              selectedCells: {},
              regionVisible: 0,
              columns: result.data?.fields.map((x, index) => {
                const column: AutoGridColumn = {
                  title: x.name,
                  id: String(x.columnID) || index.toString(),
                  hasMenu: true,
                  menuIcon: "dots",
                };
                return column;
              }),
              chart: {
                xAxisIndex,
                yAxisIndex: findYAxis(result.data, xAxisIndex),
                groupByIndex: undefined,
                theme: "Midnight" as ChartTheme,
                type: "bar" as keyof ChartTypeRegistry,
              },
            },
          },
        };
      },
    },
    resultRemoved: (
      state,
      action: PayloadAction<{ id: string; panelId: string }>
    ) => {
      const { id, panelId } = action.payload;
      delete state.entities[id];
      state.ids = state.ids.filter((x) => x !== id);
      delete state.idsByPanelId[panelId][id];
    },
    panelResultsRemoved: (
      state,
      action: PayloadAction<{ panelId: string }>
    ) => {
      if (!state.idsByPanelId[action.payload.panelId]) return;

      state.ids = state.ids.filter((id) => {
        if (state.idsByPanelId[action.payload.panelId][id]) {
          delete state.entities[id];

          return true;
        } else {
          return false;
        }
      });

      delete state.idsByPanelId[action.payload.panelId];
    },
    paginationUpdated: (
      state,
      action: PayloadAction<{ id: string; index: number }>
    ) => {
      const entity = getEntityById(state, action);
      if (entity) {
        entity.uiState.pageIndex = action.payload.index;
      }
    },
    paginationIncreased: (state, action: PayloadAction<{ id: string }>) => {
      const entity = getEntityById(state, action);

      // Avoid going beyond the table size.
      if (
        entity &&
        entity.data?.rows?.length &&
        entity.data?.rows?.length > DEFAULT_ROWS_PER_PAGE &&
        entity.uiState.pageIndex * DEFAULT_ROWS_PER_PAGE <
          entity.data?.rows?.length - 1
      ) {
        entity.uiState.pageIndex += 1;
      }
    },
    paginationDecreased: (state, action: PayloadAction<{ id: string }>) => {
      const entity = getEntityById(state, action);

      // Avoid going under than 0.
      if (entity.uiState.pageIndex) {
        entity.uiState.pageIndex -= 1;
      }
    },
    searchFilterUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        searchFilter: string | undefined;
      }>
    ) => {
      const entity = getEntityById(state, action);
      entity.uiState.searchFilter = action.payload.searchFilter;
    },
    fadeDisabled: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].uiState.fadeEnabled = false;
    },
    planFadeDisabled: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].uiState.planFadeEnabled = false;
    },
    planFadeEnabled: (state, action: PayloadAction<{ id: string }>) => {
      state.entities[action.payload.id].uiState.planFadeEnabled = true;
    },
    rowSelectionUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        rowSelection: number[] | undefined;
        rowSelectionLength: number | undefined;
      }>
    ) => {
      const entity = getEntityById(state, action);
      entity.uiState.rowSelection = action.payload.rowSelection;
      entity.uiState.rowSelectionLength = action.payload.rowSelectionLength;
    },
    planTypeSelectedUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        planType: string;
      }>
    ) => {
      const entity = getEntityById(state, action);
      if (entity.uiState.planTypeSelected === action.payload.planType) {
        entity.uiState.planTypeSelected = undefined;
        entity.uiState.planTypeSubIndexSelected = undefined;
      } else {
        entity.uiState.planTypeSelected = action.payload.planType;
        entity.uiState.planTypeSubIndexSelected = 0;
      }
    },
    planTypeSubIndexUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        planTypeSubIndex: number;
      }>
    ) => {
      const entity = getEntityById(state, action);
      entity.uiState.planTypeSubIndexSelected = action.payload.planTypeSubIndex;
    },
    searchFilterEnabled: (
      state,
      action: PayloadAction<{
        id: string;
      }>
    ) => {
      state.entities[action.payload.id].uiState.searchFilterEnabled = true;
    },
    searchFilterDisabled: (
      state,
      action: PayloadAction<{
        id: string;
      }>
    ) => {
      state.entities[action.payload.id].uiState.searchFilterEnabled = false;
    },
    resultDataRowsDeleted: (
      state,
      action: PayloadAction<{
        id: string;
        rowsDeleted: Array<number>;
      }>
    ) => {
      const data = state.entities[action.payload.id].data;
      let deletionCount = 0;
      if (data) {
        const rows = data.rows;
        action.payload.rowsDeleted.forEach((indexToDelete) => {
          // Every time a slice occurs, the index that was previously selected to delete
          // will now be in a new position due to the splice of one element in the array.
          const relativeIndexToDelete = indexToDelete - deletionCount;
          if (
            relativeIndexToDelete >= 0 &&
            relativeIndexToDelete < rows.length
          ) {
            rows.splice(relativeIndexToDelete, 1);
            deletionCount += 1;
          }
        });
      }
    },
    resultAllDataRowsDeleted: (
      state,
      action: PayloadAction<{
        id: string;
      }>
    ) => {
      const data = state.entities[action.payload.id].data;
      if (data) {
        data.rows = [];
      }
    },
    resultDataRowsDeletedFailureRecovery: (
      state,
      action: PayloadAction<{
        id: string;
        rows: Array<Array<unknown>>;
      }>
    ) => {
      const data = state.entities[action.payload.id].data;
      if (data) {
        data.rows = action.payload.rows;
      }
    },
    resultChartUpdated: (
      state,
      action: PayloadAction<{
        id: string;
        chart: ChartOptions;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart = action.payload.chart;
    },
    resultChartThemeToggled: (
      state,
      action: PayloadAction<{
        id: string;
      }>
    ) => {
      if (
        state.entities[action.payload.id].uiState.chart.theme === "Colorful"
      ) {
        state.entities[action.payload.id].uiState.chart.theme = "Midnight";
      } else {
        state.entities[action.payload.id].uiState.chart.theme = "Colorful";
      }
    },
    resultChartTypeChanged: (
      state,
      action: PayloadAction<{
        id: string;
        type: keyof ChartTypeRegistry;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.type =
        action.payload.type;
    },
    resultChartChartThemeChanged: (
      state,
      action: PayloadAction<{
        id: string;
        theme: ChartTheme;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.theme =
        action.payload.theme;
    },
    resultChartXAxisChanged: (
      state,
      action: PayloadAction<{
        id: string;
        columnIndex: number | undefined;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.xAxisIndex =
        action.payload.columnIndex;
    },
    resultChartYAxisChanged: (
      state,
      action: PayloadAction<{
        id: string;
        columnIndex: number | undefined;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.yAxisIndex =
        action.payload.columnIndex;
    },
    resultChartGroupByAxisChanged: (
      state,
      action: PayloadAction<{
        id: string;
        columnIndex: number | undefined;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.groupByIndex =
        action.payload.columnIndex;
    },
    resultChartSheetOpenChanged: (
      state,
      action: PayloadAction<{
        id: string;
        sheetOpen: boolean | undefined;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.sheetOpen =
        action.payload.sheetOpen;
    },
    resultChartAxisActiveChanged: (
      state,
      action: PayloadAction<{
        id: string;
        axisActive: string | undefined;
      }>
    ) => {
      state.entities[action.payload.id].uiState.chart.axisActive =
        action.payload.axisActive;
    },
    resultSortChanged: (
      state,
      action: PayloadAction<{
        id: string;
        sort?: {
          type: "desc" | "asc";
          column: number;
        };
      }>
    ) => {
      state.entities[action.payload.id].uiState.sort = action.payload.sort;
    },
    resultEditedDataChanged: (
      state,
      action: PayloadAction<{
        id: string;
        edit: {
          col: number;
          row: number;
          newValue: string;
        };
      }>
    ) => {
      if (!state.entities[action.payload.id].editedData) {
        state.entities[action.payload.id].editedData =
          state.entities[action.payload.id].data;
      }
      const rows = state.entities[action.payload.id].editedData?.rows;
      if (rows) {
        rows[action.payload.edit.row][action.payload.edit.col] =
          action.payload.edit.newValue;
      }

      // Store edits
      let edits = state.entities[action.payload.id].edits;
      if (!edits) {
        edits = {};
        state.entities[action.payload.id].edits = edits;
      }

      if (!edits[action.payload.edit.row]) {
        edits[action.payload.edit.row] = {};
      }
      edits[action.payload.edit.row][action.payload.edit.col] =
        action.payload.edit.newValue;
    },
    resultColumnsChanged: (
      state,
      action: PayloadAction<{
        id: string;
        columns: Array<GridColumn | AutoGridColumn>;
      }>
    ) => {
      state.entities[action.payload.id].uiState.columns =
        action.payload.columns;
    },
    resultColumnSizeChanged: (
      state,
      action: PayloadAction<{
        id: string;
        column: GridColumn;
        newSize: number;
      }>
    ) => {
      const columns = state.entities[action.payload.id].uiState.columns;
      if (columns) {
        const index = columns.findIndex(
          (ci) => ci.id === action.payload.column.id
        );
        columns.splice(index, 1, {
          ...columns[index],
          width: action.payload.newSize,
        });
      }
    },
    resultRegionVisibleChanged: (
      state,
      action: PayloadAction<{
        id: string;
        regionVisible: number;
      }>
    ) => {
      state.entities[action.payload.id].uiState.regionVisible =
        action.payload.regionVisible;
    },
  },
});

export const {
  resultAdded,
  resultRemoved,
  resultSortChanged,
  panelResultsRemoved,
  paginationUpdated,
  paginationIncreased,
  paginationDecreased,
  fadeDisabled,
  searchFilterUpdated,
  rowSelectionUpdated,
  planTypeSelectedUpdated,
  planTypeSubIndexUpdated,
  planFadeDisabled,
  planFadeEnabled,
  searchFilterDisabled,
  searchFilterEnabled,
  resultDataRowsDeleted,
  resultAllDataRowsDeleted,
  resultDataRowsDeletedFailureRecovery,
  resultChartThemeToggled,
  resultChartTypeChanged,
  resultChartChartThemeChanged,
  resultChartGroupByAxisChanged,
  resultChartUpdated,
  resultChartXAxisChanged,
  resultChartYAxisChanged,
  resultChartSheetOpenChanged,
  resultChartAxisActiveChanged,
  resultEditedDataChanged,
  resultColumnsChanged,
  resultColumnSizeChanged,
  resultRegionVisibleChanged,
} = resultsSlice.actions;

export const { reducer } = resultsSlice;
