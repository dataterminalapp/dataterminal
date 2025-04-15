import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BaseEntity } from "./schema";
import { MIN_SIZE_PIXELS } from "../components/sections/explorer";

export type SimplifiedSchemaEntity = {
  table?: string;
  parentId: string;
} & Pick<BaseEntity, "id" | "name" | "type">;

interface State {
  enabled: boolean;
  autofocusSearch?: boolean;
  /**
   * Default size in pixels
   */
  size: number;
  entityToDelete?: SimplifiedSchemaEntity;
}

const initialState: State = {
  enabled: false,
  autofocusSearch: false,
  size: MIN_SIZE_PIXELS,
};

export const explorerSlice = createSlice({
  name: "explorer",
  initialState,
  reducers: {
    enabled: (state) => {
      state.enabled = true;
    },
    disabled: (state) => {
      state.enabled = false;
    },
    toggle: (state) => {
      state.enabled = !state.enabled;
    },
    entityToDeleteAssigned: (
      state,
      action: PayloadAction<{
        entityToDelete?: SimplifiedSchemaEntity;
      }>
    ) => {
      state.entityToDelete = action.payload.entityToDelete;
    },
    entityToDeleteCleared: (state) => {
      state.entityToDelete = undefined;
    },
    explorerSizeChanged: (
      state,
      action: PayloadAction<{
        size: number;
      }>
    ) => {
      state.size = action.payload.size;
    },
  },
});

export const {
  enabled,
  disabled,
  toggle,
  entityToDeleteAssigned,
  entityToDeleteCleared,
  explorerSizeChanged,
} = explorerSlice.actions;

export const { reducer } = explorerSlice;
