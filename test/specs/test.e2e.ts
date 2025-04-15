import { browser } from "@wdio/globals";
import { Key } from "webdriverio";

async function executeQuery(query: string, timeout: number = 100) {
  await browser.pause(100);
  await browser.keys(query);
  const ideRunButton = await getIdeRunButton();
  if (await ideRunButton.isExisting()) {
    await ideRunButton.click();
  } else {
    await browser.keys("Enter");
  }
  await browser.pause(timeout);
}

async function openNewTab() {
  await browser.keys([Key.Command, "t"]);
  await browser.keys(Key.Command);
}

async function closeCurrentTab() {
  await browser.keys([Key.Command, "w"]);
  await browser.keys(Key.Command);
}

async function openManageConnections() {
  await browser.keys([Key.Command, "o"]);
  await browser.keys(Key.Command);
  await browser.keys("Manage Connections");
  await browser.keys(Key.Enter);
}

async function addNewConnection(uri: string) {
  await openManageConnections();

  // Arrow Up = Create connections button
  await browser.keys(Key.ArrowUp);
  await browser.keys(Key.Enter);

  // Go Back
  await browser.keys(Key.Escape);

  // Try shortcut
  await browser.keys("a");
  await browser.pause(10);
  await browser.keys(uri);
  await browser.keys(Key.Enter);
}

async function openSearchDialog(search?: string) {
  await browser.keys([Key.Command, "p"]);
  await browser.keys(Key.Command);
  await browser.pause(100);

  if (search) {
    await browser.keys(search);
    await browser.keys(Key.ArrowDown);
    await browser.keys(Key.Enter);
  }
}

async function openSearchFilter(search?: string) {
  await browser.keys([Key.Command, "f"]);
  await browser.keys(Key.Command);
  await browser.pause(100);

  if (search) {
    await browser.keys(search);
    await browser.keys(Key.Enter);
  }
}

async function openExplorerSearch(search?: string) {
  await toggleExplorer();
  await browser.keys([Key.Command, Key.Shift, "f"]);
  await browser.keys(Key.Command);
  await browser.keys(Key.Shift);
  await browser.pause(100);

  if (search) {
    await browser.keys(search);
  }
}

async function toggleExplorer() {
  await browser.keys([Key.Command, "b"]);
  await browser.keys(Key.Command);
}

async function cleanEditor() {
  await selectAllEditor();
  await browser.keys(Key.Backspace);
}

async function getIdeRunButton() {
  return await browser.$('//button[@data-testid="ide-run-button"]');
}

async function getIdeQueriesCount() {
  const element = await browser.$(
    "//div[@data-testid='ide-queries-selected-amount']"
  );
  await element.waitForDisplayed();
  return await element.getText();
}

async function selectAllEditor() {
  await browser.keys([Key.Command, "a"]);
  await browser.keys(Key.Command);
}

