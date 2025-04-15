import { Schema, SchemaColumn, SchemaTable } from "@/features/schema";

export function schemaToString(schema: Schema): string {
  let result = `Database Schema: ${schema.name}\n\n`;

  // Process tables
  if (schema.tables && schema.tables.length > 0) {
    result += "Tables:\n";
    schema.tables
      .filter((x) => !x.name.startsWith("pk_"))
      .sort((a, b) => (a.totalQueries ?? 0) - (b.totalQueries ?? 0))
      .forEach((table: SchemaTable) => {
        result += `\nTable: ${table.name}\n`;
        if (table.children && table.children.length > 0) {
          result += "Columns:\n";
          table.children.forEach((column: SchemaColumn) => {
            // Build key information string
            let keyInfo = "";
            if (column.key) {
              switch (column.key.type) {
                case "PRIMARY":
                  keyInfo = " (Primary Key)";
                  break;
                case "FOREIGN":
                  keyInfo = " (Foreign Key)";
                  break;
                case "FOREIGN_PRIMARY":
                  keyInfo = " (Foreign & Primary Key)";
                  break;
              }
            }

            result += `  - ${column.name}: ${column.columnType}${keyInfo}\n`;
          });
        }
      });
  }

  // Process views
  if (schema.views && schema.views.length > 0) {
    result += "\nViews:\n";
    schema.views.forEach((view) => {
      result += `\nView: ${view.name}\n`;
      if (view.children && view.children.length > 0) {
        result += "Columns:\n";
        view.children.forEach((column: SchemaColumn) => {
          result += `  - ${column.name}: ${column.columnType}\n`;
        });
      }
    });
  }

  // Process functions
  if (schema.functions && schema.functions.length > 0) {
    result += "\nFunctions:\n";
    schema.functions.forEach((func) => {
      result += `\nFunction: ${func.name}\n`;
      result += `Return Type: ${func.returnType.join(", ")}\n`;
      result += `Arguments: ${func.args.join(", ")}\n`;
      if (func.functionDescription) {
        result += `Description: ${func.functionDescription}\n`;
      }
    });
  }

  // Process user functions
  if (schema.userFunctions && schema.userFunctions.length > 0) {
    result += "\nUser Functions:\n";
    schema.userFunctions.forEach((func) => {
      result += `\nUser Function: ${func.name}\n`;
      result += `Return Type: ${func.returnType}\n`;
      if (func.functionDescription) {
        result += `Description: ${func.functionDescription}\n`;
      }
    });
  }

  // Process procedures
  if (schema.procedures && schema.procedures.length > 0) {
    result += "\nProcedures:\n";
    schema.procedures.forEach((proc) => {
      result += `\nProcedure: ${proc.name}\n`;
    });
  }

  return result;
}
