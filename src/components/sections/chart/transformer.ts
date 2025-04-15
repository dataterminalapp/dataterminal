import { FieldDef } from "pg";
import { ChartDataset, ChartTypeRegistry } from "chart.js";
import { ChartTheme, ColorfulColors, MidnightColors } from "./themeButton";
import { APIError } from "../../../services/error";

interface ChartConfig {
  xIndex: number;
  yIndex: number;
  groupByIndex?: number;
  type: keyof ChartTypeRegistry;
}

interface DataTransformerResult {
  labels: string[];
  datasets: ChartDataset[];
  error?: string;
}

export default class ChartDataTransformer {
  /**
   * Gets the value from an array result using the field definition
   */
  private static getFieldValue(
    row: unknown[],
    fieldIndex: number,
    columns: Array<FieldDef>
  ): unknown {
    const fieldDef = columns[fieldIndex];
    if (!fieldDef) return null;

    const value = row[fieldIndex];

    if (fieldDef.dataTypeID === 1082 && typeof value === "string") {
      // 1082 is the PostgreSQL type ID for date
      return new Date(value).toISOString().split("T")[0]; // Standardize date format to YYYY-MM-DD
    }

    return value;
  }

  /**
   * Returns the colors array by theme.
   */
  private static getColorsByTheme(theme: ChartTheme) {
    return theme === "Midnight" ? MidnightColors : ColorfulColors;
  }

  /**
   * Validates if the data contains the required columns
   */
  private static validateColumns(
    data: unknown[][],
    columns: Array<FieldDef>,
    config: ChartConfig
  ): string | null {
    if (!data || data.length === 0) {
      return "No data provided";
    }

    const requiredFields = [
      columns[config.xIndex].columnID,
      columns[config.yIndex].columnID,
    ];
    if (typeof config.groupByIndex === "number") {
      requiredFields.push(columns[config.groupByIndex].columnID);
    }

    const missingColumns = requiredFields.filter(
      (fieldId) => !columns.find((x) => x.columnID === fieldId)
    );

    if (missingColumns.length > 0) {
      return `Missing columns: ${missingColumns.join(", ")}`;
    }

    return null;
  }

  /**
   * Ensures numerical values for Y-axis
   */
  private static normalizeValue(
    value: unknown,
    type: keyof ChartTypeRegistry
  ): number | null {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(String(value));
    return isNaN(num) ? this.defaultValueIfMissing(type) : num;
  }

  private static defaultValueIfMissing(type: keyof ChartTypeRegistry) {
    return type === "bar" ? null : 0;
  }

  /**
   * Processes data for bar and line charts
   */
  private static processBarLineData(
    data: unknown[][],
    columns: Array<FieldDef>,
    config: ChartConfig,
    theme: ChartTheme
  ): DataTransformerResult {
    const { xIndex, yIndex, groupByIndex } = config;
    const colors = this.getColorsByTheme(theme);
    const y = columns[yIndex];

    if (!groupByIndex) {
      // Simple bar/line chart without grouping
      const labels = data.map((row) =>
        String(this.getFieldValue(row, xIndex, columns))
      );
      const values = data.map((row) =>
        this.normalizeValue(
          this.getFieldValue(row, yIndex, columns),
          config.type
        )
      );

      const backgroundColor =
        config.type === "line"
          ? `hsla(${colors[0]}, 0.3)`
          : `hsl(${colors[0]})`;
      const fill = config.type === "line" ? true : undefined;

      return {
        labels,
        datasets: [
          {
            label: y.name || y.name,
            data: values,
            backgroundColor,
            borderColor: `hsl(${colors[0]})`,
            fill,
            borderWidth: 1.3,
          },
        ],
      };
    }

    // Grouped bar/line chart
    const groupedData = new Map();
    const groups: Set<string> = new Set();
    const xValues: Set<string> = new Set();
    let maxValue: number = 0;

    // First pass: collect all unique groups and x-values, and find the max value
    data.forEach((row) => {
      const groupValue = String(this.getFieldValue(row, groupByIndex, columns));
      const xValue = String(this.getFieldValue(row, xIndex, columns));
      const yValue = this.normalizeValue(
        this.getFieldValue(row, yIndex, columns),
        config.type
      );
      groups.add(groupValue);
      xValues.add(xValue);
      if (yValue && yValue > maxValue) {
        maxValue = yValue;
      }
    });

    // Initialize grouped data structure
    const sortedXValues = Array.from(xValues);
    const sortedGroups = Array.from(groups);

    sortedGroups.forEach((group) => {
      groupedData.set(group, new Map());
      sortedXValues.forEach((xVal) => {
        groupedData
          .get(group)
          .set(xVal, this.defaultValueIfMissing(config.type));
      });
    });

    // Fill in the actual values
    data.forEach((row) => {
      const groupValue = String(this.getFieldValue(row, groupByIndex, columns));
      const xValue = String(this.getFieldValue(row, xIndex, columns));
      const yValue = this.normalizeValue(
        this.getFieldValue(row, yIndex, columns),
        config.type
      );

      groupedData.get(groupValue).set(xValue, yValue);
    });

    // Create datasets
    const getBackgroundColor = (index: number) => {
      return config.type === "line"
        ? `hsla(${colors[index % colors.length]}, 0.3)`
        : `hsl(${colors[index % colors.length]})`;
    };

    const getBorderColor = (index: number) => {
      return config.type === "line"
        ? `hsl(${colors[index % colors.length]})`
        : undefined;
    };

    const fill = config.type === "line" ? true : undefined;
    const datasets: Array<ChartDataset> = sortedGroups.map((group, index) => ({
      label: String(group),
      data: sortedXValues.map((xVal) => groupedData.get(group).get(xVal)),
      backgroundColor: getBackgroundColor(index),
      borderColor: getBorderColor(index),
      fill,
      skipNull: true,
      borderWidth: 1.3,
    }));

    return {
      labels: sortedXValues,
      datasets,
    };
  }

