import {
  SchemaTable,
  SchemaView,
  SchemaColumn,
  Role,
  BaseEntityType,
  Schema,
  BaseEntity,
  PrimaryKey,
  ForeignKey,
  ForeignPrimaryKey,
  SchemaConstraint,
  Extension,
} from "@/features/schema";
import { APIResponse } from "@/services/types";
import { APIError, DatabaseError } from "../services/error";
import { type ClassValue, clsx } from "clsx";
import { QueryArrayResult } from "pg";
import { twMerge } from "tailwind-merge";
import { ClientResult } from "@/services/local/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isNumericColumn = (oid: string) => {
  const numericTypes = new Set([21, 23, 20, 700, 701, 1700]);
  return numericTypes.has(Number(oid));
};

type Value = [
  // Database name
  string,
  // Database ID
  string,
  // Schema name
  string,
  // Schema ID
  string,
  // Table name
  string | null,
  // Table type
  "BASE TABLE" | "VIEW" | null,
  // Table ID
  string | null,
  //  Column ID (att_num)
  number | null,
  // Column name
  string | null,
  // Data type
  string | null,
  // Character maximum length
  number | null,
  // Is nullable
  "YES" | "NO" | null,
  // Column default:
  string | null,
  // Column description
  string | null,
  // Total queries (Watchout chaging this variable position, it is used statically)
  number | null
];

export const getFunctions = async () => {
  const results: APIResponse<
    QueryArrayResult<unknown[]>,
    DatabaseError
  > = await (window as Window).electronAPI.query(`
    SELECT DISTINCT
      p.proname AS function_name,
      CASE 
          WHEN a.aggfnoid IS NOT NULL THEN 1 
          ELSE 2 
      END AS priority
    FROM 
      pg_catalog.pg_proc p
      INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN pg_catalog.pg_aggregate a ON a.aggfnoid = p.oid
    WHERE 
      n.nspname IN ('pg_catalog', 'public')
      AND p.proname NOT LIKE 'RI_%'
      AND p.proname NOT LIKE 'any_%'
      AND p.proname NOT LIKE '%_accum%'
      AND p.proname NOT LIKE '%_combine%'
      AND p.proname NOT LIKE '%_deserialize%'
      AND p.proname NOT LIKE '%_serialize%'
      AND p.proname NOT LIKE 'int8%'
      AND p.proname NOT LIKE 'float8%'
      AND p.proname NOT LIKE 'numeric%'
      AND p.proname NOT LIKE 'interval%'
      AND p.proname NOT LIKE 'binary%'
      AND (a.aggfnoid IS NOT NULL OR a.aggfnoid IS NULL) -- Include both aggregate and non-aggregate functions
      AND p.prokind = 'f'
    ORDER BY 
      function_name;
  `);

  return results;
};

export const getUserFunctions = async (schemaName?: string) => {
  const results: APIResponse<
    QueryArrayResult<[string, string, string, string, string, string]>,
    DatabaseError
  > = await (window as Window).electronAPI.query(`
    SELECT
    p.oid AS function_id,
    n.nspname AS schema,
    p.proname AS function_name,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
    d.description AS function_description
    FROM
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    LEFT JOIN pg_catalog.pg_description d ON p.oid = d.objoid
    WHERE
    -- Skip schema functions or internals
    n.nspname  ${
      schemaName
        ? `= '${schemaName}'`
        : "!~ '^(pg_catalog|information_schema|_timescaledb_.*)'"
    }
    AND p.prokind = 'f'
    AND NOT EXISTS (
        -- Skip functions that come from extensions
        SELECT 1 
        FROM pg_extension e 
        JOIN pg_depend dep ON dep.objid = p.oid 
        WHERE dep.refclassid = 'pg_extension'::regclass
        AND dep.deptype = 'e'
    )
    ORDER BY
    schema, function_name;`);

  return results;
};

function retry<T>(f: () => Promise<T>): Promise<T> {
  let tries = 0;
  let running = false;
  return new Promise((res, rej) => {
    const intervalId = setInterval(async () => {
      // Skip if it is already running
      if (running) {
        return;
      }

      try {
        running = true;
        res(await f());
        clearInterval(intervalId);
      } catch (err) {
        if (tries >= 10) {
          clearInterval(intervalId);
          rej(err);
        }
      } finally {
        tries += 1;
        running = false;
      }
    }, 1000);
  });
}

