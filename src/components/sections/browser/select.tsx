import React, {
  KeyboardEventHandler,
  useCallback,
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
import { CaretSortIcon } from "@radix-ui/react-icons";
import { preventDefaultAndStopPropagation } from "../../utils";
import { Schema } from "@/features/schema";
import { tabBrowserOptionsChanges } from "@/features/tabs";
import { useTabContext } from "@/contexts/tab";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import SmallTooltip from "@/components/utils/SmallTooltip";

const SchemaItem = ({
  id,
  handleOnSelect,
  currentSchemaId,
}: {
  id: string;
  currentSchemaId: string;
  handleOnSelect: (value: string) => void;
}) => {
  const schema = useAppSelector((state) => state.schema.schemas.entities[id]);

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

const Schema = ({
  schema,
  className,
}: {
  schema: Schema;
  className?: string;
}) => {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const dispatch = useAppDispatch();

  /**
   * Selectors
   */
  const currentSchemaId = schema.id;
  const currentSchemaName = schema.name;
  const loading = useAppSelector((state) => state.workspace.schema.loading);
  const schemas = useAppSelector((state) => state.schema.schemas.entities);
  const schemaIds = useAppSelector((state) => state.schema.schemas.ids);

  /**
   * States
   */
  const [open, setOpen] = useState(false);

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
   * Callbacks
   */
  const handleOnSelect = useCallback(
    (value: string) => {
      const schema = schemas[value];
      if (schema) {
        dispatch(tabBrowserOptionsChanges({ tabId, schemaEntity: schema }));
      }
      setOpen(false);
    },
    [tabId, schemas]
  );

  const handleOnOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  const handleOnKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.key === "Escape") {
        preventDefaultAndStopPropagation(e);
      }
    },
    []
  );

  const onCloseAutoFocus = useCallback((e: Event) => {
    preventDefaultAndStopPropagation(e);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOnOpenChange}>
      <SmallTooltip className={className} description={"Swap schema"} asChild>
        <div className="flex flex-row gap-1 ml-auto group overflow-hidden">
          <p className="pl-1 group-focus-within:text-primary group-focus-visible:text-primary text-muted-foreground text-nowrap max-w-xs truncate">
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
              ref={ref}
            >
              <CaretSortIcon
                strokeWidth={2}
                className={cn("size-4 mt-0.5 stroke-2")}
              />
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
                  currentSchemaId={currentSchemaId}
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