describe("Electron Testing", () => {
  it("should print application title", async () => {
    expect(await browser.getTitle()).toBe("Data Terminal");
  });
  it("should run e2e test over all the application", async () => {
    const continueButton = await browser.$("//button[text()='Continue']");
    expect(await continueButton.isExisting()).toBe(true);
    await browser.keys(Key.Enter);
    await browser.keys("postgresql://postgres:postgres@localhost:5432");

    const createButton = await browser.$(
      "//button[text()='Create connection']"
    );
    await createButton.click();

    await executeQuery(
      "CREATE TABLE IF NOT EXISTS random_table(random_column INT)"
    );
    await openNewTab();
    await executeQuery("SELECT 1, 'abc', 54");
    await closeCurrentTab();

    await browser.pause(150);
    await openExplorerSearch("random_table");
    await browser.pause(150);
    const randomTableSearchTable = await browser.$(
      "//p[span[text()='random_table']]"
    );
    expect(await randomTableSearchTable.isExisting()).toBe(true);
    await randomTableSearchTable.click({ button: "right" });
    await browser.pause(150);
    await browser.keys(Key.Escape);
    await browser.pause(150);
    await browser.keys([Key.Command, Key.Escape]);
    await browser.keys(Key.Command);
    await browser.pause(150);
    await closeCurrentTab();

    await openManageConnections();
    await browser.keys("r");
    await browser.pause(150);
    await browser.keys("First connection");
    await browser.keys(Key.Enter);
    await closeCurrentTab();

    await addNewConnection("postgresql://postgres:postgres@localhost:5432");
    await browser.keys(Key.ArrowDown);
    await browser.keys("r");
    await browser.pause(150);
    await browser.keys("Second connection");
    await browser.keys(Key.Enter);
    await closeCurrentTab();

    await executeQuery("INSERT INTO random_table VALUES (1), (2), (3);");
    await openSearchDialog("random_table");
    await openSearchFilter("1");
    await closeCurrentTab();

    // Remove queries in the panel
    await browser.keys(Key.ArrowUp);
    await browser.keys(Key.ArrowUp);
    await browser.keys([Key.Command, Key.Backspace]);
    await browser.keys([Key.Command]);
    await browser.keys([Key.Command, Key.Backspace]);
    await browser.keys([Key.Command]);

    // Test charts
    await executeQuery(
      "SELECT generate_series(1, 100) AS x, random() AS y, random() AS y2"
    );
    await browser.keys(Key.ArrowUp);
    await browser.keys([Key.Command, "g"]);
    await browser.keys(Key.Command);

    // Press s in case that the window is small
    await browser.keys("s");

    // Change chart type
    await browser.keys("t");
    await browser.keys(Key.ArrowDown);
    await browser.keys(Key.Enter);
    await browser.pause(50);

    // Change X axis
    await browser.keys("y");
    await browser.pause(200);
    await browser.keys("y2");
    await browser.keys(Key.ArrowDown);
    await browser.keys(Key.Enter);
    await browser.pause(200);

    // Change chart color
    await browser.keys("c");

    // Exit chart
    await browser.keys(Key.Escape);
    await browser.pause(1000);
    await browser.keys(Key.Escape);

    // Change editor layout
    await browser.keys([Key.Command, "e"]);
    await browser.keys(Key.Command);
    await executeQuery(
      "SELECT generate_series(1, 100) AS x, random() AS y, random() AS y2"
    );
    await selectAllEditor();
    await browser.keys([Key.Command, Key.Enter]);
    await browser.keys(Key.Command);

    // Close explorer
    await toggleExplorer();
    await browser.keys("SELECT wrong query;");
    await browser.keys([Key.Command, "k"]);
    await browser.keys(Key.Command);
    await browser.keys(
      "Can you please fix the select wrong query and retrieve a query that selects the numbers one two and three?"
    );
    await browser.keys(Key.Enter);
    await browser.pause(100);

    // Sign in (skip for now)
    await browser.keys([Key.Escape]);
    await browser.pause(100);
    await browser.keys([Key.Escape]);

    // Query selection
    await cleanEditor();
    await browser.keys("SELECT 100;");
    await browser.keys(Key.Enter);
    await browser.keys("SELECT 200;");
    await browser.pause(100);
    await selectAllEditor();
    const runButton = await getIdeRunButton();
    expect(await runButton.isExisting()).toBe(true);
    const queriesCount = await getIdeQueriesCount();
    expect(queriesCount).toBe("2");
    await runButton.click();

    // Change schema
    await cleanEditor();
    await executeQuery("CREATE SCHEMA IF NOT EXISTS random_schema;");
    await browser.pause(100);
    await openExplorerSearch();
    await browser.keys(Key.ArrowUp);
    await browser.keys(Key.Enter);
    await browser.keys("random_sch");
    await browser.keys(Key.ArrowDown);
    await browser.keys(Key.Enter);

    // Schema Browser
    await browser.keys([Key.Command, Key.Shift, "p"]);
    await browser.keys(Key.Command);
    const randomTableItem = await browser.$("//div[h3[text()='random_table']]");
    expect(await randomTableItem.isExisting()).toBe(true);
    await randomTableItem.click();

    await browser.pause(5000);
  });
});
