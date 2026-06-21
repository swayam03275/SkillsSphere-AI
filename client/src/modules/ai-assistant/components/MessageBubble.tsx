
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

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
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{text}</span>
        ) : (
          <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-a:text-violet-500 hover:prose-a:text-violet-600 max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ node, ...props }) => <p className="m-0 mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="m-0 pl-4 mb-2 last:mb-0 list-disc" {...props} />,
                ol: ({ node, ...props }) => <ol className="m-0 pl-4 mb-2 last:mb-0 list-decimal" {...props} />,
                li: ({ node, ...props }) => <li className="m-0" {...props} />,
                // @ts-expect-error TODO: Fix pervasive types
                code: ({ node, inline, ...props }) =>
                  inline ? (
                    <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[13px]" {...props} />
                  ) : (
                    <code {...props} />
                  ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;