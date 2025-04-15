"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import Tree from "./tree";
import Schema from "./schema";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import DatabaseErrorAnimation from "./errorAnimation";
import { preventDefault } from "../../utils";
import Toggle from "./toggle";
import { cn } from "@/lib/utils";
import Loading from "../../utils/loading";
import { explorerSizeChanged } from "@/features/explorer";
import { nanoid } from "@reduxjs/toolkit";

export const MIN_SIZE_PIXELS = 234;
export const DEFAULT_SIZE = MIN_SIZE_PIXELS;

export const getExplorerDefaultSize = () => {
  return DEFAULT_SIZE;
};

// Convert percentage of current window width to pixels
const percentageToPixels = (percentage: number, screenSize?: number) => {
  return (percentage * (screenSize || window.innerWidth)) / 100;
};

const pixelsToPercentage = (pixels: number, screenSize?: number) => {
  return (pixels / (screenSize || window.innerWidth)) * 100;
};

const Explorer = () => {
  const dispatch = useAppDispatch();

  /**
   * Selectors
   */
  const enabled = useAppSelector((state) => state.explorer.enabled);
  const defaultSize = useAppSelector((state) => state.explorer.size);
  const loading = useAppSelector((state) => state.workspace.schema.loading);
  const error = useAppSelector(
    (state) => state.workspace.schema.error || state.workspace.connection.error
  );
  const currentSchemaName = useAppSelector(
    (state) => state.workspace.schema.current
  );
  const schema = useAppSelector(
    (state) =>
      currentSchemaName && state.schema.schemas.entities[currentSchemaName]
  );

  /**
   * States
   */
  const [minSize, setMinSize] = useState<number>(
    pixelsToPercentage(MIN_SIZE_PIXELS)
  );
  const [screenSize, setScreenSize] = useState<number>(window.innerWidth);

  /**
   * Refs
   */
  const ref = useRef<ImperativePanelHandle>(null);

  /**
   * Effects
   */

  /**
   * Unfortunately, I need to trigger a re-render in the component
   * to handle the resize correctly. Otherwise is hell.
   * Resizing the window app from a lower size to a higher size
   * creates an undesired width.
   */
  const [dynamicID, setDynamicID] = useState(nanoid());

  useEffect(() => {
    const handleResize = () => {
      const newMinSize = pixelsToPercentage(MIN_SIZE_PIXELS);
      setMinSize(newMinSize);

      if (ref.current) {
        dispatch(
          explorerSizeChanged({
            size: Math.max(MIN_SIZE_PIXELS),
          })
        );
        setScreenSize(window.innerWidth);
        setDynamicID(nanoid());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * Callbacks
   */
  const onResizeChange = useCallback(
    (sizeInPercentage: number) => {
      const newSizeInPixels = percentageToPixels(sizeInPercentage);
      dispatch(
        explorerSizeChanged({
          size: Math.max(MIN_SIZE_PIXELS, newSizeInPixels),
        })
      );
    },
    [dispatch]
  );

  return (
    <>
      {
        <ResizablePanel
          ref={ref}
          id={"explorer_panel" + dynamicID}
          key={"schema_browser_panel" + dynamicID}
          order={0}
          minSize={minSize}
          defaultSize={pixelsToPercentage(defaultSize, screenSize)}
          onMouseDown={preventDefault}
          onResize={onResizeChange}
          hidden={!enabled}
        >
          <div
            className={cn(
              "flex flex-col h-full rounded-lg bg-panel pt-1 pb-1",
              !loading && "p-2 pb-0"
            )}
          >
            <div className="flex-grow overflow-hidden">
              <div className="relative h-full flex flex-col">
                <div className="flex items-center gap-1 w-full">
                  {!loading && (
                    <>
                      <Toggle /> <Schema />
                    </>
                  )}
                </div>
                {loading && !error && <Loading />}
                {error && (
                  <DatabaseErrorAnimation
                    errorMessage={error?.message}
                    title="An error occurred while trying to fetch the schema"
                    className="my-auto mx-4"
                  />
                )}
                {schema && !loading && (
                  <Tree items={(schema && [schema]) || []} />
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      }
      {enabled && (
        <ResizableHandle
          withHandle
          className="w-2.5 rounded-lg bg-background"
        />
      )}
    </>
  );
};

export default Explorer;
