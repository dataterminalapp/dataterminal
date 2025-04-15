import { APIError, APIErrorJSON } from "../services/error";
import { APIResponse } from "@/services/types";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Connection } from "./connections";
import {
  getCurrentDatabase,
  getCurrentSchema,
  getCurrentSearchPath,
  getDatabases,
  getSchemaOrSchemas,
} from "@/lib/utils";
import { AppConfig } from "@/components/app";
import { Schema } from "./schema";

interface State {
  database: {
    current?: string;
    list: Array<string>;
    loading: boolean;
    error?: APIErrorJSON;
  };
  schema: {
    current?: string;
    list: Array<Schema>;
    loading: boolean;
    error?: APIErrorJSON;
  };
  connection: {
    current?: string;
    loading: boolean;
    connected: boolean;
    error?: APIErrorJSON;
  };
  searchPath?: Array<string>;
  latency?: number;
}

const initialState: State = {
  database: {
    list: [],
    loading: true,
  },
  connection: {
    connected: false,
    loading: false,
  },
  schema: {
    list: [],
    loading: false,
  },
};

export const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    currentDatabaseUpdated: (
      state,
      action: PayloadAction<{ database: string }>
    ) => {
      state.database.current = action.payload.database;
    },
    connectionConnected: (
      state,
      action: PayloadAction<{ connected: boolean }>
    ) => {
      state.connection.connected = action.payload.connected;
      state.connection.loading = false;
      state.connection.error = undefined;
    },
    databaseLoaded: (
      state,
      action: PayloadAction<{ database?: string; list: Array<string> }>
    ) => {
      state.database.current = action.payload.database;
      state.database.list = action.payload.list;
      state.database.loading = false;
      state.database.error = undefined;
    },
    schemaLoaded: (
      state,
      action: PayloadAction<{
        schema?: string;
        keepSchema?: boolean;
        list: Array<Schema>;
      }>
    ) => {
      if (!action.payload.keepSchema) {
        state.schema.current = action.payload.schema;
      }
      state.schema.list = action.payload.list;
      state.schema.loading = false;
      state.schema.error = undefined;
    },
    schemaChanged: (state, action: PayloadAction<{ id: string }>) => {
      state.schema.current = action.payload.id;
    },
    schemaFailed: (state, action: PayloadAction<{ error: APIErrorJSON }>) => {
      state.schema.error = action.payload.error;
    },
    connectionFailed: (
      state,
      action: PayloadAction<{ error: APIErrorJSON }>
    ) => {
      state.connection.error = action.payload.error;
    },
    workspaceAppConfigLoaded: (
      state,
      action: PayloadAction<{ appConfig: AppConfig }>
    ) => {
      state.connection.current = action.payload.appConfig.defaultConnectionId;
    },
    searchPathChanged: (
      state,
      action: PayloadAction<{ searchPath?: Array<string> }>
    ) => {
      state.searchPath = action.payload.searchPath;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setupConnection.pending, (state, action) => {
        state.connection.current = action.meta.arg.connection.id;
        state.database.current = action.meta.arg.database;
        state.connection.loading = true;
        state.database.loading = true;
        state.connection.connected = false;
      })
      .addCase(setupConnection.fulfilled, (state) => {
        state.connection.loading = false;
      })
      .addCase(setupConnection.rejected, (state) => {
        state.connection.loading = false;
      })
      .addCase(setupDatabases.pending, (state) => {
        state.database.loading = true;
      })
      .addCase(setupDatabases.fulfilled, (state) => {
        state.database.loading = false;
      })
      .addCase(setupDatabases.rejected, (state) => {
        state.database.loading = false;
      })
      .addCase(setupSchemas.pending, (state, action) => {
        if (!action.meta.arg.passive) {
          state.schema.loading = true;
        }
      })
      .addCase(setupSchemas.fulfilled, (state) => {
        state.schema.loading = false;
      })
      .addCase(setupSchemas.rejected, (state) => {
        state.schema.loading = false;
      });
  },
});

export const {
  connectionConnected,
  currentDatabaseUpdated,
  databaseLoaded,
  workspaceAppConfigLoaded,
  schemaLoaded,
  schemaChanged,
  schemaFailed,
  connectionFailed,
  searchPathChanged,
} = workspaceSlice.actions;

export const { reducer } = workspaceSlice;

interface Args {
  connection: Connection;
  database?: string;
}

export const setupConnection = createAsyncThunk<
  APIResponse<{ connected: boolean }, APIErrorJSON>,
  Args
>(
  "workspace/setupConnection",
  async ({
    connection,
    database,
  }: {
    connection: Connection;
    database?: string;
  }) => {
    try {
      const { data, error }: APIResponse<{ connected: boolean }, APIErrorJSON> =
        await (window as Window).electronAPI.setConnectionString(
          connection.connectionString,
          database
        );

      return {
        data,
        error,
      };
    } catch (err) {
      return {
        error: APIError.normalizeError(
          err,
          "Error setting up connection"
        ).toJSON(),
      };
    }
  }
);

export const setupDatabases = createAsyncThunk<
  APIResponse<
    { list: Array<string>; current: string | undefined },
    APIErrorJSON
  >
>("workspace/setupDatabases", async () => {
  try {
    const currentDatabasePromise = getCurrentDatabase();
    const databasesListPromise = getDatabases();
    const [list, current] = await Promise.all([
      databasesListPromise,
      currentDatabasePromise,
    ]);

    return {
      data: {
        list,
        current,
      },
    };
  } catch (err) {
    console.error("Error getting databases: ", err);
    return {
      error: APIError.normalizeError(err, "Error fetching databases").toJSON(),
    };
  }
});

export const checkLatency = createAsyncThunk<
  APIResponse<{ latency?: number }, APIErrorJSON>
>("workspace/checkLatency", async () => {
  try {
    const response: APIResponse<{ latency?: number }, APIErrorJSON> = await (
      window as Window
    ).electronAPI.latencyDatabase();
    return response;
  } catch (err) {
    console.error("Latency error: ", err);
    return {
      error: APIError.normalizeError(err, "Unknown error").toJSON(),
    };
  }
});

export const setupSchemas = createAsyncThunk<
  APIResponse<
    { list: Array<Schema>; current: string | undefined },
    APIErrorJSON
  >,
  { schema?: string; passive?: boolean }
>("workspace/setupSchemas", async ({ schema: predefinedSchema }) => {
  try {
    const currentPromise = getCurrentSchema();
    const listPromise = getSchemaOrSchemas(predefinedSchema);
    const [list, [id]] = await Promise.all([listPromise, currentPromise]);

    return {
      data: {
        list,
        current: id,
      },
    };
  } catch (err) {
    console.error("Error getting schemas: ", err);
    return {
      error: APIError.normalizeError(err, "Error fetching schemas").toJSON(),
    };
  }
});

export const setupSearchPath = createAsyncThunk<
  APIResponse<Array<string>, APIErrorJSON>
>("workspace/setupSearchPath", async () => {
  try {
    const [searchPathString] = await getCurrentSearchPath();
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