const getKeyType = (
  tableId: string,
  columnAttnum: number,
  primaryKeys: Map<string, Array<number>>,
  foreignKeys: Map<string, Array<RawForeignKey>>
): PrimaryKey | ForeignKey | ForeignPrimaryKey | undefined => {
  const primaryKey = primaryKeys.get(tableId)?.includes(columnAttnum);
  const rawForeignKey = foreignKeys
    .get(tableId)
    ?.find((fk) => fk.columnNum === columnAttnum);

  if (primaryKey && !rawForeignKey) {
    return { type: "PRIMARY" };
  } else if (rawForeignKey && !primaryKey) {
    return {
      tableColumnAttbNum: rawForeignKey.columnNum,
      tableOid: rawForeignKey.tableOid,
      type: "FOREIGN",
    };
  } else if (rawForeignKey && primaryKey) {
    return {
      tableColumnAttbNum: rawForeignKey.columnNum,
      tableOid: rawForeignKey.tableOid,
      type: "FOREIGN_PRIMARY",
    };
  }
};

const processColumn = (
  schemas: Map<string, Schema>,
  entitiesById: Map<string, BaseEntity>,
  value: Value,
  primaryKeys: Map<string, Array<number>>,
  foreignKeys: Map<string, Array<RawForeignKey>>,
  constraints: Map<string, Array<SchemaConstraint>>
) => {
  const [
    database,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _databaseId,
    schemaName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _schemaId,
    tableOrViewName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tableOrViewTypeRaw,
    tableOrViewId,
    columnAttnum,
    columnName,
    dataType,
  ] = value;
  if (tableOrViewId) {
    const parentTableOrView =
      entitiesById.get(tableOrViewId) ||
      processTableOrView(schemas, entitiesById, value);

    if (
      columnAttnum &&
      columnName &&
      schemaName &&
      tableOrViewName &&
      dataType
    ) {
      const constraintsKey = `${schemaName}|${tableOrViewName}|${columnAttnum}`;
      const columnConstraints = constraints.get(constraintsKey) || [];
      const key: PrimaryKey | ForeignKey | ForeignPrimaryKey | undefined =
        getKeyType(tableOrViewId, columnAttnum, primaryKeys, foreignKeys);
      const columnId = tableOrViewId + "_" + columnAttnum;
      const newColumn: SchemaColumn = {
        id: tableOrViewId + "_" + columnId,
        attnum: columnAttnum,
        name: columnName,
        database,
        schema: schemaName,
        table: tableOrViewName,
        columnType: String(dataType),
        constraints: columnConstraints,
        type: BaseEntityType.Column,
        children: null,
        key,
      };
      parentTableOrView?.children?.push(newColumn);
      entitiesById.set(columnId, newColumn);
    }
  }
};

const processTableOrView = (
  schemas: Map<string, Schema>,
  entitiesById: Map<string, BaseEntity>,
  value: Value
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [database, _, schemaName, schemaId, name, typeRaw, id] = value;
  const totalQueries = value[14];

  if (id && name && !entitiesById.has(id)) {
    const parentSchema = schemas.get(schemaId) || processSchema(schemas, value);

    const tableOrViewType =
      typeRaw === "VIEW" ? BaseEntityType.View : BaseEntityType.Table;
    const entity: SchemaTable | SchemaView = {
      database,
      children: [],
      id,
      name,
      schema: schemaName,
      type: tableOrViewType,
      totalQueries,
    };
    entitiesById.set(id, entity);
    parentSchema.children?.push(entity);

    if (entity.type === BaseEntityType.View) {
      parentSchema.views.push(entity);
    } else {
      parentSchema.tables.push(entity);
    }

    return entity;
  }
};

const processSchema = (schemas: Map<string, Schema>, value: Value) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [database, _databaseId, name, id] = value;
  const entity: Schema = schemas.get(id) || {
    name,
    id,
    children: [],
    functions: [],
    procedures: [],
    tables: [],
    userFunctions: [],
    views: [],
    extensions: [],
    type: BaseEntityType.Schema,
    database,
  };

  if (!schemas.has(id)) {
    schemas.set(id, entity);
  }

  return entity;
};

