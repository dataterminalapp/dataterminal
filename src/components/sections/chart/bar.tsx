import React, { useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { ChartData, ChartOptions } from "chart.js";
import { Chart as ChartJS, registerables } from "chart.js";
import { externalTooltipHandler, getTooltipID } from "./tooltip";
import "chartjs-adapter-moment";

ChartJS.register(...registerables);

interface Props {
  chartData: ChartData<"bar">;
}

const BarChart = (props: Props) => {
  const { chartData } = props;
  const ref = useRef<ChartJS<"bar">>(null);

  useEffect(() => {
    return () => {
      if (ref.current) {
        // We need to remove the tooltip manually, otherwise stays forever in the same place.
        document.getElementById(getTooltipID(ref.current))?.remove();
      }
    };
  }, [ref.current]);

  useEffect(() => {
    ref.current?.update();
  }, [chartData]);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    backgroundColor: "#e4e2e2",
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        position: "nearest",
        external: externalTooltipHandler,
      },
    },
    interaction: {
      mode: "nearest",
      intersect: false,
      axis: "x",
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        min: 0,
        grid: {
          display: true,
          color: "#DBDBD710",
        },
        border: { display: false },
        ticks: { display: true, color: "#DBDBD780" },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { display: true, color: "#DBDBD780" },
      },
    },
  };

  return (
    // Casting ref to avoid type issues over `ChartJSOrUndefined`.
    <Bar
      className="w-full"
      ref={ref}
      data={chartData}
      options={
        {
          ...options,
          borderRadius: 10,
          borderSkipped: false,
          // Use as any because borderRadius is not defined.
        } as ChartOptions<"bar">
      }
    />
  );
};

export default BarChart;
