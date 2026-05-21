import { useState, useEffect } from "react";
import { X, Copy, Download, Check, Sparkles } from "lucide-react";

export default function CoverLetterModal({ isOpen, onClose, initialText }) {
  const [text, setText] = useState(initialText || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialText || "");
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "Cover_Letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-dark-bg/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-surface border border-border shadow-2xl rounded-[2rem] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">AI-Generated Cover Letter</h2>
              <p className="text-xs text-text-muted mt-1">Review and edit your customized cover letter below.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-dark-bg rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-full min-h-[400px] p-6 bg-dark-bg/50 text-text-main border border-border rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all resize-none text-sm leading-relaxed"
            placeholder="Your cover letter will appear here..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-border bg-surface/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-text-muted hover:text-text-main transition-colors"
          >
            Close
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-text-main bg-dark-bg border border-border hover:border-primary/50 hover:text-primary rounded-xl transition-all shadow-sm active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 rounded-xl transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download TXT
          </button>
        </div>

      </div>
    </div>
  );
}
