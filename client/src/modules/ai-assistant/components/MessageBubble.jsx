import { Sparkles } from "lucide-react";

const MessageBubble = ({ sender, text }) => {
  const isUser = sender === "user";
  const isTyping = text === "Thinking...";

  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Sparkles size={13} className="text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed animate-[fadeIn_0.2s_ease-out] ${
          isUser
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-md"
            : "bg-gray-100 dark:bg-slate-700/80 text-gray-800 dark:text-slate-200 rounded-2xl rounded-bl-md border border-gray-200 dark:border-slate-600/50"
        }`}
      >
        {isTyping ? (
          <div className="flex items-center gap-1 py-0.5 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          text
        )}
      </div>
    </div>
  );
};

export default MessageBubble;