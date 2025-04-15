import { useState, useCallback } from "react";
import { useToast } from "./useToast";

/**
 * Custom hook to copy text to clipboard.
 */
const useCopyToClipboard = (): [
  boolean,
  (text: string, timeout?: number, displayToast?: boolean) => void
] => {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = useCallback(
    (text: string, timeout?: number, displayToast?: boolean) => {
      try {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        if (displayToast) {
          toast({
            description: "Text copied to clipboard",
          });
        }

        // Reset the copied state after a delay to provide feedback.
        setTimeout(() => setIsCopied(false), timeout || 1500);
      } catch (error) {
        console.error("Failed to copy text to clipboard:", error);
        setIsCopied(false);
      }
    },
    []
  );

  return [isCopied, copyToClipboard];
};

export default useCopyToClipboard;