const processSchemas = (
  results: QueryArrayResult<Value> | undefined,
  primaryKeys: Map<string, Array<number>>,
  foreignKeys: Map<string, Array<RawForeignKey>>,
  constraints: Map<string, Array<SchemaConstraint>>
) => {
  const schemas = new Map<string, Schema>();
  const entitiesById = new Map<string, BaseEntity>();

  (results?.rows || ([] as Array<Value>))?.forEach((value) => {
    const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _databaseName,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _databaseId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _schemaName,
      schemaId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _tableName,
      tableOrViewTypeRaw,
      tableOrViewId,
      columnId,
    ] = value;
    const isSchema = schemaId && !columnId && !tableOrViewId;
    const isView = tableOrViewTypeRaw === "VIEW";
    const isTable = tableOrViewTypeRaw === "BASE TABLE";
    const isColumn = columnId;

    if (isColumn) {
      processColumn(
        schemas,
        entitiesById,
        value,
        primaryKeys,
        foreignKeys,
        constraints
      );
    } else if (isView || isTable) {
      processTableOrView(schemas, entitiesById, value);
    } else if (isSchema) {
      processSchema(schemas, value);
    } else {
      console.warn("Unprocessed value: ", value);
    }
  });

  return Array.from(schemas.values()).sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
};

interface RawConstraint extends SchemaConstraint {
  tableSchema: string;
  tableName: string;
  columnAttnum: number;
}

const getConstraints = async (
  schemaName?: string
): Promise<Map<string, SchemaConstraint[]>> => {
  return await retry(async () => {
    const response: APIResponse<
      QueryArrayResult<
        [
          // tableSchema
          string,
          // tableName
          string,
          // columnName
          string,
          // columnId
          number,
          // constraint_id
          number,
          // constraintName
          string,
          // constraintType
          string,
          // referencedTable
          string,
          // checkCondition
          string,
          // hasDefault
          boolean,
          // defaultValue
          string,
          // isNotNull
          boolean
        ]
      >,
      APIError
    > = await (window as Window).electronAPI.query(`
      SELECT
      -- Common fields
      sch.nspname AS table_schema,
      tbl.relname AS table_name,
      col.attname AS column_name,
      col.attnum AS column_id,
      con.oid as constraint_id,
      con.conname AS constraint_name,
      CASE
        WHEN con.contype = 'p' THEN 'PRIMARY KEY'
        WHEN con.contype = 'u' THEN 'UNIQUE'
        WHEN con.contype = 'f' THEN 'FOREIGN KEY'
        WHEN con.contype = 'c' THEN 'CHECK'
        WHEN con.contype = 'x' THEN 'EXCLUSION'
      END AS constraint_type,
      -- Additional details for FOREIGN KEYS
      CASE
        WHEN con.contype = 'f' THEN
          (SELECT sch_ref.nspname || '.' || tbl_ref.relname 
          FROM pg_class tbl_ref 
          JOIN pg_namespace sch_ref ON tbl_ref.relnamespace = sch_ref.oid 
          WHERE tbl_ref.oid = con.confrelid)
      END AS referenced_table,
      -- Check constraint conditions
      pg_get_expr(con.conbin, con.conrelid) AS check_condition,
      -- Default values
      col.atthasdef AS has_default,
      ( SELECT pg_get_expr(adbin, adrelid) 
        FROM pg_attrdef 
        WHERE adrelid = tbl.oid AND adnum = col.attnum
      ) AS default_value,
        -- NOT NULL flag
        col.attnotnull AS is_not_null
    FROM pg_catalog.pg_class tbl
    JOIN pg_catalog.pg_namespace sch ON sch.oid = tbl.relnamespace
    LEFT JOIN pg_catalog.pg_attribute col ON col.attrelid = tbl.oid
    LEFT JOIN pg_catalog.pg_constraint con ON con.conrelid = tbl.oid
WHERE
(tbl.relkind = 'r' OR tbl.relkind = 'v') -- Only tables
AND (con.contype IS NULL OR con.contype IN ('p','u','f','c','x')) -- Constraints check
AND (col.attnum > 0 OR col.attnum IS NULL) -- Exclude system columns
AND sch.nspname ${
      schemaName
        ? ` = '${schemaName}'`
        : "NOT IN ('pg_catalog', 'information_schema')"
    }
ORDER BY table_schema, table_name, column_name;
      `);

    // Create a Map to store constraints
    const constraintsMap = new Map<string, RawConstraint[]>();

    // Process rows and populate the Map
    response.data?.rows.forEach(
      ([
        tableSchema,
        tableName,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _columnName,
        columnAttnum,
        constraintId,
        constraintName,
        constraintType,
        referencedTable,
        checkCondition,
        hasDefault,
        defaultValue,
        isNotNull,
      ]) => {
        const key = `${tableSchema}|${tableName}|${columnAttnum}`;

        const rawConstraint: RawConstraint = {
          tableName,
          checkCondition,
          columnAttnum,
          id: String(constraintId),
          name: constraintName,
          constraintType: constraintType,
          type: BaseEntityType.Constraint,
          defaultValue,
          hasDefault,
          referencedTable,
          tableSchema,
          isNotNull,
          children: null,
        };

        // If the key doesn't exist, create a new array
        if (!constraintsMap.has(key)) {
          constraintsMap.set(key, []);
        }

        // Add the constraint to the array for this key
        constraintsMap.get(key)?.push(rawConstraint);
      }
    );

    return constraintsMap;
  });
};

