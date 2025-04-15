import React, {
  ChangeEventHandler,
  FocusEventHandler,
  useCallback,
  useState,
} from "react";
import { Input } from "../../ui/input";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import SmallTooltip from "../../utils/SmallTooltip";

interface Props {
  autoFocus?: boolean;
  className?: string;
  size?: "sm" | "default";
  hidden?: boolean;
  defaultValue?: string;
  description: string;
  shortcut: Array<string>;
  handleOnInputFocusChange?: (id?: string) => void;
  onFocus: () => void;
  onBlur?: FocusEventHandler;
  handleOnChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onClick?: () => void;
}

const Search = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      hidden,
      size = "default",
      defaultValue,
      description,
      shortcut,
      onClick,
      handleOnInputFocusChange,
      onKeyDown,
      handleOnChange,
      onFocus,
      onBlur,
    }: Props,
    ref
  ) => {
    const [value, setValue] = useState<string | undefined>(defaultValue);
    const [focus, setFocus] = useState(false);

    const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
      (event) => {
        setValue(event.target.value);
        if (handleOnChange) {
          handleOnChange(event);
        }
      },
      [handleOnChange]
    );

    const handleOnFocus = useCallback(() => {
      setFocus(true);
      onFocus();
    }, [onFocus]);

    const handleOnBlur: FocusEventHandler = useCallback(
      (e) => {
        setFocus(false);
        if (onBlur) {
          onBlur(e);
        }
      },
      [onBlur]
    );

    return (
      <div
        className={cn(
          "group w-full h-10 pl-2 group mb-1 relative md:grow-0 items-center flex pt-0.5 shrink-0",
          className
        )}
        onClick={onClick}
      >
        <SmallTooltip
          description={description}
          asChild
          shortcut={shortcut}
          disabled={focus}
        >
          <SearchIcon
            className={cn(
              size === "sm"
                ? "absolute left-1 size-6 p-1 m-auto text-muted-foreground transition-all z-10"
                : "absolute left-2 size-8 p-2 text-muted-foreground transition-all z-10",
              !focus &&
                "hover:text-white hover:rounded-full hover:cursor-pointer hover:bg-muted-foreground/20"
            )}
          />
        </SmallTooltip>
        {
          <Input
            ref={ref}
            type="search"
            placeholder="Search"
            className={cn(
              size === "sm"
                ? "border-0 rounded-sm transition-all remove-clear-button pr-11 pl-8 h-7 truncate group-focus-within:pr-0 w-0 opacity-0"
                : "border-0 rounded-sm transition-all remove-clear-button pr-11 pl-8 py-1 truncate group-focus-within:pr-0 w-0 opacity-0",
              !focus && !value && "pr-0 pl-0",
              (focus || value) && "opacity-100 bg-muted-foreground/20",
              (focus || value) && size === "sm" && "w-full max-w-52",
              (focus || value) && size === "default" && "w-52",
              focus && "opacity-100 bg-muted-foreground/20",
              focus &&
                "outline-none focus-within:outline-none focus-within:border-none focus-visible:outline-none  outline-0 ring-0 focus-visible:ring-0 focus-within:ring-0 focus-within:outline-0 focus-visible:outline-0"
            )}
            onChange={onChange}
            onFocus={handleOnFocus}
            onKeyDown={onKeyDown}
            onBlur={handleOnBlur}
            autoCorrect="off"
            autoComplete="off"
            autoCapitalize="off"
            defaultValue={defaultValue}
            // autoFocus={typeof autoFocus === "boolean" ? autoFocus : false}
            hidden={hidden}
          />
        }
        {focus && (
          <DetectBoardKey
            preventDefault
            id="ArrowUp"
            boardKey="ArrowUp"
            onKeyPress={handleOnInputFocusChange}
          />
        )}
        {focus && (
          <DetectBoardKey
            preventDefault
            id="ArrowDown"
            boardKey="ArrowDown"
            onKeyPress={handleOnInputFocusChange}
          />
        )}
        {focus && (
          <DetectBoardKey
            id="Enter"
            boardKey="Enter"
            onKeyPress={handleOnInputFocusChange}
          />
        )}
      </div>
    );
  }
);

export default Search;
