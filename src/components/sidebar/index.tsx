import { ResizablePanel } from "../ui/resizable";
import { useAppSelector } from "@/hooks/useRedux";

const Sidebar = (): JSX.Element => {
  const enabled = useAppSelector((state) => state.sidebar.enabled);

  return enabled ? (
    <ResizablePanel
      id="explorer_panel2"
      key="schema_browser_panel2"
      order={2}
      minSize={20}
      defaultSize={25}
    >
      <div className="flex flex-col h-full rounded bg-panel p-2">
        <div className="flex-grow overflow-hidden">
          <div className="h-full flex flex-col"></div>
        </div>
      </div>
    </ResizablePanel>
  ) : (
    <></>
  );
};

export default Sidebar;
