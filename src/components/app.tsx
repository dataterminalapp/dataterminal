import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import TabComponent from "./layout/tabs";
import { TooltipProvider } from "./ui/tooltip";
import Footer from "./layout/footer/footer";
import Explorer, { getExplorerDefaultSize } from "./sections/explorer";
import Header from "./layout/header";
import Sidebar from "./sidebar";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { initialPanelAdded, Layout } from "@/features/panel";
import { appConfigLoaded } from "@/features/preferences";
import {
  Connection,
  appConfigLoaded as connectionsAppConfigLoaded,
} from "@/features/connections";
import { useConnection } from "@/hooks/useConnection";
import GlobalDetectors from "./utils/globalDetectors";
import { workspaceAppConfigLoaded } from "@/features/workspace";
import useAppConfig from "@/hooks/useAppConfig";
import { initialTabAdded } from "@/features/tabs";
import { focusChanged } from "@/features/focus";
import { Auth } from "@/services/auth";
import { authLoaded } from "@/features/global";
import { APIResponse } from "@/services/types";
import { APIErrorJSON } from "@/services/error";
import { WordmarkSVG } from "@/lib/wordmark";
import Onboard from "./sections/onboard";
import { preventDefault } from "./utils";
import AuthDialog from "./utils/authDialog";

export interface AppConfig {
  connectionList: Array<Connection>;
  defaultConnectionId: string;
  limit?: boolean;
  layout: Layout;
  explorerSize?: number;
}

const Main = () => {
  const sidebarEnabled = useAppSelector((state) => state.sidebar.enabled);

  return (
    <main className="h-screen w-wscreen max-w-screen max-h-screen bg-background text-foreground overflow-hidden">
      {/*
       * Having a div here is important to avoid focusing elements when the user clicks.
       * This is a common issue with the focus manager.
       *
       * But for component's like the Connection component, we need to focus the input.
       */}
      <div onMouseDown={preventDefault} className="flex flex-col h-full">
        {/* This is only to fill the space that the <Header /> is going to use  */}
        <div className="flex-initial h-12 mb-1 px-7 w-full draggable"></div>
        <ResizablePanelGroup direction="horizontal" className="px-7">
          <Explorer />
          <ResizablePanel
            id="tabs_panel"
            order={1}
            className="bg-background pr-0"
          >
            <TabComponent />
          </ResizablePanel>
          {sidebarEnabled && (
            <ResizableHandle
              withHandle
              className="w-2.5 rounded-lg bg-background"
            />
          )}
          <Sidebar />
        </ResizablePanelGroup>
        {/*
            I'm not happy with this solution but is the only viable alternative I could find so far.
            The issue is that the tab content, when it is rendering multiple results, it can be bigger than the available space,
            and because we are using the virtualizer there is this weird scenario where the header becomes non-draggable when
            the content is bigger than the available space. So, the only fix was the header on "top" of the overflowed but hidden content.
          */}
        <div className="absolute top-0 w-full">
          <Header className="flex-initial h-12 px-7" />
        </div>
        <Footer className="w-full h-8 px-7 mt-0.5 mb-1" />
        <GlobalDetectors />
      </div>
    </main>
  );
};

const App = () => {
  /**
   * Hooks
   */
  const dispatch = useAppDispatch();
  const { setupConnection } = useConnection();
  const { loadConfig } = useAppConfig();

  /**
   * States
   */
  const [loading, setLoading] = useState<boolean>(true);
  const [onboard, setOnboard] = useState<boolean>(true);

  /**
   * Refs
   */
  const initializedRef = useRef<boolean>(false);

  /**
   * Callbacks
   */
  const onLogin = useCallback(async (auth?: Auth) => {
    try {
      const { data: appConfig } = await loadConfig();
      if (appConfig) {
        setOnboard(false);
        setupAppConfig(appConfig);
        const connection = appConfig.connectionList.find(
          (x) => x.id === appConfig.defaultConnectionId
        );
        if (connection) {
          setupConnection(connection);
        }
      } else {
        setOnboard(true);
      }
    } catch (err) {
      console.error("Error getting app config: ", err);
    }
    if (auth) {
      dispatch(authLoaded({ auth }));
    }
  }, []);

  const setupAppConfig = useCallback((appConfig: AppConfig) => {
    dispatch(appConfigLoaded({ appConfig }));
    dispatch(connectionsAppConfigLoaded({ appConfig }));
    dispatch(workspaceAppConfigLoaded({ appConfig }));
    const panelAddedResult = dispatch(
      initialPanelAdded({
        layout: appConfig.layout || "Terminal",
        limit: typeof appConfig.limit === "boolean" ? appConfig.limit : true,
      })
    );
    const tabAddedResult = dispatch(
      initialTabAdded("Results", {
        panelIds: [panelAddedResult.payload.id],
      })
    );
    dispatch(
      focusChanged({
        tabId: tabAddedResult.payload.id,
        panelId: panelAddedResult.payload.id,
      })
    );
  }, []);

  const handleOnobardFinish = useCallback(
    (connection: Connection, layout: Layout, limit?: boolean) => {
      const appConfig: AppConfig = {
        connectionList: [connection],
        defaultConnectionId: connection.id,
        layout,
        limit: typeof limit === "boolean" ? limit : true,
        explorerSize: getExplorerDefaultSize(),
      };
      // It is not necessary to save the app config here now.
      // Because the add connection process, automatically saves the app config after adding a connection.
      setupAppConfig(appConfig);
      setupConnection(connection);
      setOnboard(false);
    },
    [setupConnection]
  );

  /**
   * Effects
   */
  useEffect(() => {
    const asyncOp = async () => {
      if (initializedRef.current === false) {
        initializedRef.current = true;

        try {
          const { data: authData }: APIResponse<Auth, APIErrorJSON> = await (
            window as Window
          ).electronAPI.getAuthData();

          if (authData) {
            await onLogin(authData);
          } else {
            await onLogin(undefined);
          }
        } catch (err) {
          console.error("Error. No session data available: ", err);
        } finally {
          setLoading(false);
        }
      }
    };

    asyncOp();
  }, [onLogin, setupConnection]);

  if (loading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <WordmarkSVG className="m-auto w-14 opacity-85" />
      </div>
    );
  } else if (onboard) {
    return (
      <>
        <Onboard onFinish={handleOnobardFinish} />
      </>
    );
  } else {
    return (
      <TooltipProvider>
        <AuthDialog />
        <Main />
      </TooltipProvider>
    );
  }
};

export default App;