const getTablesAndViews = async (
  schema?: string
): Promise<APIResponse<QueryArrayResult<Value>, Error>> => {
  return await retry(
    async () =>
      await (window as Window).electronAPI.query(`
WITH schema_list AS
  (SELECT nspname AS SCHEMA_NAME,
          oid AS schema_id
   FROM pg_namespace
   WHERE ${
     schema
       ? `nspname IN ('${schema}')`
       : "nspname NOT IN ('pg_catalog','information_schema')"
   }),
  all_objects AS
  (SELECT current_database() AS database_name,
          (SELECT oid
           FROM pg_database
           WHERE datname = current_database()) AS database_id, -- Add database ID
          sl.schema_name AS SCHEMA,
          sl.schema_id AS schema_id,
          t.table_name,
          t.table_type,
          pc.oid AS table_id,
          NULL AS column_id,
          NULL AS COLUMN_NAME,
          NULL AS data_type,
          NULL AS character_maximum_length,
          NULL AS is_nullable,
          NULL AS column_default,
          NULL AS column_description,
          (n_tup_ins + n_tup_upd + n_tup_del)::INT AS total_queries
   FROM schema_list sl
   LEFT JOIN information_schema.tables t ON t.table_schema = sl.schema_name
   LEFT JOIN pg_class pc ON pc.relname = t.table_name
   AND pc.relnamespace = sl.schema_id
   LEFT JOIN pg_stat_user_tables pst ON pc.oid = pst.relid -- Join to get query stats
   WHERE (t.table_type IN ('BASE TABLE',
                        'VIEW')
          OR t.table_type IS NULL)
   UNION ALL SELECT current_database() AS database_name,
                    (SELECT oid
                     FROM pg_database
                     WHERE datname = current_database()) AS database_id, -- Add database ID
                    t.table_schema AS SCHEMA,
                    (SELECT oid
                     FROM pg_namespace
                     WHERE nspname = t.table_schema) AS schema_id,
                    t.table_name,
                    t.table_type,
                    pc.oid AS table_id,
                    pa.attnum AS column_id,
                    c.column_name,
                    c.data_type,
                    c.character_maximum_length,
                    c.is_nullable,
                    c.column_default,
                    pg_catalog.col_description(pc.oid, c.ordinal_position) AS column_description,
                    NULL AS total_queries -- Placeholder for total_queries in column details
   FROM information_schema.tables t
   JOIN information_schema.columns c ON t.table_schema = c.table_schema
   AND t.table_name = c.table_name
   JOIN pg_class pc ON pc.relname = t.table_name
   AND pc.relnamespace =
     (SELECT oid
      FROM pg_namespace
      WHERE nspname = t.table_schema)
   JOIN pg_attribute pa ON pa.attrelid = pc.oid
   AND pa.attname = c.column_name
   LEFT JOIN pg_stat_user_tables pst ON pc.oid = pst.relid -- Join to get query stats
   WHERE ${
     schema
       ? `t.table_schema = '${schema}'`
       : "t.table_schema NOT IN ('pg_catalog', 'information_schema')"
   }
   AND t.table_type IN ('BASE TABLE',
                      'VIEW')
   AND pa.attnum > 0)
SELECT *
FROM all_objects
ORDER BY database_name,
         database_id,
         SCHEMA,
         TABLE_NAME,
         column_id;`)
  );
};

