import "vscode/localExtensionHost";
import { initServices } from "monaco-languageclient/vscode/services";
import { listen } from "vscode-ws-jsonrpc";
import { MonacoLanguageClient } from "monaco-languageclient";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import { Monaco } from "@monaco-editor/react";
import {
  ErrorAction,
  CloseAction,
} from "vscode-languageclient/lib/common/client";
import * as monaco from "monaco-editor";

export async function connectClientToLanguageServer(
  editor: monaco.editor.IStandaloneCodeEditor,
  monaco: Monaco
) {
  const model = monaco.editor.createModel(
    ["SELETC ", "100,", "\t200"].join("\n"),
    "pgsql",
    monaco.Uri.parse("inmemory://model/initial")
  );
  editor.setModel(model);

  await initServices({
    serviceConfig: {
      userServices: {
        // ...getThemeServiceOverride(),
        // ...getTextmateServiceOverride(),
      },
      debugLogging: true,
    },
  });

  const webSocket = new WebSocket("ws://localhost:8999/pglsp");
  listen({
    webSocket,
    onConnection: async () => {
      const socket = toSocket(webSocket);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);

      const languageClient = new MonacoLanguageClient({
        name: "Monaco language client",
        clientOptions: {
          documentSelector: ["pgsql"],
          errorHandler: {
            error: () => ({ action: ErrorAction.Continue }),
            closed: () => ({ action: CloseAction.DoNotRestart }),
          },
          //   workspaceFolder: "/.../dataterminal",
          //   initializationOptions: {

          //   }
        },
        connectionProvider: {
          get: () => {
            return Promise.resolve({
              reader,
              writer,
            });
          },
        },
      });
      try {
        await languageClient.start();
        editor.setModel(model);
        languageClient.sendNotification("workspace/didChangeConfiguration", {
          settings: {
            pglsp: {
              db_connection_string:
                "postgresql://postgres.qrmjqauwfqlofvrsyshu:520hZTFtv4LApEx@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
            },
          },
        });
      } catch (err) {
        console.error(err);
      }
    },
  });
}
