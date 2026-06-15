import { useState, useRef, useCallback } from "react";
import { ClipboardPaste, Upload, FileText } from "lucide-react";
import { useToast } from "../../../shared/components";

const cleanJDText = (raw) => {
  return raw
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
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

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
              Job Description <span className="text-[13px] font-medium text-gray-400 ml-1">(Optional)</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Paste the job description or upload a .txt file
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-gray-400" />
            Paste
          </button>
          
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Upload className="w-3.5 h-3.5 text-gray-400" />
            Upload .txt
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.text"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* Text Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex-grow flex flex-col rounded-xl border transition-all duration-200 bg-white dark:bg-[#121214] ${
          isDragOver
            ? "border-indigo-400 bg-indigo-50/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
        }`}
      >
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="Paste the job description here, or drag & drop a .txt file...&#10;&#10;Include role requirements, responsibilities, and required skills for the best match score."
          className={`w-full h-full min-h-[220px] p-5 rounded-xl resize-none bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none ${
            isDragOver ? "opacity-30 pointer-events-none" : ""
          }`}
        />
        
        {/* Character Count */}
        <div className="absolute bottom-3 right-4 flex justify-end w-full pointer-events-none">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
            {charCount}/{CHAR_LIMIT}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionInput;
