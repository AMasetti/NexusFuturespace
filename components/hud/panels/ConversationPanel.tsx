"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudPanel } from "../core/HudPanel";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ConversationPanelProps {
  messages: Message[];
  systemName?: string;
  onSend?: (message: string) => void;
  loading?: boolean;
}

export function ConversationPanel({
  messages: initialMessages,
  systemName = "J.A.R.V.I.S",
  onSend,
  loading = false,
}: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    setMessages((prev) => [...prev, msg]);
    onSend?.(input.trim());
    setInput("");
  };

  return (
    <HudPanel title={`${systemName} · Conversation`} status="online" cornerBrackets className="flex flex-col h-full">
      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-hud-border/40">
        <button
          className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[9px] font-label uppercase tracking-widest text-hud-text-dim border border-hud-border/50 rounded hover:border-hud-primary hover:text-hud-primary transition-colors"
          onClick={() => setMessages([])}
          aria-label="Clear messages"
        >
          <Trash2 className="w-2.5 h-2.5" /> Clear
        </button>
        <button
          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-label uppercase tracking-widest text-hud-text-dim border border-hud-border/50 rounded hover:border-hud-primary hover:text-hud-primary transition-colors"
          aria-label="Export log"
        >
          <FileText className="w-2.5 h-2.5" /> Extract
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex flex-col gap-0.5", msg.role === "user" ? "items-start" : "items-end")}>
            <div
              className={cn(
                "max-w-[85%] px-2.5 py-1.5 rounded text-xs font-label leading-relaxed",
                msg.role === "user"
                  ? "bg-hud-surface-2 text-hud-text border border-hud-border/50"
                  : "bg-hud-primary/10 text-hud-text-bright border border-hud-primary/30"
              )}
            >
              {msg.content}
            </div>
            <span className="font-mono text-[8px] text-hud-text-dim px-1">{msg.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-end">
            <div className="px-3 py-2 bg-hud-primary/10 border border-hud-primary/30 rounded">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-hud-primary animate-hud-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-hud-border/40 flex gap-2">
        <input
          className="flex-1 bg-hud-surface-2 border border-hud-border/60 rounded px-2.5 py-1.5 text-xs font-label text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-primary transition-colors"
          placeholder="Enter command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          className="px-2.5 py-1.5 bg-hud-primary/20 border border-hud-primary/60 rounded text-hud-primary hover:bg-hud-primary/30 transition-colors"
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </HudPanel>
  );
}
