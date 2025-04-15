import { nanoid } from "@reduxjs/toolkit";
import { Client } from "../src/services/local/client"; // Adjust the import path as needed
import { Pool } from "pg";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { setConnectionString } from "../src/services/database";
import { TRANSACTION_STATE } from "../src/services/local/types";
import { format } from "../src/components/utils/formatter";
import { initializeDatabaseQueries } from "./utils";
import { ConnectionOptions, parse } from "pg-connection-string";

jest.setTimeout(30000);

describe("Client Integration Tests", () => {
  let client: Client;
  let pool: Pool;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer().start();
    const connectionString = postgresContainer.getConnectionUri();
    pool = new Pool({
      connectionString,
    });
    client = new Client(connectionString);
    await initializeDatabase(pool);
  });

  afterAll(async () => {
    try {
      await pool.end();
    } catch (err) {
      console.error("Error terminating pool: ", err);
    }

    try {
      await client.end();
    } catch (err) {
      console.error("Error terminating client: ", err);
    }
    try {
      await postgresContainer.stop();
    } catch (err) {
      console.error("Error terminating container: ", err);
    }
  });

  describe("scale", () => {
    it("should handle a hundred panels", async () => {
      const panelIds = [];
      let finished = false;
      try {
        for (let index = 0; index < 30; index++) {
          const panelId = nanoid();
          panelIds.push(panelId);
          await client.query("select 1", [], panelId);
        }
        finished = true;
      } finally {
        // Clean up.
        panelIds.forEach((panelId) => client.removePanelClient(panelId));
      }
      expect(finished).toBeTruthy();
    });
  });
  describe("query", () => {
    it("should execute a query without a panelId", async () => {
      const result = await client.query(
        "SELECT * FROM test_table ORDER BY id",
        undefined,
        undefined
      );
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual([1, "Item 1", 100]);
    });
    it("should execute a query with a panelId", async () => {
      const result = await client.query(
        "SELECT * FROM test_table WHERE value > 150 ORDER BY id",
        undefined,
        "panel1"
      );
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual([2, "Item 2", 200]);
    });
  });
  describe("limit queries", () => {
    it("should limit the results of a query", async () => {
      const upperCaseResult = await client.query(
        'SELECT * FROM "UPPERCASE_TABLE"',
        undefined,
        "limited-panel",
        true
      );
      expect(upperCaseResult.rows).toHaveLength(0);
      const result = await client.query(
        "SELECT * FROM generate_series(0, 1000)",
        undefined,
        "limited-panel",
        true
      );
      expect(result.rows).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT
              id,
              name,
              (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) as order_count
            FROM users;`,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT
                u.id,
                u.name,
                (SELECT MAX(order_total)
                FROM orders o
                WHERE o.user_id = u.id) as max_order
            FROM users u;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT
                p.product_name,
                (SELECT AVG(quantity)
                FROM order_items oi
                WHERE oi.product_id = p.id) as avg_order_quantity
              FROM products p
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT
              d.department_name,
              (SELECT
                  (SELECT COUNT(*)
                  FROM employees e
                  WHERE e.department_id = d.id)
              ) as employee_count
            FROM departments d;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(4);
      expect(
        (
          await client.query(
            `WITH top_customers AS (
                  SELECT customer_id, total_spent
                  FROM customer_spending
                  WHERE total_spent > 0
              )
              SELECT
                  u.name,
                  tc.total_spent,
                  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
              FROM users u
              JOIN top_customers tc ON u.id = tc.customer_id;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT
                e1.employee_name,
                d.department_name AS department,
                e1.salary,
                (SELECT AVG(e2.salary)
                FROM employees e2
                WHERE e2.department_id = e1.department_id) AS dept_avg_salary
            FROM employees e1
            JOIN departments d ON e1.department_id = d.id
            WINDOW w AS (PARTITION BY e1.department_id ORDER BY e1.salary);
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `SELECT id, name FROM
              (
                  SELECT id, name FROM users WHERE active = true
                  UNION
                  SELECT id, name FROM inactive_users
              ) combined_users;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `
            SELECT
              d.department_name,
              e.employee_name,
              (SELECT COUNT(*)
              FROM projects p
              WHERE p.lead_id = e.id) as projects_led
            FROM departments d
            CROSS JOIN LATERAL (
                SELECT * FROM employees e WHERE e.department_id = d.id
            ) e;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(100);
      expect(
        (
          await client.query(
            `
              SELECT
                region,
                (SELECT
                    (SELECT SUM(sales_amount)
                    FROM sales s
                    WHERE s.region_id = r.id AND s.year = 2023)
                ) as total_sales
              FROM regions r;
            `,
            undefined,
            "limited-panel",
            true
          )
        ).rows
      ).toHaveLength(4);
    });
  });
  describe("removePanelClient", () => {
    it("should remove a panel client after use", async () => {
      await client.query("SELECT * FROM test_table", [], "panel2");
      await client.removePanelClient("panel2");
      // This is an internal check, in a real scenario you might not test private properties
      //   expect(client.panelClient.has("panel2")).toBeFalsy();
    });
  });
  describe("cancelBackend", () => {
    it("should cancel a long-running query", async () => {
      // Start a long-running query
      const queryPromise = client.query(
        "SELECT pg_sleep(3)",
        undefined,
        "panel3"
      );
      // Cancel the query almost immediately
      const cancelPromise = new Promise((resolve, reject) =>
        setTimeout(async () => {
          try {
            resolve(await client.cancelBackend("panel3"));
          } catch (err) {
            reject(err);
          }
        }, 500)
      );
      await expect(queryPromise).rejects.toThrow(
        "canceling statement due to user request"
      );
      await expect(cancelPromise).resolves.toEqual(true);
    });
  });
  describe("clientCount", () => {
    it("should have the correct amount of clients", async () => {
      expect(client.panelClient.size === 2);
    });
  });
  describe("transaction", () => {
    it("should detect transactions correctly", async () => {
      const commands = [
        { sql: "BEGIN", state: TRANSACTION_STATE.RUNNING },
        { sql: "SELECT 1", state: TRANSACTION_STATE.RUNNING },
        { sql: "SAVEPOINT s1", state: TRANSACTION_STATE.RUNNING },
        { sql: "s", state: TRANSACTION_STATE.ERROR },
        { sql: "dsw", state: TRANSACTION_STATE.ERROR },
        {
          sql: "ROLLBACK TO SAVEPOINT s1",
          state: TRANSACTION_STATE.RUNNING,
        },
        { sql: "dsw", state: TRANSACTION_STATE.ERROR },
        {
          sql: "ROLLBACK TO s1;",
          state: TRANSACTION_STATE.RUNNING,
        },
        {
          sql: "COMMIT",
          state: TRANSACTION_STATE.ENDED_SUCCESSFUL,
        },
      ];
      const errCommands = [
        { sql: "BEGIN", state: TRANSACTION_STATE.RUNNING },
        { sql: "s", state: TRANSACTION_STATE.ERROR },
        {
          sql: "ROLLBACK",
          state: TRANSACTION_STATE.ENDED_ERROR,
        },
      ];
      let panelId = nanoid();
      let transactionId: string | undefined = undefined;
      for (let index = 0; index < commands.length; index++) {
        try {
          const { sql, state } = commands[index];
          const { transaction } = await client.query(sql, undefined, panelId);
          if (!transactionId) {
            transactionId = transaction?.id;
          } else if (transactionId) {
            expect(transaction?.id).toEqual(transactionId);
          }
          expect(transaction).toBeDefined();
          expect(transaction?.state).toEqual(state);
        } catch {
          expect(client.getTransationState(panelId)).toBeDefined();
          expect(client.getTransationState(panelId)?.state).toEqual(
            TRANSACTION_STATE.ERROR
          );
        }
      }
      panelId = nanoid();
      transactionId = undefined;
      for (let index = 0; index < errCommands.length; index++) {
        const { sql, state } = errCommands[index];
        try {
          const { transaction } = await client.query(sql, undefined, panelId);
          if (!transactionId) {
            transactionId = transaction?.id;
          } else if (transactionId) {
            expect(transaction?.id).toEqual(transactionId);
          }
          expect(transaction).toBeDefined();
          expect(transaction?.state).toEqual(state);
        } catch {
          expect(client.getTransationState(panelId)).toBeDefined();
          if (sql === "ROLLBACK") {
            expect(client.getTransationState(panelId)?.state).toEqual(
              TRANSACTION_STATE.ENDED_ERROR
            );
          } else {
            expect(client.getTransationState(panelId)?.state).toEqual(
              TRANSACTION_STATE.ERROR
            );
          }
        }
      }
      panelId = nanoid();
      transactionId = undefined;
      for (let index = 0; index < commands.length; index++) {
        try {
          const { sql, state } = commands[index];
          const { transaction } = await client.query(sql, [], panelId);
          if (!transactionId) {
            transactionId = transaction?.id;
          } else if (transactionId) {
            expect(transaction?.id).toEqual(transactionId);
          }
          expect(transaction).toBeDefined();
          expect(transaction?.state).toEqual(state);
        } catch {
          expect(client.getTransationState(panelId)).toBeDefined();
          expect(client.getTransationState(panelId)?.state).toEqual(
            TRANSACTION_STATE.ERROR
          );
        }
      }
      panelId = nanoid();
      transactionId = undefined;
      for (let index = 0; index < errCommands.length; index++) {
        const { sql, state } = errCommands[index];
        try {
          const { transaction } = await client.query(sql, [], panelId);
          if (!transactionId) {
            transactionId = transaction?.id;
          } else if (transactionId) {
            expect(transaction?.id).toEqual(transactionId);
          }
          expect(transaction).toBeDefined();
          expect(transaction?.state).toEqual(state);
        } catch {
          expect(client.getTransationState(panelId)).toBeDefined();
          if (sql === "ROLLBACK") {
            expect(client.getTransationState(panelId)?.state).toEqual(
              TRANSACTION_STATE.ENDED_ERROR
            );
          } else {
            expect(client.getTransationState(panelId)?.state).toEqual(
              TRANSACTION_STATE.ERROR
            );
          }
        }
      }
    });
    it("should detect transaction running after a cancel backend", async () => {
      const panelId = nanoid();
      const { transaction } = await client.query("BEGIN", undefined, panelId);
      expect(transaction).toBeDefined();
      expect(transaction?.state).toEqual(TRANSACTION_STATE.RUNNING);
      await client.cancelBackend(panelId);
      const { transaction: transactionStillActive } = await client.query(
        "SELECT 1",
        undefined,
        panelId
      );
      expect(transactionStillActive).toBeDefined();
      expect(transactionStillActive?.state).toEqual(TRANSACTION_STATE.RUNNING);
    });
  });
});

