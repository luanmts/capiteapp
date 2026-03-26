"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Users, ChevronRight, ChevronLeft } from "lucide-react";
import { mockMessages } from "@/lib/mockChat";
import { ChatMessage } from "@/types";
import clsx from "clsx";

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-yellow-500",
];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputValue, setInputValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: "Você",
      message: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [newMsg, ...prev.slice(0, 49)]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div
      className={clsx(
        "hidden lg:flex flex-col fixed right-0 top-16 bottom-0 z-30 bg-card border-l border-white/[0.06] transition-all duration-300",
        collapsed ? "w-10" : "w-72 xl:w-80"
      )}
    >
      {collapsed ? (
        /* ── Collapsed strip ── */
        <div className="flex flex-col items-center h-full py-4 gap-4">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-text-tint hover:text-white transition-colors"
            title="Abrir chat"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {/* Rotated label */}
          <div className="flex-1 flex items-center justify-center">
            <span
              className="text-[9px] font-bold text-text-tint uppercase tracking-widest whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              CHAT AO VIVO
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 text-text-tint">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium">462</span>
          </div>
        </div>
      ) : (
        /* ── Expanded panel ── */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Chat ao Vivo
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-text-tint">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">462</span>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded-lg hover:bg-white/10 text-text-tint hover:text-white transition-colors"
                title="Minimizar chat"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {sortedMessages.map((msg) => {
              const avatarColor = getAvatarColor(msg.user);
              const isOwn = msg.user === "Você";
              return (
                <div
                  key={msg.id}
                  className={clsx("flex gap-2.5", isOwn && "flex-row-reverse")}
                >
                  <div
                    className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
                      avatarColor
                    )}
                  >
                    {getInitials(msg.user)}
                  </div>
                  <div className={clsx("flex-1 min-w-0", isOwn && "items-end flex flex-col")}>
                    <div
                      className={clsx(
                        "flex items-baseline gap-1.5 mb-0.5",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      <span className="text-[10px] font-semibold text-white/80 truncate">
                        {msg.user}
                      </span>
                      <span className="text-[9px] text-text-tint shrink-0">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p
                      className={clsx(
                        "text-xs text-white/70 leading-relaxed",
                        isOwn
                          ? "bg-primary/15 border border-primary/20 rounded-xl rounded-tr-sm px-2.5 py-1.5 text-right"
                          : "bg-gray-medium/60 rounded-xl rounded-tl-sm px-2.5 py-1.5"
                      )}
                    >
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
            <div className="flex gap-1.5 items-center bg-gray-dark rounded-xl border border-white/[0.06] px-3 py-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma mensagem..."
                maxLength={200}
                className="flex-1 bg-transparent text-xs text-white placeholder-text-tint focus:outline-none"
              />
              <button className="text-text-tint hover:text-white transition-colors p-0.5">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={clsx(
                  "p-1 rounded-lg transition-all",
                  inputValue.trim()
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "text-text-tint cursor-not-allowed"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
