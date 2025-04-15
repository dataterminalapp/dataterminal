import { Editor, EditorContent, useEditor } from "@tiptap/react";
import React, { useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "../../ui/button";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { extractTextFromTiptapJSON } from "../../sections/code/instructions/mention/utils";
import { useAppSelector } from "@/hooks/useRedux";
import { APIErrorJSON } from "@/services/error";
import { APIResponse } from "@/services/types";
import { useToast } from "@/hooks/useToast";
import { OpenAI } from "openai";

export interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const ConversationMessage = ({
  role,
  content,
  id,
}: {
  role: string;
  content: string;
  id: string;
}) => {
  const isUser = role === "user";

  return (
    <article
      className="w-full text-token-text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
      dir="auto"
      data-testid={`conversation-turn-${isUser ? "2" : "3"}`}
      data-scroll-anchor={isUser ? "false" : "true"}
    >
      <h5 className="sr-only">{isUser ? "You said:" : "AI said:"}</h5>
      <div className="text-base my-auto mx-auto py-[18px] px-6">
        <div className="mx-auto flex flex-1 text-base gap-4 md:gap-5 lg:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
          <div
            className={`group/conversation-turn relative flex w-full min-w-0 flex-col ${
              !isUser ? "agent-turn" : ""
            }`}
          >
            <div className="flex-col gap-1 md:gap-3">
              <div className="flex max-w-full flex-col flex-grow">
                <div
                  data-message-author-role={role}
                  data-message-id={id}
                  dir="auto"
                  className="min-h-8 text-message relative flex w-full flex-col items-end gap-2 whitespace-normal break-words text-start [.text-message+&]:mt-5"
                >
                  {isUser ? (
                    // User message layout
                    <div className="flex w-full flex-col gap-1 empty:hidden items-end rtl:items-start">
                      <div className="relative max-w-3xl rounded-3xl bg-token-message-surface px-5 py-2.5">
                        <div className="whitespace-pre-wrap">{content}</div>
                      </div>
                    </div>
                  ) : (
                    // Assistant message layout
                    <div className="flex w-full flex-col gap-1 empty:hidden first:pt-[3px]">
                      <div className="markdown prose w-full break-words dark:prose-invert light">
                        {content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const ConversationInput = ({
  editor,
  className,
  onSubmit,
  handleKeyDown,
}: {
  editor: Editor | null;
  className?: string;
  onSubmit: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) => {
  return (
    <div className={className}>
      <div className="text-base mx-auto px-3 w-full md:px-5 lg:px-4 xl:px-5">
        <div className="mx-auto flex flex-1 text-base gap-4 md:gap-5 lg:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
          <div className="relative z-[1] flex h-full max-w-full flex-1 flex-col">
            <div className="group relative z-[1] flex w-full items-center">
              <div className="w-full">
                <div
                  onClick={() => editor?.commands.focus()}
                  className="flex w-full cursor-text flex-col rounded-3xl border px-3 py-1 duration-150 ease-in-out bg-editor"
                >
                  <EditorContent
                    autoFocus
                    editor={editor}
                    onKeyDown={handleKeyDown}
                    // Min-w-1 to solve the issue with tiptap not rendering cursor
                    className="min-h-[44px] overflow-auto max-h-48 min-w-1 pt-2 pl-2"
                  />
                  <div className="mb-2 mt-1 flex items-center justify-between sm:mt-5">
                    <div className="flex gap-x-1.5"></div>
                    <div className="flex gap-x-1.5">
                      <Button
                        className=" rounded-full size-8 p-2"
                        onClick={onSubmit}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="3"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Space filling */}
      <div className="relative min-h-8"></div>
    </div>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [, setLoading] = useState(false);
  const { toast } = useToast();
  const currentSchemaName = useAppSelector(
    (state) => state.workspace.schema.current
  );
  const schema = useAppSelector((state) =>
    currentSchemaName
      ? state.schema.schemas.entities[currentSchemaName]
      : undefined
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Ask anything",
      }),
    ],
  });

  const handleSendMessage = async () => {
    try {
      if (!editor) {
        return;
      }
      const { mentions, text } = extractTextFromTiptapJSON(editor.getJSON());
      if (!text) return;
      if (!schema) {
        toast({
          title: "Please select a valid connection first",
          description: "You need to select a valid connection to chat.",
        });
        return;
      }
      setLoading(true);
      const newMessages: Array<Message> = [
        ...messages,
        {
          role: "user",
          content: text,
          id: "",
        },
      ];
      setMessages(newMessages);
      editor.commands.clearContent();

      const { data }: APIResponse<string, APIErrorJSON> = await (
        window as Window
      ).electronAPI.chat(schema, mentions, newMessages);
      if (data) {
        const choice: OpenAI.Chat.Completions.ChatCompletion.Choice =
          JSON.parse(data);

        const runQuery = choice.message.tool_calls?.find(
          (x) => x.id === "runQuery"
        );

        if (runQuery) {
          console.log("Run QUERY");
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data,
            id: "",
          },
        ]);
      }
    } catch (err) {
      console.error("Error generating chat: ", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 grow basis-auto overflow-hidden">
        <div className="relative h-full">
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex flex-col text-sm md:pb-9">
              {messages.map((x) => (
                <ConversationMessage
                  role={x.role}
                  content={x.content}
                  id={""}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "w-full flex flex-col items-center",
          isEmpty ? "absolute left-1/2 -translate-x-1/2 top-1/3" : "relative"
        )}
      >
        {isEmpty && (
          <h1 className="mb-6 text-3xl font-medium text-center">
            What can I assist with?
          </h1>
        )}
        <ConversationInput
          editor={editor}
          className="isolate w-full basis-auto border-white/20 md:border-transparent md:pt-0"
          onSubmit={handleSendMessage}
          handleKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

export default Chat;
