import React, {
  FocusEventHandler,
  MouseEventHandler,
  PropsWithChildren,
  useCallback,
} from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import BoardKey from "../utils/shortcuts/boardKey";
import { cn } from "@/lib/utils";
import { preventDefaultAndStopPropagation } from ".";

interface Props extends PropsWithChildren {
  description: string | JSX.Element;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  shortcut?: Array<string>;
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
  onClick?: MouseEventHandler;
}

const SmallTooltip = ({
  asChild,
  delayDuration,
  disableHoverableContent,
  disabled,
  description,
  shortcut,
  children,
  className,
  onClick,
}: Props) => {
  // Prevent the focus to scalate. Otherwise the tooltip trigger will show the tooltip when
  // the user uses the keyboard to focus the component.
  const handleOnFocus: FocusEventHandler<HTMLButtonElement> = useCallback(
    preventDefaultAndStopPropagation,
    []
  );

  return (
    <Tooltip
      delayDuration={delayDuration}
      disableHoverableContent={
        typeof disableHoverableContent === "boolean"
          ? disableHoverableContent
          : true
      }
      open={disabled === true ? false : undefined}
    >
      <TooltipTrigger
        className={cn("items-center", className)}
        asChild={asChild}
        onFocus={handleOnFocus}
        onClick={onClick}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-muted-foreground flex flex-row gap-2 items-center">
          {description}{" "}
          {shortcut && (
            <BoardKey characters={shortcut} variant="ghost">
              {shortcut}
            </BoardKey>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SmallTooltip;
