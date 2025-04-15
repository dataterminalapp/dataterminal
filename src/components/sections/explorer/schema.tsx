import React, {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import SmallTooltip from "../../utils/SmallTooltip";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useFocusContext } from "@/contexts/focus";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { preventDefaultAndStopPropagation } from "../../utils";
import { schemaChanged } from "@/features/workspace";

const SchemaItem = ({
  id,
  handleOnSelect,
}: {
  id: string;
  handleOnSelect: (value: string) => void;
}) => {
  const schema = useAppSelector((state) => state.schema.schemas.entities[id]);
  const currentSchemaId = useAppSelector(
    (state) => state.workspace.schema.current
  );

  return (
    <CommandItem key={id} value={id} onSelect={() => handleOnSelect(id)}>
      {schema.name}
      <CheckIcon
        className={cn(
          "ml-auto h-4 w-4",
          currentSchemaId === id ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );
};

const Schema = () => {
  /**
   * Contexts
   */
  const { setFocus, register, getCurrentFocus } = useFocusContext();
  const dispatch = useAppDispatch();

  /**
   * Selectors
   */
  const currentSchemaId = useAppSelector(
    (state) => state.workspace.schema.current
  );
  const currentSchemaName = useAppSelector((state) =>
    currentSchemaId
      ? state.schema.schemas.entities[currentSchemaId]?.name
      : undefined
  );
  const loading = useAppSelector((state) => state.workspace.schema.loading);
  const schemaIds = useAppSelector((state) => state.schema.schemas.ids);

  const shouldFocus = useAppSelector(
    (state) =>
      state.focus.currentFocus?.area === "explorer" &&
      state.focus.currentFocus?.target === "button"
  );

  /**
   * States
   */
  const [open, setOpen] = useState(false);
  const [focusOnInput, setFocusOnInput] = useState(false);

  /**
   * Refs
   */
  const ref = useRef<HTMLButtonElement>(null);

  /**
   * Memos
   */
  const message = useMemo(() => {
    if (loading) {
      return "Loading...";
    } else {
      return currentSchemaName ? currentSchemaName : "Change schema...";
    }
  }, [loading, currentSchemaName]);

  /**
   * Use effects
   */

  useEffect(() => {
    if (ref.current) {
      register("explorer", "button", ref.current);
    }
  }, [ref.current]);

  useEffect(() => {
    setFocusOnInput(shouldFocus);
    if (shouldFocus) {
      ref.current?.focus();
    }
  }, [shouldFocus, ref.current]);

  /**
   * Callbacks
   */

  const hnadleOnArrowDownPress = useCallback(() => {
    setFocus("explorer", "search", { from: "schema/hnadleOnArrowDownPress" });
  }, [setFocus]);

  const handleOnSearchShortcutPress = useCallback(() => {
    setFocus("explorer", "search", { from: "schema/hnadleOnArrowDownPress" });
  }, [setFocus]);

  const handleOnSelect = useCallback((value: string) => {
    dispatch(schemaChanged({ id: value }));
    setOpen(false);
  }, []);

  const handleOnOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  const handleOnKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.key === "Escape") {
        preventDefaultAndStopPropagation(e);
        setFocus("explorer", "button", { from: "schema/handleOnKeyDown" });
      }
    },
    []
  );

  const onCloseAutoFocus = useCallback((e: Event) => {
    preventDefaultAndStopPropagation(e);
    const currentFocus = getCurrentFocus();
    // Only focus again if the currentFocus is on the schema button,
    // if the focus is already in another element, like the editor
    // or the browser, do not steal the focus.
    if (
      currentFocus?.area === "explorer" &&
      currentFocus?.target === "button"
    ) {
      setFocus("explorer", "button", {
        from: "schema/onCloseAutoFocus",
      });
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOnOpenChange}>
      <SmallTooltip description={"Swap schema"} asChild>
        <div className="flex flex-row gap-1 ml-auto group overflow-hidden">
          <p className="pl-1 group-focus-within:text-primary text-muted-foreground text-nowrap max-w-xs truncate ">
            {message}
          </p>
          <PopoverTrigger asChild>
            <button
              role="combobox"
              aria-expanded={open}
              disabled={loading || !currentSchemaId}
              className={cn(
                "group focus:text-primary",
                open && "text-primary",
                "hover:text-primary",
                "flex px-1 h-7 py-0 items-center max-w-fit w-full bg-transparent border-0 mr-0.5 mt-0.5",
                "focus:outline-0 foucs:ring-0 focus-visible:outline-0 focus-visible:ring-0 focus-visible:bg-none",
                "focus:outline-none focus:ring-0 focus-within:ring-0 focus-within:outline-none",
                loading || (!currentSchemaId && "hidden"),
                "focus:bg-neutral-800/80 hover:bg-neutral-800/80 rounded"
              )}
              onFocus={() => setFocusOnInput(true)}
              onBlur={() => setFocusOnInput(false)}
              ref={ref}
            >
              <CaretSortIcon
                strokeWidth={2}
                className={cn("size-4 mt-0.5 stroke-2")}
              />

              {focusOnInput && (
                <DetectBoardKey
                  id="ArrowDown"
                  boardKey="ArrowDown"
                  onKeyPress={hnadleOnArrowDownPress}
                />
              )}
              {
                <DetectBoardKey
                  meta
                  shift
                  boardKey="f"
                  onKeyPress={handleOnSearchShortcutPress}
                />
              }
            </button>
          </PopoverTrigger>
        </div>
      </SmallTooltip>
      <PopoverContent
        onKeyDown={handleOnKeyDown}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[250px] p-0"
      >
        <Command className="bg-panel">
          <CommandInput placeholder="Search schema..." className="h-9" />
          <CommandList>
            <CommandEmpty>No schema found.</CommandEmpty>
            <CommandGroup>
              {schemaIds.map((schemaId) => (
                <SchemaItem
                  key={"item_" + schemaId}
                  id={schemaId}
                  handleOnSelect={handleOnSelect}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default Schema;
