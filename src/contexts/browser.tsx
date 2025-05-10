import { GridSelection } from "@glideapps/glide-data-grid/dist/dts";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";

interface BrowserContextType {
  gridSelection?: GridSelection;
  onGridSelectionChange: (gridSelection?: GridSelection) => void;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

/**
 * Context for managing the state of `GridSelection` in the browser section.
 *
 * This context provides a way to store and update the `GridSelection` state
 * without relying on Redux. Storing `GridSelection` in Redux can be challenging
 * due to its use of readonly and non-compatible types for Redux's mutable state
 * management. By using this context, we can handle `GridSelection` in a more
 * React-friendly way without interfering with Results or overall performance.
 *
 * @function BrowserProvider
 * Provides the `BrowserContext` to its children, allowing them to access and update
 * the `GridSelection` state.
 *
 * @function useBrowserContext
 * Hook to access the `BrowserContext`. Throws an error if used outside of a `BrowserProvider`.
 *
 * @throws {Error} If `useBrowserContext` is used outside of a `BrowserProvider`.
 */
export function BrowserProvider({ children }: PropsWithChildren) {
  const [gridSelectionState, setGridSelectionState] = useState<GridSelection>();
  const onGridSelectionChange = useCallback(
    (gridSelection?: GridSelection) => setGridSelectionState(gridSelection),
    []
  );

  return (
    <BrowserContext.Provider
      value={{ onGridSelectionChange, gridSelection: gridSelectionState }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserContext() {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useBrowserContext must be used within a TableProvider");
  }
  return context;
}