const processUserFunctions = (
  schemas: Array<Schema>,
  results:
    | QueryArrayResult<[string, string, string, string, string, string]>
    | undefined
) => {
  const schemasMap = new Map<string, Schema>();
  schemas.forEach((x) => schemasMap.set(x.name, x));
  results?.rows.forEach((x) => {
    const [
      functionId,
      schemaName,
      functionName,
      returnType,
      args,
      functionDescription,
    ] = x;

    const schema = schemasMap.get(schemaName);
    if (schema) {
      schema.userFunctions.push({
        children: [],
        id: functionId,
        name: functionName,
        schema: schemaName,
        type: BaseEntityType.UserFunction,
        returnType,
        args,
        functionDescription,
      });
    }
  });

  return Array.from(schemasMap.values());
};

// const processFunctions = (
//   schemas: Array<Schema>,
//   results: QueryArrayResult<[string, 1 | 2]>
// ): Array<Schema> => {
//   const functions: Array<SchemaFunction> = results.rows.map((x) => {
//     const [functionName, priority] = x;

//     const schemaFunction: SchemaFunction = {
//       children: [],
//       ids: [],
//       name: functionName,
//       type: BaseEntityType.Function,
//       returnType: [],
//       args: [],
//       functionDescription: "",
//       id: functionName,
//       priority,
//     };

//     return schemaFunction;
//   });

//   return schemas.map((x) => ({
//     ...x,
//     functions,
//   }));
// };

export const getCurrentRole = async (): Promise<Role | undefined> => {
  const { data, error } = await retry<
    APIResponse<QueryArrayResult<[string, string]>, Error>
  >(
    async () =>
      await (window as Window).electronAPI.query(`
    SELECT current_role();
  `)
  );

  if (error) {
    console.warn("Error requesting roles.");
  }

  if (data?.rows) {
    const [role] = data.rows;
    if (role) {
      const [roleId, roleName] = role;
      return {
        id: roleId,
        name: roleName,
      };
    }
  }
};

export const getRoles = async (): Promise<Role[]> => {
  const { data, error } = await retry<
    APIResponse<QueryArrayResult<unknown[]>, Error>
  >(
    async () =>
      await (window as Window).electronAPI.query(`
    SELECT oid AS role_id, rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolconnlimit, rolvaliduntil
    FROM pg_roles
    WHERE rolname NOT LIKE 'pg_%'
    ORDER BY rolname;
  `)
  );

  if (error) {
    console.warn("Error requesting roles.");
  }

  return (
    data?.rows.map(([roleId, roleName]) => ({
      id: roleId as string,
      name: roleName as string,
    })) || []
  );
};

export const getPrimaryKeys = async (
  schema?: string
): Promise<Map<string, Array<number>>> => {
  const { data, error } = await retry<
    APIResponse<QueryArrayResult<[string, number]>, Error>
  >(
    async () =>
      await (window as Window).electronAPI.query(`
        SELECT
            c.oid AS table_oid,
            a.attnum AS column_num
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
            AND a.attnum = ANY(con.conkey)
        WHERE con.contype = 'p'
            ${
              schema
                ? `AND n.nspname IN ('${schema}')`
                : "AND n.nspname NOT IN ('pg_catalog', 'information_schema')"
            }
        ORDER BY c.oid, a.attnum;
      `)
  );

  if (error) {
    console.warn("Error requesting roles.");
    return new Map();
  }

  const keys = new Map<string, Array<number>>();

  if (data?.rows) {
    data.rows.forEach(([tableOid, columnAttnum]) => {
      if (!keys.has(tableOid)) {
        keys.set(tableOid, []);
      }
      keys.get(tableOid)?.push(columnAttnum);
    });
  }

  return keys;
};

interface RawForeignKey {
  tableOid: string;
  columnNum: number;
  foreignTableOid: string;
  foreignColumnNum: string;
}

