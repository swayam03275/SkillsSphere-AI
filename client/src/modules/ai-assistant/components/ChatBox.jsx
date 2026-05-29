import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { X, Send, Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { API_URL } from "../../../config/env";

const ChatBox = ({ onClose }) => {
  const { token } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! 👋 I'm your SkillsSphere AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessageToBackend = async (message) => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error(error);
      return "Sorry, I couldn't process that. Please try again.";
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    setInput("");
    setIsLoading(true);

    // Show typing indicator
    setMessages((prev) => [...prev, { sender: "bot", text: "Thinking..." }]);

    const reply = await sendMessageToBackend(trimmed);

    // Replace typing indicator with actual reply
    setMessages((prev) => [...prev.slice(0, -1), { sender: "bot", text: reply }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">SkillsSphere AI</h3>
            <p className="text-[10px] text-white/70 font-medium">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-800/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
        {messages.map((msg, index) => (
          <MessageBubble key={index} sender={msg.sender} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;