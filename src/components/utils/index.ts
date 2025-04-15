import { FocusArea, FocusTarget, FocusOptions } from "@/contexts/focus";
import { Tab } from "@/features/tabs";
import { KeyboardEvent, MouseEvent } from "react";
import reservedMap from "./reserved";
import { GridKeyEventArgs } from "@glideapps/glide-data-grid/dist/dts";

export function preventDefaultAndStopPropagation<T>(
  event:
    | KeyboardEvent<T>
    | MouseEvent<T>
    | React.FocusEvent
    | Event
    | GridKeyEventArgs
) {
  event.stopPropagation();
  event.preventDefault();
}

export function preventDefault<T>(
  event: KeyboardEvent<T> | MouseEvent<T> | Event | HTMLFormElement
) {
  event.preventDefault();
}

export function stopPropagation<T>(
  event: KeyboardEvent<T> | MouseEvent<T> | Event
) {
  event.stopPropagation();
}

export function handleFocusFallback(
  connectionIds: Array<string>,
  currentTab: Tab,
  setFocus: (
    area: FocusArea,
    target: FocusTarget,
    options?: FocusOptions
  ) => void,
  from: string
) {
  if (currentTab.type === "Results") {
    setFocus("editor", "input", { from: "utils/handleFocusFallback" });
  } else if (currentTab.type === "Connections") {
    setFocus("connection", "row", {
      id: connectionIds[0],
      from,
    });
  }
}

/**
 * This exact code is also used in the formatter.
 * @param entity
 * @returns
 */
export function needsQuotes(entity: string) {
  const validIdentifier = /^[a-z_][a-z0-9_]*$/;

  // Determine if the column needs quotes based on rules
  return !validIdentifier.test(entity) || reservedMap[entity.toUpperCase()];
}
