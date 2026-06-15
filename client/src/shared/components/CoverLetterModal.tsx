// @ts-nocheck

import { useState, useEffect } from "react";
import { X, Copy, Download, Check, Sparkles, FileText, Loader2, RefreshCw } from "lucide-react";
import html2pdf from "html2pdf.js";
import { useToast } from "./toast/ToastProvider";

import logger from "../../utils/logger";

export default function CoverLetterModal({ isOpen, onClose, initialText, onRegenerate }) {
  const toast = useToast();
  const [text, setText] = useState(initialText || "");
  const [copied, setCopied] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");
  const [isRegenerating, setIsRegenerating] = useState(false);

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
      toast.success("Copied to clipboard!");
    } catch (err) {
      logger.error("Failed to copy text:", err);
      toast.error("Failed to copy text. Please try manually.");
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

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const paragraphs = text.split('\n').filter(p => p.trim() !== '');
      const htmlContent = `
        <div style="font-family: 'Inter', 'Helvetica', 'Arial', sans-serif; font-size: 11pt; color: #000; line-height: 1.7; padding: 20px; max-width: 700px; margin: 0 auto;">
          ${paragraphs.map(p => `<p style="margin-bottom: 18px; text-align: justify;">${p}</p>`).join('')}
        </div>
      `;
      
      const opt = {
        margin:       [20, 20, 20, 20], // top, left, bottom, right
        filename:     'Professional_Cover_Letter.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(htmlContent).save();
      toast.success("PDF downloaded successfully.");
    } catch (err) {
      logger.error("Failed to generate PDF:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleRegenerateClick = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      const newText = await onRegenerate(tone, language);
      if (newText) {
        setText(newText);
        toast.success("Cover letter regenerated successfully!");
      }
    } catch (err) {
      logger.error("Regeneration failed:", err);
      toast.error(err?.response?.data?.message || err.message || "Failed to regenerate cover letter. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-dark-bg/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-surface border border-gray-200 dark:border-border shadow-2xl rounded-[2rem] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-text-main">AI-Generated Cover Letter</h2>
              <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Review and edit your customized cover letter below.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onRegenerate && (
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isRegenerating}
                  className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-border text-gray-900 dark:text-text-main text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none appearance-none cursor-pointer hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isRegenerating}
                  className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-border text-gray-900 dark:text-text-main text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none appearance-none cursor-pointer hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  <option value="Professional">Professional</option>
                  <option value="Formal">Formal</option>
                  <option value="Confident">Confident</option>
                  <option value="Concise">Concise</option>
                  <option value="Startup-Friendly">Startup-Friendly</option>
                  <option value="Creative">Creative</option>
                </select>
                <button
                  onClick={handleRegenerateClick}
                  disabled={isRegenerating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Generating..." : "Regenerate"}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-text-muted hover:text-gray-900 dark:hover:text-text-main hover:bg-gray-100 dark:hover:bg-dark-bg rounded-xl transition-all"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`w-full h-full min-h-[400px] p-6 bg-gray-50 dark:bg-dark-bg/50 text-gray-900 dark:text-text-main border border-gray-200 dark:border-border rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all resize-none text-sm leading-relaxed ${isRegenerating ? "opacity-50 pointer-events-none" : ""}`}
            placeholder="Your cover letter will appear here..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-border bg-gray-50 dark:bg-surface/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 dark:text-text-muted hover:text-gray-900 dark:hover:text-text-main transition-colors mr-auto"
          >
            Close
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-900 dark:text-text-main bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-border hover:border-primary/50 hover:text-primary rounded-xl transition-all shadow-sm active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-900 dark:text-text-main bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-border hover:border-primary/50 hover:text-primary rounded-xl transition-all shadow-sm active:scale-95"
          >
            <FileText className="w-4 h-4" />
            Save TXT
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 rounded-xl transition-all active:scale-95"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExportingPDF ? "Exporting..." : "Download PDF"}
          </button>
        </div>

      </div>
    </div>
  );
}
