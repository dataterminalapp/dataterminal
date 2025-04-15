import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { PropsWithChildren } from "react";

const boardKeyVariants = cva(
  "w-fit whitespace-nowrap text-foreground drop-shadow-sm drop-shadow-black/35 border p-0.5 px-1 rounded-sm",
  {
    variants: {
      variant: {
        default: "text-muted-foreground",
        ghost: "text-muted-foreground",
        minimal: "text-muted-foreground/50 shadow-none border-0 p-0 px-0",
      },
      size: {
        md: "px-2 py-1",
        default: "px-1.5 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface Props extends PropsWithChildren {
  className?: string;
  variant?: "default" | "ghost" | "minimal";
  size?: "default" | "md";
  characters: Array<string>;
  fontSize?: string;
}

const BoardKey = (props: Props) => {
  const { className, variant, size, characters, fontSize } = props;

  return (
    <div
      className={cn(
        "flex flex-row gap-1",
        variant === "minimal" && "gap-0 p-0.5 px-1"
      )}
    >
      {characters.map((char, i) => (
        <kbd
          className={cn(
            "shadow shadow-black/20 font-sans text-xs w-7 h-5 flex items-center justify-center text-center overflow-hidden",
            boardKeyVariants({ variant, size, className }),
            variant === "minimal" && "px-0 py-0"
          )}
          key={"kbd_" + char + String(i)}
          style={{
            fontSize: fontSize || "11px",
          }}
        >
          {char}
        </kbd>
      ))}
    </div>
  );
};

export default BoardKey;