export const getForeignKeys = async (
  schema?: string
): Promise<Map<string, Array<RawForeignKey>>> => {
  const { data, error } = await retry<
    APIResponse<QueryArrayResult<[string, number, string, string]>, Error>
  >(
    async () =>
      await (window as Window).electronAPI.query(`
        SELECT DISTINCT
          cl.oid AS table_oid,
          att.attnum AS column_num,
          con.confrelid AS foreign_table_oid,
          unnest(con.confkey) AS foreign_column_num
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        JOIN pg_attribute att ON 
          att.attrelid = cl.oid AND 
          att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f'
        AND ${
          schema
            ? `n.nspname IN ('${schema}')`
            : "n.nspname NOT IN ('pg_catalog', 'information_schema')"
        }
        ORDER BY table_oid, column_num;
      `)
  );

  if (error) {
    console.warn("Error requesting foreign keys.");
    return new Map();
  }

  const keys = new Map<string, Array<RawForeignKey>>();

  if (data?.rows) {
    data.rows.forEach(
      ([tableOid, columnNum, foreignTableOid, foreignColumnNum]) => {
        if (!keys.has(tableOid)) {
          keys.set(tableOid, []);
        }
        keys
          .get(tableOid)
          ?.push({ tableOid, columnNum, foreignTableOid, foreignColumnNum });
      }
    );
  }

  return keys;
};

export const getExtensions = async (): Promise<Extension[]> => {
  const { data, error } = await retry<
    APIResponse<
      QueryArrayResult<[number, string, string, string, string]>,
      Error
    >
  >(
    async () =>
      await (window as Window).electronAPI.query(`
        SELECT
          e.oid AS extension_oid,
          e.extname AS extension_name,
          e.extversion AS extension_version,
          n.nspname AS extension_schema,
          c.description AS extension_description
        FROM pg_extension e
        LEFT JOIN pg_namespace n ON n.oid = e.extnamespace
        LEFT JOIN pg_description c ON c.objoid = e.oid AND c.classoid = 'pg_extension'::regclass
        ORDER BY extension_name;
      `)
  );

  if (error) {
    console.warn("Error requesting extensions.");
  }

  return (
    data?.rows.map(([id, name, version, schema, description]) => ({
      name: name,
      version: version,
      schema: schema,
      description: description,
      type: BaseEntityType.Extension,
      children: null,
      id: String(id),
    })) || []
  );
};

/**
 * Extensions are global, so we apply them to every schema.
 * @param schemas
 * @param extensions
 * @returns
 */
const processExtensions = (schemas: Array<Schema>, extensions: Extension[]) => {
  return schemas.map((x) => ({
    ...x,
    extensions,
  }));
};

export const getSchemaOrSchemas = async (
  schemaName?: string
): Promise<Array<Schema>> => {
  let schemas: Array<Schema> = [];
  const primaryKeysPromise = getPrimaryKeys(schemaName);
  const foreignKeysPromise = getForeignKeys(schemaName);
  const tablesAndViewsPromise = getTablesAndViews(schemaName);
  const userFunctionsPromise = getUserFunctions(schemaName);
  const constraintsPromise = getConstraints(schemaName);
  const extensionsPromise = getExtensions();

  try {
    const [primaryKeys, foreignKeys, constraints] = await Promise.all([
      primaryKeysPromise,
      foreignKeysPromise,
      constraintsPromise,
    ]);

    try {
      const { data, error } = await tablesAndViewsPromise;

      if (error) {
        throw error;
      }
      schemas = processSchemas(data, primaryKeys, foreignKeys, constraints);
    } catch (err) {
      console.error("Error retrieving schema: ", err);
      throw err;
    }
  } catch (err) {
    console.error("Error retrieving primary and foreign keys: ", err);
    throw err;
  }

  try {
    const { data, error } = await userFunctionsPromise;
    if (error) {
      throw error;
    }
    if (data) {
      const schemasWithUserFunctions = processUserFunctions(schemas, data);
      schemas = schemasWithUserFunctions;
    } else {
      console.warn("Empty user functions data.");
    }
  } catch (err) {
    console.error("Error processing user functions: ", err);
    throw err;
  }

  try {
    const extensions = await extensionsPromise;
    const schemasWithExtensions = processExtensions(schemas, extensions);
    schemas = schemasWithExtensions;
  } catch (err) {
    console.error("Error processing extensions: ", err);
  }
  return schemas;
};