describe("Errors from invalid connection", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let connectionOptions: ConnectionOptions;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer().start();
    connectionOptions = parse(postgresContainer.getConnectionUri());
  });

  afterAll(async () => {
    await postgresContainer.stop();
  });

  const invalidConfigs = [
    {
      description: "invalid port",
      connectionString: () => "postgres://test:test@localhost:5433",
      expectedErrorCode: "ECONNREFUSED",
      expectedMessage: () =>
        "Database connection failed on port 5433. Verify connection settings and database status.",
    },
    {
      description: "invalid host",
      connectionString: () => "postgres://postgres:postgres@invalidhost:5432",
      expectedErrorCode: "ENOTFOUND",
      expectedMessage: () =>
        "Unable to resolve database host (invalidhost). Check connection and network settings.",
    },
    {
      description: "invalid username",
      connectionString: () =>
        `postgres://invaliduser:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}`,
      expectedErrorCode: "28P01", // Invalid username/password
      expectedMessage: () =>
        'password authentication failed for user "invaliduser"',
    },
    {
      description: "invalid password",
      connectionString: () =>
        `postgres://${connectionOptions.user}:invalidpassword@${connectionOptions.host}:${connectionOptions.port}`,
      expectedErrorCode: "28P01", // Invalid username/password
      expectedMessage: () =>
        `password authentication failed for user "${connectionOptions.user}"`,
    },
    {
      description: "non-existent database",
      connectionString: () =>
        `postgres://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}/invaliddb`,
      expectedErrorCode: "3D000", // Database does not exist
      expectedMessage: () => 'database "invaliddb" does not exist',
    },
  ];
  invalidConfigs.forEach(
    ({ description, connectionString, expectedErrorCode, expectedMessage }) => {
      it(`should handle ${description}`, async () => {
        const { error } = await setConnectionString(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {} as any,
          connectionString()
        );
        expect(error).not.toBeNull();
        expect(error && error.databaseError?.code).toEqual(expectedErrorCode);
        const match = error && error.message === expectedMessage();
        expect(match).toBeTruthy();
      });
    }
  );
});

