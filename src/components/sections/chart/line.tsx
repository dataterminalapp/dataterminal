import { useEffect, useRef, useMemo } from "react";
import { Chart, ChartData, Filler, registerables } from "chart.js";
import { externalTooltipHandler, getTooltipID } from "./tooltip";
import "chartjs-adapter-moment";

Chart.register(...registerables, Filler);

interface Props {
  chartData: ChartData<"line">;
}

const LineChart = (props: Props) => {
  const { chartData } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  const MemoizedCanvas = useMemo(
    () => <canvas ref={canvasRef} className="w-full h-full" />,
    []
  );

  useEffect(() => {
    if (canvasRef.current) {
      /**
       * Disable hardware acceleration/willReadFrequently for area charts.
       * It leaves gaps inside the area when filling.
       */
      const context = canvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });

      if (context && !chartRef.current) {
        chartRef.current = new Chart<"line">(context, {
          type: "line",
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: false,
                position: "nearest",
                external: externalTooltipHandler,
              },
              filler: { propagate: true },
            },
            interaction: {
              mode: "nearest",
              intersect: false,
              axis: "x",
            },
            scales: {
              y: {
                beginAtZero: true,
                min: 0,
                grid: { display: true, color: "#DBDBD710" },
                border: { display: false },
                ticks: { display: true, color: "#DBDBD780" },
              },
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: { display: true, color: "#DBDBD780" },
                adapters: {
                  date: {
                    locale: "en",
                  },
                },
              },
            },
            elements: {
              point: { radius: 0 },
              line: { tension: 0.4 },
            },
          },
        });
      }
    }

    return () => {
      if (chartRef.current) {
        // We need to remove the tooltip manually, otherwise stays forever in the same place.
        document.getElementById(getTooltipID(chartRef.current))?.remove();
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data = chartData;
      chartRef.current.update();
    }
  }, [chartData]);

  return MemoizedCanvas;
};

export default LineChart;
