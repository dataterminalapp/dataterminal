import { cn } from "@/lib/utils";
import React from "react";

interface Props {
    trueCount: number;
    falseCount: number;
    className?: string;
}

const BooleanChart = ({ className, trueCount, falseCount }: Props) => {
    const tot = trueCount + falseCount;
    return (
        <div className={cn(className, "flex flex-row h-1 w-full opacity-50 hover:opacity-100")}>
            <div style={{ width: `${trueCount / tot * 100}%` }} className="bg-green-500"></div>
            <div className="rotate-45 bg-none w-1"></div>
            <div style={{ width: `${falseCount / tot * 100}%` }} className="bg-red-500"></div>
        </div>
    );
};

export default BooleanChart;