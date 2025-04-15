// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron/renderer";
import { APIResponse } from "./services/types";
import { APIErrorJSON } from "./services/error";
import { AppConfig } from "./components/app";
import { Schema } from "./features/schema";
import { Message } from "./components/sections/chat";

export const fns = {
  setConnectionString: (connectionString: string, database?: string) =>
    ipcRenderer.invoke(
      "setConnectionString",
      connectionString,
      database
    ) as Promise<APIResponse<unknown, APIErrorJSON>>,
  query: (
    sql: string,
    values?: Array<string>,
    panelId?: string,
    limit?: boolean
  ) => ipcRenderer.invoke("query", sql, values, panelId, limit),
  login: () => ipcRenderer.invoke("login"),
  removeAuthData: () => ipcRenderer.invoke("removeAuthData"),
  getAuthData: () => ipcRenderer.invoke("getAuthData"),
  openGoProBrowser: () => ipcRenderer.invoke("openGoProBrowser"),
  testConnectionString: (connectionString: string) =>
    ipcRenderer.invoke("testConnectionString", connectionString),
  parseConnectionString: (connectionString: string) =>
    ipcRenderer.invoke("parseConnectionString", connectionString),
  saveAppConfig: (config: Partial<AppConfig>) =>
    ipcRenderer.invoke("saveAppConfig", config),
  getAppConfig: () => ipcRenderer.invoke("getAppConfig"),
  cancelQuery: (panelId: string) => ipcRenderer.invoke("cancelQuery", panelId),
  latencyDatabase: () => ipcRenderer.invoke("latencyDatabase"),
  removePanelClient: (panelId: string) =>
    ipcRenderer.invoke("removePanelClient", panelId),
  generateCode: (
    input: string,
    editorContent: string,
    schema: Schema,
    mentions: Array<{ id: string; label: string }>
  ) =>
    ipcRenderer.invoke("generateCode", input, editorContent, schema, mentions),
  chat: (
    schema: Schema,
    mentions: Array<{ id: string; label: string }>,
    messages: Array<Message>
  ) => ipcRenderer.invoke("chat", schema, mentions, messages),
  quit: () => ipcRenderer.invoke("quit"),
};

export type FnsType = typeof fns;

contextBridge.exposeInMainWorld("electronAPI", fns);
