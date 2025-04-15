import React, { useEffect, useRef } from "react";
import { Pie } from "react-chartjs-2";
import { ChartData } from "chart.js";
import { Chart as ChartJS, registerables } from "chart.js";
import { externalTooltipHandler, getTooltipID } from "./tooltip";

ChartJS.register(...registerables);

interface Props {
  chartData: ChartData<"pie">;
}

const PieChart = (props: Props) => {
  const { chartData } = props;
  const ref = useRef<ChartJS<"pie">>(null);

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

  return (
    <Pie
      className="w-full"
      ref={ref}
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: externalTooltipHandler,
          },
        },
      }}
    />
  );
};

export default PieChart;
