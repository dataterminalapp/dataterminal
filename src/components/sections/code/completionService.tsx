import { Schema } from "@/features/schema";
import {
  CompletionService,
  ICompletionItem,
  EntityContextType,
} from "monaco-sql-languages";
import { quoteIdent } from "../../utils/formatter";

/**
 * A builder class for constructing completion services for the Monaco Editor.
 * This class is responsible for managing schema-based completions, including
 * tables, views, columns, and functions, and providing suggestions based on
 * the current context in the editor.
 */
export class CompletionServiceBuilder {
  /**
   * The schemas used for generating completion items.
   */
  schemas: Array<Schema> | undefined;

  /**
   * The search path used to determine schema visibility.
   * Defaults to a set containing "public".
   */
  searchPath: Set<string> | undefined;

  /**
   * Completion items for columns.
   */
  columnsCompletions: Array<ICompletionItem> = [];

  /**
   * Completion items for tables.
   */
  tablesCompletions: Array<ICompletionItem> = [];

  /**
   * Completion items for views.
   */
  viewsCompletions: Array<ICompletionItem> = [];

  /**
   * A map of entity IDs to their respective column completion items.
   */
  columnsPerEntity = new Map<string, Array<ICompletionItem>>();

  /**
   * Completion items for functions.
   */
  functionCompletions: Array<ICompletionItem> = [];

  /**
   * Constructs a new instance of the CompletionServiceBuilder.
   *
   * @param schemas - An optional array of schemas to initialize the builder with.
   * @param searchPath - An optional set of schema names to use as the search path.
   */
  constructor(schemas?: Array<Schema>, searchPath?: Set<string>) {
    this.schemas = schemas;
    this.searchPath = searchPath || new Set(["public"]);
  }

  /**
   * Updates the schemas used for generating completions and rebuilds the completion items.
   *
   * @param schemas - The new array of schemas to use.
   */
  updateSchemas(schemas: Array<Schema> | undefined) {
    this.schemas = schemas;
    this.clearCompletions();
    this.buildCompletions();
  }

  /**
   * Updates the search path used for determining schema visibility.
   *
   * @param searchPath - The new set of schema names to use as the search path.
   */
  updateSearchPath(searchPath: Set<string> | undefined) {
    this.searchPath = searchPath;
    this.clearCompletions();
    this.buildCompletions();
  }

  /**
   * Clears all existing completion items, resetting the builder's state.
   */
  clearCompletions() {
    this.columnsCompletions = [];
    this.tablesCompletions = [];
    this.viewsCompletions = [];
    this.functionCompletions = [];
    this.columnsPerEntity = new Map();
  }

  /**
   * Formats the insert text for an entity (e.g., table or view) based on its schema and name.
   *
   * @param schema - The schema name of the entity.
   * @param entityName - The name of the entity.
   * @returns The formatted insert text for the entity.
   */
  formatInsertText(schema: string, entityName: string) {
    if (this.searchPath?.has(schema)) {
      return quoteIdent(entityName);
    } else {
      return quoteIdent(schema) + "." + quoteIdent(entityName);
    }
  }

  /**
   * Builds completion items for the schemas, including tables, views, columns, and functions.
   * If no schemas are provided, clears all existing completions.
   */
  buildCompletions() {
    if (this.schemas) {
      this.schemas.map((schema) => {
        const { functions, tables, views } = schema;
        functions.map((x) =>
          this.functionCompletions.push({
            kind: 1,
            label: x.name,
            detail: "Function",
            sortText: "4_" + x.priority + "_" + x.name,
            insertText: quoteIdent(x.name),
          })
        );

        views.map((x) => {
          this.viewsCompletions.push({
            kind: 16,
            label: x.name,
            detail: "View",
            sortText: "4_" + x.name,
            insertText: this.formatInsertText(x.schema, x.name),
          });
          x.children.forEach((column) => {
            const newColumnCompletionItem: ICompletionItem = {
              kind: 16,
              label: {
                label: column.name,
                detail: ` (${x.name})`,
              },
              detail: "Column",
              insertText: quoteIdent(column.name),
              sortText: "1_" + column.name,
            };
            this.columnsCompletions.push(newColumnCompletionItem);
            const columnsInTable = this.columnsPerEntity.get(x.id);
            this.columnsPerEntity.set(
              x.id,
              columnsInTable
                ? [...columnsInTable, newColumnCompletionItem]
                : [newColumnCompletionItem]
            );
          });
        });

        tables.forEach((table) => {
          this.tablesCompletions.push({
            kind: 16,
            label: table.name,
            detail: "Table",
            sortText: "2_" + table.name,
            insertText: this.formatInsertText(table.schema, table.name),
          });

          table.children.forEach((column) => {
            const newColumnCompletionItem: ICompletionItem = {
              kind: 16,
              label: {
                label: column.name,
                detail: ` (${table.name})`,
              },
              detail: "Column",
              insertText: quoteIdent(column.name),
              sortText: "1_" + column.name,
            };
            this.columnsCompletions.push(newColumnCompletionItem);
            const columnsInTable = this.columnsPerEntity.get(table.id);
            this.columnsPerEntity.set(
              table.id,
              columnsInTable
                ? [...columnsInTable, newColumnCompletionItem]
                : [newColumnCompletionItem]
            );
          });
        });
      });
    } else {
      this.clearCompletions();
    }
  }
}

const buildCompletionService: (
  completionServiceBuilder: CompletionServiceBuilder
) => CompletionService = (
  completionServiceBuilder: CompletionServiceBuilder
) => {
  return (model, position, completionContext, suggestions) => {
    return new Promise((resolve) => {
      if (!suggestions) {
        return resolve([]);
      }
      const textBeforePosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      if (textBeforePosition.startsWith("\\")) {
        return resolve([]); // Avoid suggestions for meta-commands (for now).
      }

      const { syntax } = suggestions;

      let syntaxCompletionItems: ICompletionItem[] = [];

      syntax.forEach((item) => {
        const databaseCompletions: ICompletionItem[] = [];

        switch (item.syntaxContextType) {
          case EntityContextType.DATABASE:
            syntaxCompletionItems = [
              ...syntaxCompletionItems,
              ...databaseCompletions,
            ];
            break;

          case EntityContextType.VIEW:
            syntaxCompletionItems = [
              ...syntaxCompletionItems,
              ...completionServiceBuilder.viewsCompletions,
            ];
            break;

          case EntityContextType.TABLE:
            syntaxCompletionItems = [
              ...syntaxCompletionItems,
              ...completionServiceBuilder.tablesCompletions,
            ];
            break;

          case EntityContextType.COLUMN:
            syntaxCompletionItems = [
              ...syntaxCompletionItems,
              ...completionServiceBuilder.columnsCompletions,
            ];
            break;

          case EntityContextType.FUNCTION:
            syntaxCompletionItems = [
              ...syntaxCompletionItems,
              ...completionServiceBuilder.functionCompletions,
            ];
            break;
          default:
            break;
        }
      });
      resolve([...syntaxCompletionItems]);
    });
  };
};

export default buildCompletionService;
