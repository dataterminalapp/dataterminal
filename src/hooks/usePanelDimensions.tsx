
import { useLayoutEffect, useState } from "react";
import { getPanelElement } from "react-resizable-panels";

/**
 * Custom hook to get the dimensions of a panel from `react-resizable-panels`.
 * @param id The id of the panel to get the height of.
 */
export function usePanelDimensions(id: string) {
  const [dimensions, setDimensions] = useState<[number, number]>();

  useLayoutEffect(() => {
    const panelElement = getPanelElement(id);

    if (panelElement) {
      const observer = new ResizeObserver(() =>
        setDimensions([panelElement.offsetHeight, panelElement.offsetWidth]),
      );

      observer.observe(panelElement);

      return () => observer.disconnect();
    }
  }, []);

  return dimensions;
}