type DatabaseValue = [
  // Database name
  string
];
export const getCurrentDatabase = async (): Promise<string | undefined> => {
  try {
    let tries = 0;
    let running = false;

    const results: QueryArrayResult<[string]> = await new Promise(
      (res, rej) => {
        const intervalId = setInterval(async () => {
          // Skip when there is another running
          if (running) {
            return;
          }

          try {
            running = true;
            const {
              data,
              error,
            }: APIResponse<QueryArrayResult<[string]>, APIError> = await (
              window as Window
            ).electronAPI.query(`SELECT current_database();`);
            clearInterval(intervalId);

            if (error) {
              rej(error);
              // TODO: Handle case when data is undefined.
            } else if (data) {
              res(data);
            }
          } catch (err) {
            if (tries >= 10) {
              clearInterval(intervalId);
              rej(err);
            }
          } finally {
            tries += 1;
            running = false;
          }
        }, 1000);
      }
    );

    return results.rows[0][0];
  } catch (err) {
    console.error("Error retrieving databases: ", err);
  }

  return undefined;
};

export const getCurrentSearchPath = async (
  panelId?: string
): Promise<[string]> => {
  const { data } = await retry<APIResponse<QueryArrayResult<[string]>, Error>>(
    async () =>
      await (window as Window).electronAPI.query(
        "SHOW search_path;",
        undefined,
        panelId
      )
  );
  if (data && data.rows[0]) {
    return data.rows[0];
  }

  throw new Error("No search path defined.");
};

export const getCurrentSchema = async (): Promise<[string, string]> => {
  const { data } = await retry<
    APIResponse<QueryArrayResult<[string, string]>, Error>
  >(
    async () =>
      await (window as Window).electronAPI.query(
        `SELECT oid, nspname AS schema_id FROM pg_namespace WHERE nspname = CURRENT_SCHEMA;`
      )
  );
  if (data && data.rows[0]) {
    return data.rows[0];
  }

  throw new Error("No current schema defined.");
};

export const getDatabases = async (): Promise<Array<string>> => {
  try {
    let tries = 0;
    let running = false;

    const results: QueryArrayResult<[string]> = await new Promise(
      (res, rej) => {
        const intervalId = setInterval(async () => {
          // Skip when there is another running
          if (running) {
            return;
          }

          try {
            running = true;
            const {
              data,
              error,
            }: APIResponse<QueryArrayResult<[string]>, DatabaseError> = await (
              window as Window
            ).electronAPI.query(
              `
SELECT datname
FROM pg_database
WHERE datistemplate = false
ORDER BY datname DESC;
          `,
              []
            );
            clearInterval(intervalId);

            if (error) {
              rej(error);
              // TODO: Handle case when data is undefined.
            } else if (data) {
              res(data);
            }
          } catch (err) {
            if (tries >= 10) {
              clearInterval(intervalId);
              rej(err);
            }
          } finally {
            tries += 1;
            running = false;
          }
        }, 1000);
      }
    );

    return (results.rows as Array<DatabaseValue>)?.map((value) => {
      const [databaseName] = value;
      return databaseName;
    });
  } catch (err) {
    console.error("Error retrieving databases: ", err);
  }

  return [];
};

export const parsePlan = (analyze: ClientResult<Array<string>> | undefined) => {
  try {
    if (analyze) {
      const planRow = analyze.rows[0];
      if (planRow) {
        // Clone object (immutability)
        return JSON.parse(JSON.stringify(planRow[0]))[0] as AnalyzeQueryResult;
      } else {
        console.error("Plan row is missing");
      }
    } else {
      return undefined;
    }
  } catch (err) {
    console.error("Error parsing plane: ", err);
  }
};

export interface AnalyzeQueryResult {
  Plan: PlanDetails;
}

export interface PlanDetails {
  "Node Type": string;
  "Parallel Aware": boolean;
  "Async Capable": boolean;
  "Relation Name"?: string;
  Alias?: string;
  "Startup Cost": number;
  "Total Cost": number;
  "Plan Rows": number;
  "Plan Width": number;
  "Independent Cost"?: number; // Independent cost of the node
  "Relative Cost"?: number; // Percentage of total plan cost
  Filter?: string;
  "Join Type"?: string;
  "Join Filter"?: string;
  "Hash Cond"?: string;
  "Sort Key"?: Array<string>;
  Plans?: PlanDetails[]; // For nested plans
}

