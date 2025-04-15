import { ChartData, ChartType } from "chart.js";
import BarChart from "./bar";
import LineChart from "./line";
import PieChart from "./pie";

interface Props {
  className?: string;
  type: ChartType;
  data: ChartData;
}

const Chart = ({ className, data, type }: Props) => {
  return (
    <div className={className}>
      {type === "bar" && <BarChart chartData={data as ChartData<"bar">} />}
      {type === "line" && <LineChart chartData={data as ChartData<"line">} />}
      {type === "pie" && <PieChart chartData={data as ChartData<"pie">} />}
    </div>
  );
};

export default Chart;
