import { CheckCircle2, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "../../../shared/components";
import Button from "../../../shared/landing/Button";

const DragDropUpload = ({ onFileUpload }) => {
  const { success, warning } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const isSupportedFile = (file) => {
    if (!file) return false;

    const validMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const fileName = file.name?.toLowerCase() || "";
    const hasValidExtension =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".docx");

    return validMimeTypes.includes(file.type) || hasValidExtension;
  };

  const processFileUpload = useCallback(
    (file) => {
      if (!isSupportedFile(file)) {
        warning("Unsupported file type. Please upload a PDF or DOCX file.");
        return;
      }

      setSelectedFile(file);
      success(`${file.name} uploaded. Starting analysis.`);
      onFileUpload(file);
    },
    [onFileUpload, success, warning],
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

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        processFileUpload(file);
      }
    },
    [processFileUpload],
  );

  const handleFileInput = useCallback(
    (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        processFileUpload(file);
      }
    },
    [processFileUpload],
  );

  const handlePaste = useCallback(
    (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          processFileUpload(file);
          break;
        }
      }
    },
    [processFileUpload],
  );

  return (
    <div
      tabIndex="0"
      className={`relative w-full p-12 border-2 border-dashed rounded-[1.5rem] transition-all duration-500 ease-out flex flex-col items-center justify-center space-y-6 focus:outline-none focus:ring-2 focus:ring-primary/40 outline-none ${
        isDragActive
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
          <span className="text-primary font-medium">PDF, DOCX</span>
        </p>
        <p className="text-xs text-primary/60 pt-2 font-medium opacity-80">
          Or press{" "}
          <kbd className="px-2 py-1 bg-surface border border-border rounded text-text-main mx-1 shadow-sm">
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="px-2 py-1 bg-surface border border-border rounded text-text-main mx-1 shadow-sm">
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept=".pdf,.doc,.docx"
          onChange={handleFileInput}
          title="Browse file"
        />
        <Button
          variant="secondary"
          size="lg"
          className="px-10 group-hover:scale-105 transition-transform duration-300"
        >
          Browse Files
        </Button>
      </div>

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