export function collectNodeTypes(results: AnalyzeQueryResult[]): {
  planArray: Array<PlanDetails>;
  planCounter: Record<string, number>;
  plansDic: Record<string, Array<PlanDetails>>;
  sortedPlanTypes: Array<{
    type: string;
    count: number;
    totalCost: number;
  }>;
} {
  const planArray: Array<PlanDetails> = [];
  const planCounter: Record<string, number> = {};
  const plansDic: Record<string, Array<PlanDetails>> = {};
  const planTypeCosts: Record<string, number> = {};

  function calculateCosts(plan: PlanDetails, totalPlanCost: number): number {
    // If no child plans, the entire cost is independent
    if (!plan.Plans || plan.Plans.length === 0) {
      plan["Independent Cost"] = plan["Total Cost"];
      plan["Relative Cost"] = (plan["Independent Cost"] / totalPlanCost) * 100;
      return plan["Total Cost"];
    }

    // Calculate total cost of child plans
    const childrenTotalCost = plan.Plans.reduce(
      (sum, subplan) => sum + calculateCosts(subplan, totalPlanCost),
      0
    );

    // Independent cost is the total cost minus the children's cost
    plan["Independent Cost"] = plan["Total Cost"] - childrenTotalCost;

    // Calculate relative cost
    plan["Relative Cost"] = (plan["Independent Cost"] / totalPlanCost) * 100;

    return plan["Total Cost"];
  }

  function traversePlan(plan: PlanDetails) {
    planArray.push(plan);

    // Count occurrences of each plan type
    const nodeType = plan["Node Type"];
    planCounter[nodeType] = (planCounter[nodeType] || 0) + 1;

    // Accumulate total cost for each plan type
    planTypeCosts[nodeType] =
      (planTypeCosts[nodeType] || 0) + (plan["Independent Cost"] || 0);

    if (!plansDic[nodeType]) {
      plansDic[nodeType] = [];
    }
    plansDic[nodeType].push(plan);

    if (plan.Plans) {
      for (const subplan of plan.Plans) {
        traversePlan(subplan);
      }
    }
  }

  for (const result of results) {
    if (result.Plan) {
      // First calculate costs relative to total plan cost
      const totalPlanCost = result.Plan["Total Cost"];
      calculateCosts(result.Plan, totalPlanCost);

      // Then traverse to populate other data structures
      traversePlan(result.Plan);
    }
  }

  // Sort each array in plansDic by Total Cost in descending order
  Object.keys(plansDic).forEach((key) => {
    plansDic[key].sort((a, b) => b["Total Cost"] - a["Total Cost"]);
  });

  // Create a sorted array of plan types
  const sortedPlanTypes = Object.keys(planCounter)
    .map((type) => ({
      type,
      count: planCounter[type],
      totalCost: planTypeCosts[type],
    }))
    .sort((a, b) => {
      // Primary sort by total cost, secondary by count
      if (b.totalCost !== a.totalCost) {
        return b.totalCost - a.totalCost;
      }
      return b.count - a.count;
    });

  return {
    planArray,
    planCounter,
    plansDic,
    sortedPlanTypes,
  };
}

export const formatRowCount = (rowsCount: number | undefined) => {
  if (rowsCount === undefined) {
    return "";
  } else if (rowsCount === 0) {
    return "0 rows";
  } else if (rowsCount > 1) {
    return `${rowsCount} rows`;
  } else if (rowsCount === 1) {
    return "1 row";
  }
};

export const formatLatencyorTiming = (latency: number) => {
  if (latency < 1) {
    return `<1ms`;
  } else if (latency < 1000) {
    return `${latency.toFixed(0)}ms`;
  } else if (latency < 60000) {
    return `${(latency / 1000).toFixed(2)}s`;
  } else if (latency < 3600000) {
    return `${(latency / 60000).toFixed(2)}m`;
  } else {
    return `${(latency / 3600000).toFixed(2)}h`;
  }
};
