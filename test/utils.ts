export const initializeDatabaseQueries = [
  `CREATE TABLE "UPPERCASE_TABLE" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      active BOOLEAN DEFAULT true
    );`,

  `CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      active BOOLEAN DEFAULT true
    );`,

  `INSERT INTO users (name, active) 
    SELECT 'User ' || generate_series(1, 200), 
    random() > 0.2;`,

  `CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        order_total DECIMAL(10,2),
        order_date DATE
    );`,

  `INSERT INTO orders (user_id, order_total, order_date)
    SELECT 
        (random() * 200 + 1)::INT, 
        (random() * 1000)::DECIMAL(10,2), 
        '2023-01-01'::DATE + (random() * 365)::INT;`,

  `CREATE TABLE departments (
        id SERIAL PRIMARY KEY,
        department_name VARCHAR(100)
    );`,

  `INSERT INTO departments (department_name)
    VALUES 
        ('Sales'), 
        ('Marketing'), 
        ('Engineering'), 
        ('HR');`,

  `CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(100),
        department_id INTEGER REFERENCES departments(id),
        salary DECIMAL(10,2)
    );`,

  `INSERT INTO employees (employee_name, department_id, salary)
    SELECT 
      'Employee ' || generate_series(1, 150),
      (random() * 3 + 1)::INT,
      (random() * 10000 + 30000)::DECIMAL(10,2);`,

  `CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(100)
    );`,

  `INSERT INTO products (product_name)
    SELECT 'Product ' || generate_series(1, 100);`,

  `CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER
    );`,

  `INSERT INTO order_items (order_id, product_id, quantity)
    SELECT 
        (SELECT id FROM orders LIMIT 1)::INT,
        (SELECT id FROM products LIMIT 1)::INT,
        (random() * 10 + 1)::INT;`,

  `CREATE TABLE customer_spending (
        customer_id INTEGER PRIMARY KEY,
        total_spent DECIMAL(10,2)
    );`,

  `INSERT INTO customer_spending (customer_id, total_spent)
    SELECT 
        generate_series(1, 100),
        (random() * 5000 + 500)::DECIMAL(10,2);`,

  `CREATE TABLE inactive_users (
        id INTEGER PRIMARY KEY,
        name VARCHAR(100)
    );`,

  `INSERT INTO inactive_users (id, name)
    SELECT id, name FROM users WHERE active = false LIMIT 50;`,

  `CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        lead_id INTEGER
    );`,

  `INSERT INTO projects (name, lead_id)
    SELECT 
        'Project ' || generate_series(1, 50),
        (random() * (SELECT COUNT(*) FROM employees) + 1)::INT;`,

  `CREATE TABLE regions (
        id SERIAL PRIMARY KEY,
        region VARCHAR(100)
    );`,

  `INSERT INTO regions (region)
    VALUES 
        ('North'), 
        ('South'), 
        ('East'), 
        ('West');`,

  `CREATE TABLE sales (
        id SERIAL PRIMARY KEY,
        region_id INTEGER REFERENCES regions(id),
        sales_amount DECIMAL(10,2),
        year INTEGER
    );`,

  `INSERT INTO sales (region_id, sales_amount, year)
    SELECT 
        (random() * 3 + 1)::INT,
        (random() * 100000)::DECIMAL(10,2),
        2023;`,

  `CREATE OR REPLACE VIEW employee_project_count AS
    SELECT e.id, e.employee_name, 
          (SELECT COUNT(*) FROM projects p WHERE p.lead_id = e.id) as projects_led
    FROM employees e;`,

  `CREATE TABLE IF NOT EXISTS test_table (
      id SERIAL PRIMARY KEY,
      name TEXT,
      value INTEGER
    )`,

  `INSERT INTO test_table (name, value) VALUES
    ('Item 1', 100),
    ('Item 2', 200),
    ('Item 3', 300)`,
  `CREATE ROLE test_role
    LOGIN
    SUPERUSER             -- Superuser privileges
    NOINHERIT             -- No inheritance
    CREATEROLE            -- Can create roles
    NOCREATEDB            -- Cannot create databases
    REPLICATION           -- Replication privileges
    BYPASSRLS;            -- Bypass row-level security (PostgreSQL 9.5+)`,
  `COMMENT ON ROLE test_role IS 'Role with various attributes for testing purposes'`,
  `CREATE SCHEMA test_schema AUTHORIZATION test_role;`,
  `GRANT USAGE ON SCHEMA test_schema TO PUBLIC;`,
  ` ALTER DEFAULT PRIVILEGES FOR ROLE test_role IN SCHEMA test_schema
    GRANT SELECT, INSERT ON TABLES TO PUBLIC;`,
  ` ALTER DEFAULT PRIVILEGES FOR ROLE test_role IN SCHEMA test_schema
    GRANT USAGE, SELECT ON SEQUENCES TO PUBLIC;`,
  ` ALTER DEFAULT PRIVILEGES FOR ROLE test_role IN SCHEMA test_schema
    GRANT EXECUTE ON FUNCTIONS TO PUBLIC;`,
  `CREATE VIEW sales_view AS SELECT * FROM sales;`,
  `CREATE VIEW orders_view AS SELECT * FROM orders;`,
  `CREATE MATERIALIZED VIEW sales_materialized_view AS SELECT * FROM sales;`,
  `CREATE MATERIALIZED VIEW orders_materialized_view AS SELECT * FROM orders;`,
  `CREATE SEQUENCE seq_example1
  START 1
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 1000000
  CACHE 1;`,
  `CREATE SEQUENCE seq_example2
  START 1000
  INCREMENT 10
  MINVALUE 1000
  MAXVALUE 1000000
  CACHE 1;`,
  `CREATE TYPE composite_type AS (
      name VARCHAR(100),
      age INT
  );`,
  // `CREATE TYPE color_type AS (
  //   red INT CHECK (red >= 0 AND red <= 255),
  //   green INT CHECK (green >= 0 AND green <= 255),
  //   blue INT CHECK (blue >= 0 AND blue <= 255)
  // );`,
  // `CREATE DOMAIN random_domain AS TEXT
  // CHECK (VALUE ~ '^[a-z0-9]{5,15}\\.com$');`,
];
