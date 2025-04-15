import React, { useCallback, useEffect, useRef, useState } from "react";
import AddConnection, { handleOnCreateConnection } from "../connections/add";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TabProvider, useTabContext } from "@/contexts/tab";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import {
  tabAdded,
  tabConnectionCreationStarted,
  tabRemoved,
} from "@/features/tabs";
import { useToast } from "@/hooks/useToast";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Layout } from "@/features/panel";
import { Connection } from "@/features/connections";
import useAppConfig from "@/hooks/useAppConfig";
import DetectBoardKey from "@/components/utils/shortcuts/detectBoardKey";

const PreferredLayout = ({
  onContinue,
}: {
  onContinue: (layout: Layout) => void;
}) => {
  const [state, setState] = useState<Layout>("Terminal");

  return (
    <div className="w-fit mx-auto">
      <h1 className="text-3xl font-bold">Welcome!</h1>
      <h2 className="text-3xl font-semibold text-muted-foreground">
        How would you like to use Data Terminal?
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-10 mt-10">
        <div
          onClick={() => setState("Terminal")}
          className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
        >
          <Checkbox
            checked={state === "Terminal"}
            className="rounded-full absolute right-4 top-4 size-5"
          />
          <h3 className="text-lg font-bold">Terminal</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Optimized for speed and preferred by terminal users
          </p>
        </div>
        <div
          onClick={() => setState("IDE")}
          className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
        >
          <Checkbox
            checked={state === "IDE"}
            className="rounded-full absolute right-4 top-4 size-5"
          />
          <h3 className="text-lg font-bold">Editor</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Ideal for writing longer queries and familiar to traditional IDE
            users
          </p>
        </div>
      </div>

      <DetectBoardKey
        boardKey={"Enter"}
        onKeyPress={() => onContinue(state)}
        stopPropagation
        preventDefault
      />
      <DetectBoardKey
        boardKey={"Escape"}
        onKeyPress={() => onContinue(state)}
        stopPropagation
        preventDefault
      />
      <DetectBoardKey
        boardKey={"ArrowLeft"}
        onKeyPress={() => setState("Terminal")}
        stopPropagation
        preventDefault
      />
      <DetectBoardKey
        boardKey={"ArrowUp"}
        onKeyPress={() => setState("Terminal")}
        stopPropagation
        preventDefault
      />
      <DetectBoardKey
        boardKey={"ArrowRight"}
        onKeyPress={() => setState("IDE")}
        stopPropagation
        preventDefault
      />
      <DetectBoardKey
        boardKey={"ArrowDown"}
        onKeyPress={() => setState("IDE")}
        stopPropagation
        preventDefault
      />
      <Button
        onClick={() => onContinue(state)}
        className="w-full mt-12 py-2"
        size={"lg"}
        variant={"primary"}
      >
        Continue
      </Button>
      <div className="w-full mt-2 opacity-50">
        <div className="m-auto text-xs w-fit flex gap-2 items-center">
          <p className="text-muted-foreground">Or press enter to continue </p>
        </div>
      </div>
    </div>
  );
};

const AddingConnection = ({ onAdd }: { onAdd: (c: Connection) => void }) => {
  const { id: tabId } = useTabContext();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { saveConfig } = useAppConfig();
  const newConnection = useAppSelector(
    (state) => state.tabs.entities[tabId]?.options.connection?.newConnection
  );
  const connections = useAppSelector((state) => state.connections.entities);

  const onCreateConnection = useCallback(async () => {
    if (newConnection) {
      try {
        const connection = await handleOnCreateConnection(
          tabId,
          Object.values(connections),
          newConnection,
          true,
          dispatch,
          toast,
          saveConfig
        );

        if (connection) {
          onAdd(connection);
        }
      } catch (err) {
        console.error("Error creating connection", err);
      }
    }
  }, [tabId, connections, newConnection, dispatch, toast, saveConfig]);

  return (
    <>
      <AddConnection
        onboarding
        disableCancel
        onCreateConnection={onCreateConnection}
      />
      <DetectBoardKey
        key={"Enter"}
        onKeyPress={onCreateConnection}
        stopPropagation
        preventDefault
      />
    </>
  );
};

const Onboard = ({
  onFinish,
}: {
  onFinish: (connection: Connection, layout: Layout) => void;
}) => {
  const dispatch = useAppDispatch();
  const [tabId, setTabId] = React.useState<string | undefined>(undefined);
  const [preferredLayout, setPreferredLayout] = useState<Layout | undefined>(
    undefined
  );
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current === false) {
      ref.current = true;

      const { payload } = dispatch(
        tabAdded("Connections", {
          connection: {
            isAddingConnection: true,
            newConnection: {},
          },
        })
      );
      dispatch(tabConnectionCreationStarted({ id: payload.id }));
      setTabId(payload.id);
    }
  }, [ref]);

  const handleOnAdd = useCallback(
    (connection: Connection) => {
      if (tabId) {
        dispatch(tabRemoved({ id: tabId }));
      }
      if (preferredLayout) {
        onFinish(connection, preferredLayout);
      } else {
        onFinish(connection, "Terminal");
        console.warn("Invalid state. Prefered layout is missing");
      }
    },
    [tabId, preferredLayout, onFinish]
  );

  return (
    <main className="bg-background h-screen w-wscreen max-w-screen max-h-screen text-foreground overflow-scroll">
      <div
        style={{ marginTop: "10%" }}
        className="px-10 sm:px-24 h-fit mx-auto max-w-[1500px]"
      >
        {tabId && (
          <TooltipProvider>
            <TabProvider
              tab={{
                id: tabId,
              }}
            >
              {preferredLayout && (
                <div className="max-w-[560px] mx-auto">
                  <h1 className="text-3xl font-bold">Connect Postgres</h1>
                  <AddingConnection onAdd={handleOnAdd} />
                </div>
              )}
              {!preferredLayout && (
                <PreferredLayout onContinue={setPreferredLayout} />
              )}
            </TabProvider>
          </TooltipProvider>
        )}
      </div>
      <div className="h-10 w-full draggable absolute top-0 z-10"></div>
    </main>
  );
};

export default Onboard;
