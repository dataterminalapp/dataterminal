import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Role {
  id: string;
  name: string;
}

export enum BaseEntityType {
  Schema,
  Database,
  Table,
  Column,
  View,
  Index,
  MaterializedView,
  UserFunction,
  Function,
  Procedure,
  Constraint,
  Extension,
}

export function baseEntityTypeToString(type?: BaseEntityType): string {
  switch (type) {
    case BaseEntityType.MaterializedView:
      return "Materialized View";
    case BaseEntityType.UserFunction:
      return "User Function";
    default:
      return type ? BaseEntityType[type] : "Entity";
  }
}

export interface BaseEntity {
  type: BaseEntityType;
  name: string;
  id: string;
  children: Array<BaseEntity> | null;
  logicalDelete?: boolean;
}

export interface Extension extends BaseEntity {
  type: BaseEntityType.Extension;
  version: string;
  description: string | null;
}

export interface ColumnKey {
  type: "FOREIGN" | "PRIMARY" | "FOREIGN_PRIMARY";
}

export interface PrimaryKey extends ColumnKey {
  type: "PRIMARY";
}
export interface ForeignKey extends ColumnKey {
  type: "FOREIGN";
  tableOid: string;
  tableColumnAttbNum: number;
}
export interface ForeignPrimaryKey extends ColumnKey {
  type: "FOREIGN_PRIMARY";
  tableOid: string;
  tableColumnAttbNum: number;
}

export interface SchemaConstraint extends BaseEntity {
  constraintType: string;
  referencedTable: string | null;
  checkCondition: string | null;
  hasDefault: boolean;
  defaultValue: string | null;
  isNotNull: boolean | null;
}

export interface SchemaColumn extends BaseEntity {
  database: string;
  schema: string;
  table: string;
  name: string;
  id: string;
  attnum: number;
  columnType: string;
  type: BaseEntityType.Column;
  children: null;
  constraints: Array<SchemaConstraint>;
  key?: PrimaryKey | ForeignKey | ForeignPrimaryKey | undefined;
}

export interface SchemaTable extends BaseEntity {
  database: string;
  schema: string;
  id: string;
  name: string;
  children: SchemaColumn[];
  type: BaseEntityType.Table;
  totalQueries: number | null;
}

export interface SchemaView extends BaseEntity {
  database: string;
  schema: string;
  id: string;
  name: string;
  children: SchemaColumn[];
  type: BaseEntityType.View;
}

export interface SchemaUserFunction extends BaseEntity {
  schema: string;
  id: string;
  name: string;
  children: SchemaColumn[];
  type: BaseEntityType.UserFunction;
  returnType: string;
  args: unknown;
  functionDescription: string;
}

export interface SchemaFunction extends BaseEntity {
  ids: Array<string>;
  name: string;
  children: SchemaColumn[];
  type: BaseEntityType.Function;
  returnType: Array<string>;
  args: Array<string>;
  functionDescription: string;
  priority: 1 | 2;
}

export interface SchemaProcedure extends BaseEntity {
  schema: string;
  id: string;
  name: string;
  children: SchemaColumn[];
  type: BaseEntityType.Procedure;
}

export interface Schema extends BaseEntity {
  id: string;
  name: string;
  database: string;
  tables: SchemaTable[];
  views: SchemaView[];
  userFunctions: SchemaUserFunction[];
  functions: SchemaFunction[];
  procedures: SchemaProcedure[];
  extensions: Extension[];
  type: BaseEntityType.Schema;
}

// Normalized state structure
interface NormalizedState {
  schemas: {
    ids: string[];
    entities: Record<string, Schema>;
  };
  tables: {
    ids: string[];
    entities: Record<string, SchemaTable>;
  };
  columns: {
    ids: string[];
    entities: Record<string, SchemaColumn>;
  };
  views: {
    ids: string[];
    entities: Record<string, SchemaView>;
  };
  functions: {
    ids: string[];
    entities: Record<string, SchemaFunction>;
  };
  userFunctions: {
    ids: string[];
    entities: Record<string, SchemaUserFunction>;
  };
  procedures: {
    ids: string[];
    entities: Record<string, SchemaProcedure>;
  };
  // Track parent-child relationships
  relationships: {
    byParent: Record<string, string[]>;
    byChild: Record<string, string>;
  };
  entities: Record<string, BaseEntity>;
}
const initialState: NormalizedState = {
  schemas: { ids: [], entities: {} },
  tables: { ids: [], entities: {} },
  columns: { ids: [], entities: {} },
  views: { ids: [], entities: {} },
  functions: { ids: [], entities: {} },
  userFunctions: { ids: [], entities: {} },
  procedures: { ids: [], entities: {} },
  relationships: {
    byParent: {},
    byChild: {},
  },
  entities: {},
};

// Helper function to normalize entities
function normalizeEntity<T extends BaseEntity>(
  state: NormalizedState,
  entity: T,
  parentId?: string
) {
  // Store the entity in its respective slice
  const sliceName = getEntityNameByEntityType(entity.type);
  if (sliceName) {
    const slice = state[sliceName as keyof NormalizedState] as unknown as {
      ids: string[];
      entities: Record<string, T>;
    };

    // Global search
    state.entities[entity.id] = entity;

    if (!slice.ids.includes(entity.id)) {
      slice.ids.push(entity.id);
    }
    slice.entities[entity.id] = entity;

    // Update relationships
    if (parentId) {
      state.relationships.byChild[entity.id] = parentId;
      if (!state.relationships.byParent[parentId]) {
        state.relationships.byParent[parentId] = [];
      }
      if (!state.relationships.byParent[parentId].includes(entity.id)) {
        state.relationships.byParent[parentId].push(entity.id);
      }
    }
  }
}

