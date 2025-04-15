import { FnsType } from "./preload"
import { APIResponse } from "@/services/types"
export {};

declare global {
  interface Window {
    electronAPI: {
      [K in keyof FnsType]: (...args: Parameters<FnsType[K]>) => Promise<APIResponse>
    }
  }
}