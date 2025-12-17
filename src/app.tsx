/** biome-ignore-all lint/correctness/useUniqueElementIds: it's alright */
import { useEffect, useState, useRef, useCallback, use } from "react";
import { useAgent } from "agents/react";
import { isToolUIPart } from "ai";
import { useAgentChat } from "agents/ai-react";
import type { UIMessage } from "@ai-sdk/react";
import type { tools } from "./tools";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Avatar } from "@/components/avatar/Avatar";
import { Toggle } from "@/components/toggle/Toggle";
import { Textarea } from "@/components/textarea/Textarea";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";

// Icon imports
import {
  Bug,
  Moon,
  Robot,
  Sun,
  Trash,
  PaperPlaneTilt,
  Stop
} from "@phosphor-icons/react";

// List of tools that require human confirmation
// NOTE: this should match the tools that don't have execute functions in tools.ts
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation"
];

export default function Chat() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });
  const [showDebug, setShowDebug] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Apply theme class on mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const agent = useAgent({
    agent: "chat"
  });

  const [agentInput, setAgentInput] = useState("");
  const handleAgentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAgentInput(e.target.value);
  };

  const handleAgentSubmit = async (
    e: React.FormEvent,
    extraData: Record<string, unknown> = {}
  ) => {
    e.preventDefault();
    if (!agentInput.trim()) return;

    const message = agentInput;
    setAgentInput("");

    // Send message to agent
    await sendMessage(
      {
        role: "user",
        parts: [{ type: "text", text: message }]
      },
      {
        body: extraData
      }
    );
  };

  const {
    messages: agentMessages,
    addToolResult,
    clearHistory,
    status,
    sendMessage,
    stop
  } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    agentMessages.length > 0 && scrollToBottom();
  }, [agentMessages, scrollToBottom]);

  const pendingToolCallConfirmation = agentMessages.some((m: UIMessage) =>
    m.parts?.some(
      (part) =>
        isToolUIPart(part) &&
        part.state === "input-available" &&
        // Manual check inside the component
        toolsRequiringConfirmation.includes(
          part.type.replace("tool-", "") as keyof typeof tools
        )
    )
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen w-full bg-neutral-50 dark:bg-neutral-950 overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans">
      <HasOpenAIKey />

      {/* Left Column: Chat Interface */}
      <div className="w-[450px] flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm z-20">
        {/* Header */}
        <div className="h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 text-[#F48120]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10v10l-4-4H12a10 10 0 0 1-10-10A10 10 0 0 1 12 2z" />
              </svg>
            </div>
            <h2 className="font-semibold text-sm">Vektra Agent</h2>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 mr-2">
              <Bug size={16} className="text-muted-foreground" />
              <Toggle
                toggled={showDebug}
                aria-label="Toggle debug mode"
                onClick={() => setShowDebug((prev) => !prev)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 hover:text-red-500 dark:hover:text-red-400"
              onClick={clearHistory}
            >
              <Trash size={18} />
            </Button>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {agentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-4 mb-4">
                <Robot size={32} />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-neutral-900 dark:text-neutral-100">Welcome to Vektra</h3>
              <p className="text-sm max-w-[240px]">
                I can help you build web apps, answer questions, and explore ideas.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {agentMessages.map((m, index) => {
                const isUser = m.role === "user";
                const isLast = index === agentMessages.length - 1;

                return (
                  <div key={m.id} className={`group ${isLast ? 'items-end' : ''}`}>
                    {showDebug && (
                      <pre className="text-[10px] text-neutral-400 overflow-x-auto p-2 bg-neutral-100 dark:bg-neutral-950 rounded mb-2">
                        {JSON.stringify(m, null, 2)}
                      </pre>
                    )}
                    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
                      {!isUser && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 mt-1">
                          <Robot size={16} weight="fill" />
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                        <div className="space-y-1">
                          {m.parts?.map((part, i) => {
                            if (part.type === "text") {
                              return (
                                <div key={i} className={`
                                                relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                                                ${isUser
                                    ? "bg-neutral-900 text-white rounded-tr-sm dark:bg-white dark:text-neutral-900"
                                    : "bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
                                  }
                                            `}>
                                  {part.text.startsWith("scheduled message") && (
                                    <span className="block text-xs opacity-50 mb-1 font-medium tracking-wide uppercase">Scheduled</span>
                                  )}
                                  <MemoizedMarkdown
                                    id={`${m.id}-${i}`}
                                    content={part.text.replace(/^scheduled message: /, "")}
                                  />
                                </div>
                              )
                            }
                            if (isToolUIPart(part) && m.role === "assistant") {
                              const toolCallId = part.toolCallId;
                              const toolName = part.type.replace("tool-", "");
                              const needsConfirmation = toolsRequiringConfirmation.includes(toolName as keyof typeof tools);

                              return (
                                <div key={`${toolCallId}-${i}`} className="w-full my-2">
                                  <ToolInvocationCard
                                    toolUIPart={part}
                                    toolCallId={toolCallId}
                                    needsConfirmation={needsConfirmation}
                                    onSubmit={({ toolCallId, result }) => {
                                      addToolResult({ tool: toolName, toolCallId, output: result });
                                    }}
                                    addToolResult={(toolCallId, result) => {
                                      addToolResult({ tool: toolName, toolCallId, output: result });
                                    }}
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatTime(m.metadata?.createdAt ? new Date(m.metadata.createdAt) : new Date())}
                        </span>
                      </div>

                      {isUser && (
                        <Avatar className="h-8 w-8 mt-1 border border-neutral-200 dark:border-neutral-700 shadow-sm" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-px" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAgentSubmit(e, { annotations: { hello: "world" } });
              setTextareaHeight("auto");
            }}
            className="relative"
          >
            <Textarea
              disabled={pendingToolCallConfirmation}
              placeholder={pendingToolCallConfirmation ? "Waiting for tool confirmation..." : "Type your message..."}
              className={`
                    w-full min-h-[50px] max-h-[200px] py-3 pl-4 pr-12
                    bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800
                    rounded-xl resize-none
                    text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400
                    focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                `}
              value={agentInput}
              onChange={(e) => {
                handleAgentInputChange(e);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
                setTextareaHeight(`${e.target.scrollHeight}px`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleAgentSubmit(e as unknown as React.FormEvent);
                  setTextareaHeight("auto");
                }
              }}
              rows={1}
              style={{ height: textareaHeight }}
            />
            <div className="absolute right-2 bottom-2">
              {status === "submitted" || status === "streaming" ? (
                <button
                  type="button"
                  onClick={stop}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                >
                  <Stop size={16} weight="bold" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pendingToolCallConfirmation || !agentInput.trim()}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperPlaneTilt size={16} weight="fill" />
                </button>
              )}
            </div>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-neutral-400">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Iframe / Content Area */}
      <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 p-4 md:p-6 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden relative group">
          {/* Browser-like Header for Iframe */}
          <div className="h-10 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 group-hover:opacity-100 opacity-60 transition-opacity">
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3">
              <div className="h-6 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md opacity-50 text-[10px] flex items-center justify-center text-neutral-500">
                Preview
              </div>
            </div>
            <div className="w-10"></div> {/* Spacer for balance */}
          </div>

          {/* Iframe Placeholder */}
          <div className="w-full h-[calc(100%-2.5rem)] bg-white dark:bg-neutral-900 flex items-center justify-center">
            <iframe
              src="about:blank"
              className="w-full h-full border-none"
              title="Preview"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0">
              <span className="text-neutral-400">Waiting for content...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}

const hasOpenAiKeyPromise = fetch("/check-open-ai-key").then((res) =>
  res.json<{ success: boolean }>()
);

function HasOpenAIKey() {
  const hasOpenAiKey = use(hasOpenAiKeyPromise);

  if (!hasOpenAiKey.success) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-red-200 dark:border-red-900 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-labelledby="warningIcon"
                >
                  <title id="warningIcon">Warning Icon</title>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                  OpenAI API Key Not Configured
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 mb-1">
                  Requests to the API, including from the frontend UI, will not
                  work until an OpenAI API key is configured.
                </p>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Please configure an OpenAI API key by setting a{" "}
                  <a
                    href="https://developers.cloudflare.com/workers/configuration/secrets/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    secret
                  </a>{" "}
                  named{" "}
                  <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-sm">
                    OPENAI_API_KEY
                  </code>
                  . <br />
                  You can also use a different model provider by following these{" "}
                  <a
                    href="https://github.com/cloudflare/agents-starter?tab=readme-ov-file#use-a-different-ai-model-provider"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    instructions.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
