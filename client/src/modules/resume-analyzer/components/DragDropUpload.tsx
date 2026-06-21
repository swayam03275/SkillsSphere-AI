
import { CloudUpload, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "../../../shared/components";
import Button from "../../../shared/components/Button";

const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const isSupportedFile = (file) => {
  if (!file) return false;

  const fileName = file.name?.toLowerCase() || "";
  const hasValidExtension = SUPPORTED_RESUME_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );

  return SUPPORTED_RESUME_MIME_TYPES.includes(file.type) || hasValidExtension;
};

export const validateResumeFile = (file) => {
  if (!file) {
    return "Please choose a resume file to upload.";
  }

  if (file.size === 0) {
    return "The selected resume file is empty. Please choose a valid PDF, DOC, or DOCX file.";
  }

  if (!isSupportedFile(file)) {
    return "Unsupported file type. Please upload a PDF, DOC, or DOCX resume.";
  }

  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return "Resume file is too large. Please upload a file up to 5 MB.";
  }

  return "";
};

const DragDropUpload = ({ onFileUpload, disabled = false, isUploading = false, uploadProgressLabel = "" }) => {
  const { warning } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);

  const processFileUpload = useCallback(
    async (file) => {
      const validationMessage = validateResumeFile(file);
      if (validationMessage) {
        warning(validationMessage);
        return;
      }
      onFileUpload(file);
    },
    [onFileUpload, warning],
  );

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;

      if (!files || files.length === 0) {
        return;
      }

      if (files.length > 1) {
        warning("Please upload one resume file at a time.");
        return;
      }

      processFileUpload(files[0]);
    },
    [processFileUpload, warning],
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        processFileUpload(file);
      }
      e.target.value = "";
    },
    [processFileUpload],
  );

  const handlePaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items || [];
      let pastedFile = null;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          pastedFile = items[i].getAsFile();
          break;
        }
      }

      if (pastedFile) {
        processFileUpload(pastedFile);
      }
    },
    [processFileUpload],
  );

  return (
    <div
      // @ts-expect-error TODO: Fix pervasive types
      tabIndex="0"
      className={`relative w-full h-full min-h-[300px] py-16 px-6 border-[1.5px] border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 outline-none ${
        isDragActive
          ? "border-blue-400 bg-blue-50/50 scale-[1.01] shadow-lg"
          : "border-indigo-300/60 dark:border-indigo-500/30 bg-transparent hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <div className="bg-indigo-100/50 dark:bg-indigo-500/10 p-5 rounded-full mb-6 relative">
        {isUploading ? (
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        ) : (
          <CloudUpload className="w-10 h-10 text-indigo-500" />
        )}
      </div>

      <div className="text-center space-y-3 max-w-md">
        <p className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tight">
          {isUploading ? (uploadProgressLabel || "Processing...") : "Drag & Drop your resume here"}
        </p>
        
        {!isUploading && (
          <>
            <p className="text-[15px] text-gray-500 dark:text-gray-400">
              Supported formats: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">PDF, DOC, DOCX</span>
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Maximum file size: 5 MB
            </p>
            
            <p className="text-sm text-indigo-400/80 dark:text-indigo-400/60 pt-3">
              Or press{" "}
              <kbd className="px-2 py-0.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-gray-700 dark:text-gray-300 text-xs shadow-sm font-sans">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-2 py-0.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-gray-700 dark:text-gray-300 text-xs shadow-sm font-sans">
                V
              </kbd>{" "}
              to paste
            </p>
          </>
        )}
      </div>

      {!isUploading && (
        <>
          <div className="w-full max-w-[200px] flex items-center gap-4 my-8 opacity-60">
            <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
            <span className="text-[11px] font-black text-gray-400 tracking-[0.2em]">OR</span>
            <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
          </div>

          <div className="relative group">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              disabled={disabled}
              title="Browse file"
              aria-label="Browse resume file"
            />
            {/* @ts-expect-error TODO: Fix pervasive types */}
            <Button
              type="button"
              variant="primary"
              disabled={disabled}
              className="px-8 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold border-none rounded-xl dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
            >
              Browse Files
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DragDropUpload;
