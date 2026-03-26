"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Users, Lock } from "lucide-react";
import { mockMessages } from "@/lib/mockChat";
import { ChatMessage } from "@/types";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

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

export default function ChatPage() {
  const { user, login } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    if (!user) { setAuthOpen(true); return; }

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
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <h1 className="text-base font-bold text-white">Chat ao Vivo</h1>
        </div>
        <div className="flex items-center gap-1.5 text-text-tint">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">462 online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {sortedMessages.map((msg) => {
          const avatarColor = getAvatarColor(msg.user);
          const isOwn = msg.user === "Você";
          return (
            <div
              key={msg.id}
              className={clsx("flex gap-3", isOwn && "flex-row-reverse")}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                  avatarColor
                )}
              >
                {getInitials(msg.user)}
              </div>
              <div className={clsx("flex-1 min-w-0 max-w-[75%]", isOwn && "items-end flex flex-col")}>
                <div
                  className={clsx(
                    "flex items-baseline gap-2 mb-1",
                    isOwn && "flex-row-reverse"
                  )}
                >
                  <span className="text-xs font-semibold text-white/80">
                    {msg.user}
                  </span>
                  <span className="text-[10px] text-text-tint">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p
                  className={clsx(
                    "text-sm leading-relaxed",
                    isOwn
                      ? "bg-primary/15 border border-primary/20 text-white/90 rounded-2xl rounded-tr-sm px-3.5 py-2"
                      : "bg-card border border-white/[0.06] text-white/80 rounded-2xl rounded-tl-sm px-3.5 py-2"
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
      <div className="px-4 py-3 border-t border-white/[0.06]">
        {!user ? (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-text-tint hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all text-sm font-medium"
          >
            <Lock className="w-4 h-4" />
            Entre para participar do chat
          </button>
        ) : (
          <div className="flex gap-2 items-center bg-card rounded-xl border border-white/[0.08] px-4 py-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva uma mensagem..."
              maxLength={200}
              className="flex-1 bg-transparent text-sm text-white placeholder-text-tint focus:outline-none"
            />
            <button className="text-text-tint hover:text-white transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={clsx(
                "p-1.5 rounded-lg transition-all",
                inputValue.trim()
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "text-text-tint cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={(u) => { login(u); setAuthOpen(false); }}
      />
    </div>
  );
}
