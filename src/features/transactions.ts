import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";

// Duplicated from `client.ts`
export enum TRANSACTION_STATE {
  RUNNING,
  ERROR,
  ENDED_SUCCESSFUL,
  ENDED_ERROR,
}

export interface Transaction {
  id: string;
  resultIds: Record<string, true>;
  uiState: {
    ended: boolean;
    state: TRANSACTION_STATE;
  };
}

interface State {
  ids: string[];
  entities: Record<string, Transaction>;
}

const initialState: State = {
  ids: [],
  entities: {},
};

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    // Draft is needed because the table contains `readonly` fields and Typescript doesn't like this.
    // Adding the `Draft` type makes Typescript happy.
    transactionAdded: {
      reducer: (state, action: PayloadAction<Transaction>) => {
        const { id } = action.payload;
        if (state.entities[id]) {
          console.warn("Duplicated entry for entity: Results - ID: ", id);
          return;
        }
        state.entities[id] = action.payload;
        state.ids.push(id);
      },
      prepare: () => {
        return {
          payload: {
            id: nanoid(),
            resultIds: {},
            uiState: { state: TRANSACTION_STATE.RUNNING, ended: false },
          },
        };
      },
    },
    transactionRemoved: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.entities[id];
      state.ids = state.ids.filter((x) => x !== id);
    },
    resultAdded: (
      state,
      action: PayloadAction<{ id: string; resultId: string }>
    ) => {
      const { id, resultId } = action.payload;
      state.entities[id].resultIds[resultId] = true;
    },
    transactionUpsert: (
      state,
      action: PayloadAction<{ id: string; state: TRANSACTION_STATE }>
    ) => {
      const transaction: Transaction = state.entities[action.payload.id];

      if (transaction) {
        // Update
        transaction.uiState.state = action.payload.state;
      } else {
        // New one
        state.ids.push(action.payload.id);
        state.entities[action.payload.id] = {
          id: action.payload.id,
          resultIds: {},
          uiState: {
            ended: false,
            state: action.payload.state,
          },
        };
      }
    },
  },
});

export const { transactionAdded, transactionRemoved, transactionUpsert } =
  transactionsSlice.actions;

export const { reducer } = transactionsSlice;
