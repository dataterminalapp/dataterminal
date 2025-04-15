import { IpcMainInvokeEvent } from "electron";
import { LATEST_ACCESS_TOKEN } from "../auth";
import { APIResponse } from "../types";
import { APIError, APIErrorJSON } from "../error";
import { Schema } from "@/features/schema";
import { Message } from "@/components/sections/chat";

const API_ENDPOINT =
  process.env["ENV"] === "development"
    ? "http://localhost:3001/api/ai"
    : "https://www.dataterminal.app/api/ai";

/**
 * Generates code based on the provided input, editor content, schema, and mentions.
 */
export const generateCode = async (
  _: IpcMainInvokeEvent,
  input: string,
  editorContent: string,
  schema: Schema,
  mentions: Array<{ id: string; label: string }>
): Promise<APIResponse<string, APIErrorJSON>> => {
  try {
    const accessToken = LATEST_ACCESS_TOKEN;
    const response = await fetch(API_ENDPOINT + "/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        editorContent,
        schema: {
          id: schema.id,
          name: schema.name,
          tables: schema.tables,
          views: schema.views,
        },
        mentions,
      }),
    });

    const { code, error } = (await response.json()) as {
      code: string;
      error: string;
    };

    if (error) {
      console.error("Error generating code: ", error);
      return {
        error: APIError.normalizeError(
          error,
          "Error generating code."
        ).toJSON(),
      };
    } else {
      return {
        data: JSON.stringify({ code }),
      };
    }
  } catch (err) {
    console.error("Error generating code: ", err);
    return {
      error: APIError.normalizeError(err, "Error generating code.").toJSON(),
    };
  }
};

/**
 * A chat-style AI based on the provided input, editor content, schema, and mentions.
 */
export const chat = async (
  _: IpcMainInvokeEvent,
  schema: Schema,
  mentions: Array<{ id: string; label: string }>,
  messages: Array<Message>
): Promise<APIResponse<string, APIErrorJSON>> => {
  try {
    const accessToken = LATEST_ACCESS_TOKEN;
    const response = await fetch(API_ENDPOINT + "/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schema: {
          id: schema.id,
          name: schema.name,
          tables: schema.tables,
          views: schema.views,
        },
        mentions,
        messages,
      }),
    });

    const { data, error } = (await response.json()) as {
      data: {
        content: string;
      };
      error: string;
    };

    if (error) {
      console.error("Error generating chat: ", error);
      return {
        error: APIError.normalizeError(error, "Internal error.").toJSON(),
      };
    } else {
      return {
        data: JSON.stringify(data),
      };
    }
  } catch (err) {
    console.error("Error generating chat: ", err);
    return {
      error: APIError.normalizeError(err, "Internal error.").toJSON(),
    };
  }
};
