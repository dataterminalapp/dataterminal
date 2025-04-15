/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Server as WSServer } from "ws";
import { Server } from "node:http";
import express from "express";
import { LanguageServerRunConfig, upgradeWsServer } from "./serverCommons";

/** LSP server runner */
export const runLanguageServer = (
  languageServerRunConfig: LanguageServerRunConfig
) => {
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception: ", err.toString());
    if (err.stack !== undefined) {
      console.error(err.stack);
    }
  });

  const app = express();
  const httpServer: Server = app.listen(languageServerRunConfig.serverPort);
  const wss = new WSServer(languageServerRunConfig.wsServerOptions);
  // create the web socket
  upgradeWsServer(languageServerRunConfig, {
    server: httpServer,
    wss,
  });
};
