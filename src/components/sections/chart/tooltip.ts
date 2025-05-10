import { Chart, Chart as ChartJS, TooltipModel } from "chart.js";

export const getTooltipID = (chart: ChartJS) => {
  const id = "chart_tooltip_" + chart.id.toString();

  return id;
};

export const getTooltip = (
  chart: ChartJS
): HTMLDivElement | null | undefined => {
  const id = getTooltipID(chart);
  const tooltipEl: HTMLDivElement | null | undefined =
    chart.canvas.parentNode?.querySelector("#" + id);

  return tooltipEl;
};

const getOrCreateTooltip = (chart: ChartJS) => {
  const id = getTooltipID(chart);
  let tooltipEl = getTooltip(chart);

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = id;
    tooltipEl.style.opacity = "1";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.transform = "translate(-50%, 0)";
    tooltipEl.style.transition = "all .1s ease";
    tooltipEl.tabIndex = -1;
    tooltipEl.className = "w-fit max-w-64";

    chart.canvas.parentNode?.appendChild(tooltipEl);
  }

  return tooltipEl;
};

export const externalTooltipHandler = (context: {
  chart: Chart;
  tooltip: TooltipModel<"bar" | "line" | "pie">;
}) => {
  // Tooltip Element
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  // Set Text
  if (tooltip.body) {
    const { title } = tooltip;
    const bodyLines = tooltip.body.map((b) => b.lines);

    const container = document.createElement("div");
    container.className =
      "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-gray-800 bg-background px-2.5 py-1.5  shadow-xl";

    const titleEl = document.createElement("p");
    titleEl.appendChild(document.createTextNode(title[0]));
    titleEl.className = " font-medium";

    bodyLines.forEach((body, i: number) => {
      const lineContainer = document.createElement("div");
      lineContainer.className =
        "flex w-full flex-wrap gap-2 items-center truncate";

      const colors = tooltip.labelColors[i];
      const div = document.createElement("div");
      div.style.background = colors.backgroundColor.toString();
      div.style.borderColor = colors.borderColor.toString();
      div.style.height = "8px";
      div.style.width = "8px";
      div.style.display = "inline-block";
      div.className = "border";

      const detailsFlex = document.createElement("div");
      detailsFlex.className =
        "flex flex-1 gap-2 justify-between leading-none items-center truncate";
      const textEl = document.createElement("p");
      textEl.className = " text-gray-200 truncate";
      const text = document.createTextNode(title[0]);

      const valueEl = document.createElement("p");
      valueEl.className = " text-gray-200";
      const value = document.createTextNode(body[0]);

      lineContainer.appendChild(div);
      textEl.appendChild(text);
      valueEl.appendChild(value);
      detailsFlex.appendChild(textEl);
      detailsFlex.appendChild(valueEl);
      lineContainer.appendChild(detailsFlex);
      container.appendChild(lineContainer);
    });

    // Remove old children
    while (tooltipEl?.firstChild) {
      tooltipEl.firstChild.remove();
    }

    // Add new children
    tooltipEl?.appendChild(container);
  }

  const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

  // Display, position, and set styles for font
  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = positionX + tooltip.caretX + "px";
  tooltipEl.style.top = positionY + tooltip.caretY + "px";
  tooltipEl.style.padding =
    tooltip.options.padding + "px " + tooltip.options.padding + "px";

  tooltipEl.style.transitionProperty = "all";
  tooltipEl.style.transitionTimingFunction = "linear";
  tooltipEl.style.transitionDuration = "50ms";
};
