import { useState, useRef, useCallback } from "react";
import {
  ClipboardList,
  Upload,
  Trash2,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { TextArea, Button, useToast } from "../../../shared/components";
/**
 * Cleans raw JD text:
 * - Collapses 3+ blank lines to 2
 * - Strips non-printable / zero-width chars
 * - Trims leading/trailing whitespace
 */
const cleanJDText = (raw) => {
  return raw
    .replace(/[^\S\r\n]+/g, " ")           // collapse inline whitespace
    .replace(/(\r?\n){3,}/g, "\n\n")        // max 2 consecutive blank lines
    .replace(/[\u200B-\u200D\uFEFF]/g, "")  // strip zero-width chars
    .trim();
};

const CHAR_LIMIT = 5000;

const JobDescriptionInput = ({ value, onChange }) => {
  const { success, error: showError, warning, info } = useToast();
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [charCount, setCharCount] = useState(value?.length ?? 0);

  const applyValue = useCallback(
    (text) => {
      const cleaned = cleanJDText(text);
      if (cleaned.length > CHAR_LIMIT) {
        warning(`Job description exceeds ${CHAR_LIMIT} characters and has been trimmed.`);
      }
      const final = cleaned.slice(0, CHAR_LIMIT);
      onChange(final);
      setCharCount(final.length);
    },
    [onChange, warning]
  );

  /* ── Textarea change ── */
  const handleTextChange = (e) => {
    const text = e.target.value;
    setCharCount(text.length);
    if (text.length > CHAR_LIMIT) {
      warning(`Character limit of ${CHAR_LIMIT} reached.`);
      onChange(text.slice(0, CHAR_LIMIT));
    } else {
      onChange(text);
    }
  };

  /* ── Auto-clean button ── */
  const handleAutoClean = () => {
    if (!value) return;
    const cleaned = cleanJDText(value);
    onChange(cleaned);
    setCharCount(cleaned.length);
    success("Job description formatting cleaned.");
  };

  /* ── Paste from clipboard ── */
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        info("Clipboard is empty.");
        return;
      }
      applyValue(text);
      success("Job description pasted from clipboard.");
    } catch {
      showError("Clipboard access denied. Please paste manually into the text area.");
    }
  };

  /* ── File upload ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
    e.target.value = "";
  };

  const readFile = (file) => {
    if (file.type === "application/pdf") {
      warning("PDF text extraction is handled on the backend. For best results, paste the JD text or upload a .txt file.");
      return;
    }
    if (!file.type.startsWith("text/") && !file.name.endsWith(".txt")) {
      showError("Unsupported file type. Please upload a .txt file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      applyValue(ev.target.result);
      success(`"${file.name}" loaded successfully.`);
    };
    reader.onerror = () => showError("Failed to read the file.");
    reader.readAsText(file);
  };

  /* ── Drag & drop ── */
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const charPercent = Math.min((charCount / CHAR_LIMIT) * 100, 100);
  const charColor =
    charPercent > 90 ? "text-red-400" :
    charPercent > 70 ? "text-yellow-400" :
    "text-text-muted";

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <ClipboardList className="w-5 h-5" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-text-main">
            Job Description
            <span className="ml-2 text-xs font-normal text-text-muted">(Optional)</span>
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Paste from clipboard */}
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors py-1.5 px-3 border border-border rounded-full bg-gray-100 dark:bg-surface/50 hover:border-primary/40"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste
          </button>

          {/* Upload .txt */}
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.text"
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors py-1.5 px-3 border border-border rounded-full bg-gray-100 dark:bg-surface/50 hover:border-primary/40 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload .txt
            </div>
          </label>

          {/* Auto-clean */}
          {value && (
            <button
              type="button"
              onClick={handleAutoClean}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-secondary transition-colors py-1.5 px-3 border border-border rounded-full bg-gray-100 dark:bg-surface/50 hover:border-secondary/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-clean
            </button>
          )}

          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setCharCount(0); }}
              className="flex items-center gap-1.5 text-xs font-medium text-red-400/70 hover:text-red-400 transition-colors py-1.5 px-3 border border-red-400/20 rounded-full bg-red-400/5 hover:border-red-400/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Drag-over drop zone wrapper */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl transition-all duration-200 ${
          isDragOver
            ? "ring-2 ring-primary/60 bg-primary/5 scale-[1.005]"
            : ""
        }`}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-primary/10 border-2 border-dashed border-primary pointer-events-none">
            <FileText className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm font-semibold text-primary">Drop .txt file here</p>
          </div>
        )}

        <TextArea
          id="job-description"
          placeholder="Paste the job description here, or drag & drop a .txt file…&#10;&#10;Include role requirements, responsibilities, and required skills for the best match score."
          value={value}
          onChange={handleTextChange}
          rows={7}
          className={isDragOver ? "opacity-30 pointer-events-none" : ""}
        />
      </div>

      {/* Footer: char count + filled indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {value && (
            <span className="flex items-center gap-1 text-xs text-secondary">
              <CheckCircle2 className="w-3.5 h-3.5" />
              JD added — match score will be included in analysis
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charPercent > 90 ? "bg-red-400" :
                charPercent > 70 ? "bg-yellow-400" :
                "bg-primary"
              }`}
              style={{ width: `${charPercent}%` }}
            />
          </div>
          <span className={`text-xs font-mono ${charColor}`}>
            {charCount}/{CHAR_LIMIT}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionInput;
