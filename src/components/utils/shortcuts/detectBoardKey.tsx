"use client";

import { useEffect } from "react";
import { preventDefault, stopPropagation } from "../../utils";
import { FocusArea } from "@/contexts/focus";
import { useAppSelector } from "@/hooks/useRedux";

interface Props {
  onKeyPress?: (id?: string) => void;
  boardKey?: string;
  redirect?: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  ctrl?: boolean;
  id?: string;
  stopPropagation?: boolean;
  preventDefault?: boolean;
  area?: FocusArea;
  skipIfExplorerIsFocused?: boolean;
  enableOnlyIfExplorerIsFocused?: boolean;
}

const DetectBoardKey = (props: Props) => {
  const {
    boardKey,
    redirect,
    onKeyPress,
    meta,
    shift,
    alt,
    ctrl,
    id,
    skipIfExplorerIsFocused,
    enableOnlyIfExplorerIsFocused,
  } = props;
  const isExplorerFocused = useAppSelector(
    (state) => state.focus.currentFocus?.area === "explorer"
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === boardKey ||
          event.key === (boardKey && boardKey.toUpperCase())) &&
        (meta === true ? event.metaKey : true) &&
        (shift === true ? event.shiftKey : true) &&
        (alt === true ? event.altKey : true) &&
        (ctrl === true ? event.ctrlKey : true)
      ) {
        if (onKeyPress) {
          if (props.preventDefault) {
            preventDefault(event);
          }
          if (props.stopPropagation) {
            stopPropagation(event);
          }
          onKeyPress(id);
        }

        if (redirect) {
          // Avoid using `router.push(redirect);`
          // Otherwise the user can press backspace and redirect to the main app.
          // This is an undesired behavior.
          //   router.replace(redirect);
        }
      }
    };

    if (skipIfExplorerIsFocused) {
      if (isExplorerFocused) {
        // Do nothing.
      } else {
        // This is for almost anything that it is not in the sidebar (explorer.)
        document.addEventListener("keydown", handleKeyDown);

        // Clean up the event listener on component unmount
        return () => {
          document.removeEventListener("keydown", handleKeyDown);
        };
      }
    } else if (enableOnlyIfExplorerIsFocused) {
      if (isExplorerFocused) {
        // This is for cases where we want to focus back to a section,
        // e.g. focusing back from the explorer to the chart
        document.addEventListener("keydown", handleKeyDown);

        return () => {
          document.removeEventListener("keydown", handleKeyDown);
        };
      }
    } else {
      // This is for cases where the detection is global,
      // e.g. switching tabs.
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [
    onKeyPress,
    meta,
    shift,
    alt,
    ctrl,
    boardKey,
    id,
    redirect,
    skipIfExplorerIsFocused,
    isExplorerFocused,
    preventDefault,
    stopPropagation,
  ]);

  return <></>;
};

export default DetectBoardKey;