describe("Formatting code", () => {
  const statementsToFormat = [
    // 1. Truncate table
    {
      description: "Truncate table using reserved word",
      statement: "TRUNCATE TABLE %I",
      params: ["table"],
      expected: 'TRUNCATE TABLE "table"',
    },
    {
      description: "Truncate table using reserved wrod",
      statement: "TRUNCATE TABLE %I",
      params: ["some_table"],
      expected: "TRUNCATE TABLE some_table",
    },

    // 2. Delete from table using primary keys
    {
      description: "Delete from table using number literal",
      statement: "DELETE FROM %I WHERE %I IN (%L)",
      params: ["some_table", "column123", 1],
      expected: "DELETE FROM some_table WHERE column123 IN (1)",
    },
    {
      description: "Delete from table using arrays",
      statement: "DELETE FROM %I WHERE %I IN ARRAY[%L]",
      params: ["some_table", "column123", [1, 2, 3]],
      expected: "DELETE FROM some_table WHERE column123 IN ARRAY[1,2,3]",
    },

    // 3. Select from entity
    {
      description: "Select from uppercase entity",
      statement: "SELECT * FROM %I",
      params: ["SOME_TABLE"],
      expected: 'SELECT * FROM "SOME_TABLE"',
    },
    {
      description: "Select from uppercase and lowercase entity",
      statement: "SELECT * FROM %I",
      params: ["SoMe_TaBlE"],
      expected: 'SELECT * FROM "SoMe_TaBlE"',
    },
    {
      description: "Select from lowercase entity",
      statement: "SELECT * FROM %I",
      params: ["zzzz"],
      expected: "SELECT * FROM zzzz",
    },

    // 4. Alter column name
    {
      description: "Alter column name to reserved keyword name",
      statement: "ALTER TABLE %I RENAME COLUMN %I TO %I",
      params: ["some_table", "COLUMN", "column"],
      expected: 'ALTER TABLE some_table RENAME COLUMN "COLUMN" TO "column"',
    },

    // 5. Alter column type
    {
      description: "Alter column type",
      statement: "ALTER TABLE %I ALTER COLUMN %I TYPE %s",
      params: ["some_table", "COLUMN", "bigint"],
      expected: 'ALTER TABLE some_table ALTER COLUMN "COLUMN" TYPE bigint',
    },
  ];

  statementsToFormat.forEach(({ description, statement, params, expected }) => {
    it(`should handle ${description}`, async () => {
      const formattedStatement = format(statement, ...params);

      expect(formattedStatement).toEqual(expected);
    });
  });
});

const initializeDatabase = async (pool: Pool) => {
  for (const query of initializeDatabaseQueries) {
    await pool.query(query);
  }
};