export function getEntityNameByEntityType(type: BaseEntityType): string | null {
  switch (type) {
    case BaseEntityType.Schema:
      return "schemas";
    case BaseEntityType.Table:
      return "tables";
    case BaseEntityType.Column:
      return "columns";
    case BaseEntityType.View:
      return "views";
    case BaseEntityType.Function:
      return "functions";
    case BaseEntityType.UserFunction:
      return "userFunctions";
    case BaseEntityType.Procedure:
      return "procedures";
    default:
      return null;
  }
}

const cleanSchema = (state: NormalizedState) => {
  // Clean schema
  state.schemas = { ids: [], entities: {} };
  state.tables = { ids: [], entities: {} };
  state.columns = { ids: [], entities: {} };
  state.views = { ids: [], entities: {} };
  state.functions = { ids: [], entities: {} };
  state.userFunctions = { ids: [], entities: {} };
  state.procedures = { ids: [], entities: {} };
  state.relationships = {
    byParent: {},
    byChild: {},
  };
  state.entities = {};
};

export const schemaSlice = createSlice({
  name: "schema",
  initialState,
  reducers: {
    schemaLoaded: (state, action: PayloadAction<{ list: Array<Schema> }>) => {
      cleanSchema(state);
      action.payload.list.forEach((schema) => {
        normalizeEntity(state, schema);

        // Normalize all child entities
        schema.tables.forEach((table) => {
          normalizeEntity(state, table, schema.id);
          table.children?.forEach((column) =>
            normalizeEntity(state, column, table.id)
          );
        });

        schema.views.forEach((view) => {
          normalizeEntity(state, view, schema.id);
          view.children?.forEach((column) =>
            normalizeEntity(state, column, view.id)
          );
        });

        schema.functions.forEach((func) =>
          normalizeEntity(state, func, schema.id)
        );

        schema.userFunctions.forEach((func) =>
          normalizeEntity(state, func, schema.id)
        );

        schema.procedures.forEach((proc) =>
          normalizeEntity(state, proc, schema.id)
        );
      });
    },
    entityAdded: (
      state,
      action: PayloadAction<{ entity: BaseEntity; parentId?: string }>
    ) => {
      const { entity, parentId } = action.payload;
      normalizeEntity(state, entity, parentId);
    },
    entityLogicallyRemoved: (
      state,
      action: PayloadAction<{
        id: string;
        type: BaseEntityType;
      }>
    ) => {
      const sliceName = getEntityNameByEntityType(action.payload.type);
      if (sliceName && state[sliceName as keyof NormalizedState]) {
        (
          state[sliceName as keyof NormalizedState] as {
            ids: string[];
            entities: Record<string, BaseEntity>;
          }
        ).entities[action.payload.id].logicalDelete = true;
      }
      state.entities[action.payload.id].logicalDelete = true;
    },
    entityLogicallyRecovered: (
      state,
      action: PayloadAction<{
        id: string;
        type: BaseEntityType;
      }>
    ) => {
      const sliceName = getEntityNameByEntityType(action.payload.type);
      if (sliceName && state[sliceName as keyof NormalizedState]) {
        (
          state[sliceName as keyof NormalizedState] as {
            ids: string[];
            entities: Record<string, BaseEntity>;
          }
        ).entities[action.payload.id].logicalDelete = undefined;
      }
      state.entities[action.payload.id].logicalDelete = undefined;
    },
    entityNameChanged: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      state.entities[action.payload.id].name = action.payload.name;
      if (state.entities[action.payload.id].type === BaseEntityType.Column) {
        state.columns.entities[action.payload.id].name = action.payload.name;
      } else if (
        state.entities[action.payload.id].type === BaseEntityType.Table
      ) {
        state.tables.entities[action.payload.id].name = action.payload.name;
      } else if (
        state.entities[action.payload.id].type === BaseEntityType.View
      ) {
        state.views.entities[action.payload.id].name = action.payload.name;
      }
    },
    columnTypeChanged: (
      state,
      action: PayloadAction<{ id: string; columnType: string }>
    ) => {
      if (state.entities[action.payload.id].type === BaseEntityType.Column) {
        (state.entities[action.payload.id] as SchemaColumn).columnType =
          action.payload.columnType;
        state.columns.entities[action.payload.id].columnType =
          action.payload.columnType;
      }
    },
    schemaCleaned: (state) => {
      cleanSchema(state);
    },
  },
});

// Selectors
export const selectChildrenIds = (
  state: { schema: NormalizedState },
  parentId: string
) => state.schema.relationships.byParent[parentId] || [];

export const selectParentId = (
  state: { schema: NormalizedState },
  childId: string
) => state.schema.relationships.byChild[childId];

export const selectEntity = (
  state: { schema: NormalizedState },
  id: string,
  type: BaseEntityType
) => {
  const sliceName = getEntityNameByEntityType(type);
  if (!sliceName) return null;

  return state.schema[sliceName as keyof NormalizedState].entities[id];
};

export const {
  entityAdded,
  schemaLoaded,
  entityNameChanged,
  columnTypeChanged,
  entityLogicallyRecovered,
  entityLogicallyRemoved,
  schemaCleaned,
} = schemaSlice.actions;
export const { reducer } = schemaSlice;
