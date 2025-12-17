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
      <div className="w-[450px] flex flex-col bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-xl z-20 relative border-r border-neutral-200/50 dark:border-neutral-800/50">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 text-neutral-900 dark:text-white">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10v10l-4-4H12a10 10 0 0 1-10-10A10 10 0 0 1 12 2z"/>
              </svg>
            </div>
            <h2 className="font-semibold text-lg tracking-tight">Vektra</h2>
          </div>

          <div className="flex items-center gap-1">
             <div className="flex items-center gap-2 mr-2">
                <Toggle
                toggled={showDebug}
                aria-label="Toggle debug mode"
                onClick={() => setShowDebug((prev) => !prev)}
                />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
               className="h-8 w-8 text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              onClick={clearHistory}
            >
              <Trash size={18} />
            </Button>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4 scrollbar-hide">
          {agentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
               <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-4 mb-4 shadow-sm">
                  <Robot size={32} className="text-neutral-900 dark:text-white" />
               </div>
               <h3 className="font-medium text-lg mb-2 text-neutral-900 dark:text-neutral-100">How can I help?</h3>
               <p className="text-sm max-w-[240px] text-neutral-400">
                Ask me to build a UI, write code, or explain a concept.
               </p>
            </div>
          ) : (
             <div className="space-y-8">
                 {agentMessages.map((m, index) => {
                    const isUser = m.role === "user";
                    const isLast = index === agentMessages.length - 1;
                    
                    return (
                    <div key={m.id} className={`group ${isLast ? 'items-end' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                         {showDebug && (
                        <pre className="text-[10px] text-neutral-400 overflow-x-auto p-2 bg-neutral-100 dark:bg-neutral-950 rounded mb-2">
                            {JSON.stringify(m, null, 2)}
                        </pre>
                        )}
                        <div className={`flex ${isUser ? "justify-end" : "justify-start gap-4"}`}>
                             {!isUser && (
                                <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shadow-sm flex-shrink-0 mt-1">
                                    <Robot size={16} />
                                </div>
                             )}

                             <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                                <div className="space-y-2">
                                     {m.parts?.map((part, i) => {
                                        if (part.type === "text") {
                                         return (
                                            <div key={i} className={`
                                                relative px-5 py-3.5 text-sm leading-7 shadow-sm
                                                ${isUser 
                                                    ? "bg-neutral-900 text-white rounded-[20px] rounded-tr-md dark:bg-white dark:text-neutral-900" 
                                                    : "bg-white border border-neutral-100 text-neutral-800 rounded-[20px] rounded-tl-md dark:bg-neutral-800 dark:border-neutral-700/50 dark:text-neutral-100"
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
                                <span className="text-[10px] text-neutral-300 dark:text-neutral-600 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {formatTime(m.metadata?.createdAt ? new Date(m.metadata.createdAt) : new Date())}
                                </span>
                             </div>

                             {isUser && (
                                 <Avatar username="User" className="h-8 w-8 mt-1 border border-neutral-200 dark:border-neutral-700 shadow-sm bg-neutral-200 dark:bg-neutral-800" />
                             )}
                        </div>
                    </div>
                );
            })}
             <div ref={messagesEndRef} className="h-px" />
             </div>
          )}
        </div>

        {/* Input Area - Modern Pill Design */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
           <form
            onSubmit={(e) => {
                e.preventDefault();
                handleAgentSubmit(e, { annotations: { hello: "world" } });
                setTextareaHeight("auto");
            }}
            className="relative bg-white dark:bg-neutral-800 rounded-[32px] shadow-2xl shadow-neutral-200/50 dark:shadow-neutral-900/50 border border-neutral-100 dark:border-neutral-700/50 p-2 flex items-end gap-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-neutral-200 dark:focus-within:ring-neutral-700"
           >
             {/* Left Actions */}
             <button
                type="button" 
                className="h-10 w-10 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors mb-0.5"
             >
                <div className="text-2xl font-light leading-none pb-1">+</div>
             </button>

            <Textarea
                disabled={pendingToolCallConfirmation}
                placeholder={pendingToolCallConfirmation ? "Waiting for tool confirmation..." : "Ask anything..."}
                className={`
                    flex-1 min-h-[44px] max-h-[200px] py-3 px-2
                    bg-transparent border-none
                    resize-none
                    text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400
                    focus:outline-none focus:ring-0
                    disabled:opacity-50 disabled:cursor-not-allowed
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
             
             {/* Right Actions */}
             <div className="flex items-center gap-1 mb-1">
                 {status === "submitted" || status === "streaming" ? (
                    <button
                     type="button"
                     onClick={stop}
                     className="h-9 w-9 flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md hover:scale-105 transition-all"
                    >
                        <Stop size={14} weight="bold" />
                    </button>
                 ) : (
                    <button
                        type="submit"
                        disabled={pendingToolCallConfirmation || !agentInput.trim()}
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                         <PaperPlaneTilt size={16} weight="fill" />
                    </button>
                 )}
             </div>
           </form>
        </div>
      </div>

      {/* Right Column: Iframe / Content Area */}
      <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 p-2 flex flex-col h-screen overflow-hidden relative">
         <div className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden relative">
            {/* Iframe Placeholder - Full Height */}
            <div className="w-full h-full bg-white dark:bg-neutral-900 flex items-center justify-center">
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
