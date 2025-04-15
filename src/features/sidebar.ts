import { createSlice } from "@reduxjs/toolkit";

interface State {
    enabled: boolean,
}

const initialState: State = {
  enabled: false,
};

export const sidebarSlice = createSlice({
  name: 'sidebar',
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
    }
  },
});

export const { 
  enabled,
  disabled,
  toggle
} = sidebarSlice.actions;

export const { reducer } = sidebarSlice;