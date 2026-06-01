import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "../../../shared/components";
import Button from "../../../modules/landing/components/Button";
const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "5 MB";
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
};

const isSupportedFile = (file) => {
  if (!file) return false;

  const fileName = file.name?.toLowerCase() || "";
  const hasValidExtension = SUPPORTED_RESUME_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );

  return SUPPORTED_RESUME_MIME_TYPES.includes(file.type) || hasValidExtension;
};

const getUploadErrorMessage = (error) => {
  if (error?.name === "AbortError" || /timeout/i.test(error?.message || "")) {
    return "Upload timed out. Please check your connection and try again.";
  }

  if (error?.status === 0 || /network/i.test(error?.message || "")) {
    return "Network error while uploading. Please check your connection and try again.";
  }

  if (error?.status >= 500) {
    return "Server error while uploading your resume. Please try again in a moment.";
  }

  if (error?.status >= 400) {
    return error.message || "Upload was rejected. Please check your resume and try again.";
  }

  return error?.message || "Invalid upload response. Please try again.";
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
    return `Resume file is too large. Please upload a file up to ${formatFileSize(MAX_RESUME_FILE_SIZE_BYTES)}.`;
  }

  return "";
};

const DragDropUpload = ({ onFileUpload, disabled = false }) => {
  const { success, warning, error: showError } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const processFileUpload = useCallback(
    async (file) => {
      const validationMessage = validateResumeFile(file);
      if (validationMessage) {
        setSelectedFile(null);
        setUploadError(validationMessage);
        warning(validationMessage);
        return;
      }

      setIsUploading(true);
      setUploadError("");

      try {
        const uploadResult = await onFileUpload(file);

        if (uploadResult === false) {
          throw new Error("Invalid upload response. Please try again.");
        }

        setSelectedFile(file);
        success(`${file.name} selected and ready for analysis.`);
      } catch (err) {
        const message = getUploadErrorMessage(err);
        setSelectedFile(null);
        setUploadError(message);
        showError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onFileUpload, showError, success, warning],
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
        processFileUpload(null);
        return;
      }

      if (files.length > 1) {
        const message = "Please upload one resume file at a time.";
        setUploadError(message);
        warning(message);
        return;
      }

      processFileUpload(files[0]);
    },
    [processFileUpload, warning],
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0] || null;
      processFileUpload(file);
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

      processFileUpload(pastedFile);
    },
    [processFileUpload],
  );

  return (
    <div
      tabIndex="0"
      className={`relative w-full p-12 border-2 border-dashed rounded-[1.5rem] transition-all duration-500 ease-out flex flex-col items-center justify-center space-y-6 focus:outline-none focus:ring-2 focus:ring-primary/40 outline-none ${
        uploadError
          ? "border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-950/10"
          : isDragActive
            ? "border-primary bg-primary/5 scale-[1.02] shadow-[0_0_40px_rgba(79,70,229,0.15)]"
            : "border-gray-200 dark:border-border bg-gray-50 dark:bg-surface/30 hover:bg-gray-100 dark:hover:bg-surface/50 hover:border-primary/40"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <div
        className={`p-6 rounded-full transition-all duration-300 ${isDragActive ? "bg-primary/20 scale-110" : "bg-primary/10"}`}
      >
        <UploadCloud
          className={`w-14 h-14 transition-colors duration-300 ${isDragActive ? "text-primary" : "text-primary/70"}`}
        />
      </div>

      <div className="text-center space-y-2">
        <p className="text-2xl font-heading font-bold text-gray-800 dark:text-text-main italic">
          Drag & Drop your resume here
        </p>
        <p className="text-text-muted">
          Supported formats:{" "}
          <span className="text-primary font-medium">PDF, DOC, DOCX</span>
        </p>
        <p className="text-xs text-text-muted">
          Maximum file size: {formatFileSize(MAX_RESUME_FILE_SIZE_BYTES)}
        </p>
        <p className="text-xs text-primary/60 pt-2 font-medium opacity-80">
          Or press{" "}
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded text-gray-900 dark:text-text-main mx-1 shadow-sm">
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded text-gray-900 dark:text-text-main mx-1 shadow-sm">
            V
          </kbd>{" "}
          to paste
        </p>
      </div>

      <div className="my-4 flex items-center justify-center space-x-4 w-full max-w-sm px-4">
        <div className="h-px bg-gray-300 dark:bg-border flex-1"></div>
        <span className="text-[10px] text-text-muted uppercase font-black tracking-[0.3em]">
          OR
        </span>
        <div className="h-px bg-gray-300 dark:bg-border flex-1"></div>
      </div>

      <div className="relative group">
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInput}
          disabled={isUploading || disabled}
          title="Browse file"
          aria-label="Browse resume file"
        />
        <Button
          variant="secondary"
          size="lg"
          disabled={isUploading || disabled}
          aria-busy={isUploading || disabled}
          className="px-10 group-hover:scale-105 transition-transform duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isUploading || disabled ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            "Browse Files"
          )}
        </Button>
      </div>

      {uploadError && (
        <div
          className="mt-4 flex items-start gap-3 px-5 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 rounded-2xl text-red-700 dark:text-red-300"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{uploadError}</p>
        </div>
      )}

      {selectedFile && (
        <div className="mt-8 flex items-center gap-3 px-6 py-3 bg-secondary/10 border border-secondary/20 rounded-full animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-secondary" />
          <p className="text-sm font-semibold text-secondary truncate max-w-[250px]">
            {selectedFile.name} ready for analysis
          </p>
        </div>
      )}
    </div>
  );
};

export default DragDropUpload;
