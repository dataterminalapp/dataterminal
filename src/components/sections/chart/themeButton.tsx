import React, { useCallback, useState } from "react";

export type ChartTheme = "Midnight" | "Colorful";

export const MidnightColors = [
  "359, 2%, 90%",
  "240, 1%, 74%",
  "240, 1%, 58%",
  "240, 1%, 42%",
  "240, 2%, 26%",
];
export const ColorfulColors = [
  "159, 100%, 55%",
  "317, 100%, 55%",
  "47, 100%, 55%",
  "270, 100%, 55%",
  "240, 2%, 26%",
];

interface Props {
  style: ChartTheme;
  isChecked: boolean;
  onClick: (style: ChartTheme) => void;
}

const ChartThemeButton = ({ style, isChecked, onClick }: Props) => {
  const [hover, setHover] = useState(false);
  const handleClick = useCallback(() => {
    onClick(style);
  }, [onClick, style]);

  const handleMouseEnter = useCallback(() => {
    setHover(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(false);
  }, []);

  if (style === "Midnight") {
    return (
      <button
        type="button"
        data-state="closed"
        role="radio"
        aria-checked={isChecked}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="font-medium transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground bg-transparent group flex size-8 shrink-0 items-center justify-center rounded-lg border-2 p-0 hover:bg-transparent focus-visible:bg-transparent aria-checked:border-foreground"
        style={
          {
            "--color-1": `hsl(${MidnightColors[0]})`,
            "--color-2": `hsl(${MidnightColors[1]})`,
            "--color-3": `hsl(${MidnightColors[2]})`,
            "--color-4": `hsl(${MidnightColors[3]})`,
          } as React.CSSProperties
        }
      >
        <div className="size-5 overflow-hidden rounded-sm invert-[1]">
          <div
            className={`grid h-10 w-10 -translate-x-1/4 -translate-y-1/4 grid-cols-2 overflow-hidden rounded-md transition-all ease-in-out ${
              hover ? "rotate-45" : "rotate-0"
            }`}
          >
            <span className="flex size-5 bg-[--color-1]" />
            <span className="flex size-5 bg-[--color-2]" />
            <span className="flex size-5 bg-[--color-3]" />
            <span className="flex size-5 bg-[--color-4]" />
            <span className="sr-only">Midnight</span>
          </div>
        </div>
      </button>
    );
  } else {
    return (
      <button
        type="button"
        data-state="closed"
        role="radio"
        aria-checked={isChecked}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="font-medium transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground bg-transparent group flex size-8 shrink-0 items-center justify-center rounded-lg border-2 p-0 hover:bg-transparent focus-visible:bg-transparent aria-checked:border-foreground"
        style={
          {
            "--color-1": `hsl(${ColorfulColors[0]})`,
            "--color-2": `hsl(${ColorfulColors[1]})`,
            "--color-3": `hsl(${ColorfulColors[2]})`,
            "--color-4": `hsl(${ColorfulColors[3]})`,
          } as React.CSSProperties
        }
      >
        <div className="size-5 overflow-hidden rounded-sm">
          <div
            className={`grid h-10 w-10 -translate-x-1/4 -translate-y-1/4 grid-cols-2 overflow-hidden rounded-md transition-all ease-in-out ${
              hover ? "rotate-45" : "rotate-0"
            }`}
          >
            <span className="flex size-5 bg-[--color-1]" />
            <span className="flex size-5 bg-[--color-2]" />
            <span className="flex size-5 bg-[--color-3]" />
            <span className="flex size-5 bg-[--color-4]" />
            <span className="sr-only">Midnight</span>
          </div>
        </div>
      </button>
    );
  }
};

export default ChartThemeButton;
