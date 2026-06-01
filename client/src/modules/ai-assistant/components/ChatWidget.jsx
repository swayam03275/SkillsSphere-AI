import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatBox from "./ChatBox";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-5 z-[1000] w-[calc(100vw-40px)] sm:w-[380px] h-[520px] transition-all duration-300 ease-out origin-bottom-right ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0 pointer-events-auto"
            : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChatBox onClose={() => setIsOpen(false)} />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-5 right-5 z-[1000] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen
            ? "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rotate-0 hover:bg-gray-300 dark:hover:bg-slate-600"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-xl hover:scale-105 hover:shadow-violet-500/30"
        }`}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Pulse ring when closed */}
      {!isOpen && (
        <span className="fixed bottom-5 right-5 z-[999] w-14 h-14 rounded-full animate-ping bg-violet-500/20 pointer-events-none" />
      )}
    </>
  );
};

export default ChatWidget;