  /**
   * Processes data for pie charts
   */
  private static processPieData(
    data: unknown[][],
    columns: Array<FieldDef>,
    config: ChartConfig,
    theme: ChartTheme
  ): DataTransformerResult {
    const { xIndex, yIndex, groupByIndex } = config;
    const colors = this.getColorsByTheme(theme);

    if (!groupByIndex) {
      // Simple pie chart without grouping
      const aggregatedData = new Map();

      data.forEach((row) => {
        const key = String(this.getFieldValue(row, xIndex, columns));
        const value = this.normalizeValue(
          this.getFieldValue(row, yIndex, columns),
          config.type
        );
        aggregatedData.set(
          key,
          (aggregatedData.get(key) || this.defaultValueIfMissing(config.type)) +
            value
        );
      });

      const labels = Array.from(aggregatedData.keys());
      const values = Array.from(aggregatedData.values());

      return {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors.map((x) => `hsl(${x})`),
            fill: true,
          },
        ],
      };
    }

    // Grouped pie chart
    const groupedData = new Map();
    const xValues: Set<string> = new Set();

    // First pass: collect all unique x-values and aggregate data by group
    data.forEach((row) => {
      const groupValue = String(this.getFieldValue(row, groupByIndex, columns));
      const xValue = String(this.getFieldValue(row, xIndex, columns));
      const yValue = this.normalizeValue(
        this.getFieldValue(row, yIndex, columns),
        config.type
      );

      if (!groupedData.has(groupValue)) {
        groupedData.set(groupValue, new Map());
      }

      const groupMap = groupedData.get(groupValue);
      groupMap.set(
        xValue,
        (groupMap.get(xValue) || this.defaultValueIfMissing(config.type)) +
          yValue
      );
      xValues.add(xValue);
    });

    const sortedXValues = Array.from(xValues);
    const datasets = Array.from(groupedData.entries()).map(
      ([groupName, groupMap]) => ({
        label: groupName,
        data: sortedXValues.map(
          (xVal) =>
            groupMap.get(xVal) || this.defaultValueIfMissing(config.type)
        ),
        backgroundColor: colors.map((x) => `hsl(${x})`),
        fill: true,
      })
    );

    return {
      labels: sortedXValues,
      datasets,
    };
  }

  /**
   * Main function to transform array result data into Chart.js format
   */
  public static transform(
    result: { rows: unknown[][]; columns: Array<FieldDef> },
    config: ChartConfig,
    theme: ChartTheme
  ): DataTransformerResult {
    try {
      const { rows, columns } = result;

      // Validate input
      const validationError = this.validateColumns(rows, columns, config);
      if (validationError) {
        return { labels: [], datasets: [], error: validationError };
      }

      // Process data based on chart type
      if (config.type === "pie") {
        return this.processPieData(rows, columns, config, theme);
      }

      return this.processBarLineData(rows, columns, config, theme);
    } catch (error) {
      return {
        labels: [],
        datasets: [],
        error: `Data transformation error: ${
          APIError.normalizeError(error, "Unknown error").message
        }`,
      };
    }
  }
}
