import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Info, Play, Terminal, XCircle, Loader2, Copy, Download } from "lucide-react";
import { useToast } from "../../../shared/components/toast/ToastProvider";

import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";

import logger from "../../../utils/logger";

export default function CollaborativeEditor({ socket, roomId, userRole, initialCode }) {
  const { success } = useToast();
  // Standard code state
  const [code, setCode] = useState(initialCode || `// Welcome to SkillSphere AI Live Coding Classroom!\n// Type your collaborative code here...\n\nfunction helloWorld() {\n  logger.log("Welcome to class!");\n}`);
  const [language, setLanguage] = useState("javascript");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [lastEditorInfo, setLastEditorInfo] = useState("");
  
  const editorRef = useRef(null);
  const docRef = useRef(null);
  const bindingRef = useRef(null);

  const languages = [
    { label: "JavaScript", value: "javascript" },
    { label: "Python", value: "python" },
    { label: "HTML", value: "html" },
    { label: "CSS", value: "css" },
    { label: "C++", value: "cpp" }
  ];

  // Setup Yjs and Socket.io relay integration
  useEffect(() => {
    if (!socket || !roomId) return;

    // Create Yjs Document
    const doc = new Y.Doc();
    docRef.current = doc;

    // Handle incoming Yjs updates from the relay server
    const handleRemoteUpdate = ({ update }) => {
      Y.applyUpdate(doc, new Uint8Array(update));
    };

    socket.on("yjs-update", handleRemoteUpdate);

    // Send local Yjs updates to the relay server
    doc.on("update", (update) => {
      // Y.applyUpdate triggers this, but we only want to broadcast local changes
      socket.emit("yjs-update", { roomId, update: Array.from(update) });
    });

    // Handle code execution events
    socket.on("execution-started", ({ senderName }) => {
      setIsExecuting(true);
      setIsTerminalOpen(true);
      setExecutionResult({
        output: `${senderName} is running the code...\n`,
        isError: false,
        senderName,
      });
    });

    socket.on("execution-result", ({ output, isError, senderName }) => {
      setIsExecuting(false);
      setExecutionResult({
        output,
        isError,
        senderName,
      });
    });
    
    // Also handle cursor events
    socket.on("code-cursor", ({ cursorPosition, senderName }) => {
      setLastEditorInfo(`${senderName} is active on line ${cursorPosition.line}, col ${cursorPosition.column}`);
      setTimeout(() => setLastEditorInfo(""), 3000);
    });

    return () => {
      socket.off("yjs-update", handleRemoteUpdate);
      socket.off("execution-started");
      socket.off("execution-result");
      socket.off("code-cursor");
      doc.destroy();
    };
  }, [socket, roomId]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    if (docRef.current) {
      const type = docRef.current.getText("monaco");
      
      // If the document is currently empty but we have initialCode, insert it
      if (type.toString() === "" && initialCode) {
        type.insert(0, initialCode);
      } else if (type.toString() === "" && code) {
        type.insert(0, code);
      }

      // Bind Yjs to Monaco
      bindingRef.current = new MonacoBinding(
        type,
        editor.getModel(),
        new Set([editor]),
        // We aren't setting up awareness in this lightweight relay, but it can be added here
      );
    }
    
    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        socket.emit("code-cursor", {
          roomId,
          cursorPosition: {
            line: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleRunCode = () => {
    if (!socket || isExecuting) return;
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setExecutionResult({ output: "Executing...\n", isError: false, senderName: "You" });
    
    // Use the latest Yjs text content
    const currentCode = docRef.current?.getText("monaco").toString() || code;
    
    socket.emit("execute-code-request", {
      roomId,
      code: currentCode,
      language
    });
  };

  const handleCopyCode = async () => {
    try {
      const currentCode = docRef.current?.getText("monaco").toString() || code;
      await navigator.clipboard.writeText(currentCode);
      success("Code copied to clipboard!");
    } catch (err: any) {
      logger.error("Failed to copy", err);
    }
  };

  const handleDownloadCode = () => {
    const extMap = {
      javascript: "js",
      python: "py",
      html: "html",
      css: "css",
      cpp: "cpp"
    };
    const ext = extMap[language] || "txt";
    const currentCode = docRef.current?.getText("monaco").toString() || code;
    const blob = new Blob([currentCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skillssphere-code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success("Code file downloaded!");
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
      {/* Editor Header / Controls */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-10 flex-wrap gap-3">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Code2 size={20} />
          <span className="font-semibold text-sm text-slate-200">Collaborative Editor</span>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-medium hidden sm:block">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500 font-medium"
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleCopyCode}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Copy Code"
          >
            <Copy size={16} />
          </button>
          
          <button
            onClick={handleDownloadCode}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Download Code"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isExecuting 
                ? "bg-indigo-500/50 text-white cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
            }`}
          >
            {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />}
            <span>{isExecuting ? "Running..." : "Run Code"}</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative min-h-0">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          defaultValue={initialCode || code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            cursorBlinking: "smooth",
            padding: { top: 16 },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false
            }
          }}
        />
      </div>

      {/* Editor Status Bar */}
      {lastEditorInfo && (
        <div className="bg-indigo-950/40 border-t border-indigo-900/50 p-2 px-4 flex items-center space-x-2 text-xs text-indigo-300 backdrop-blur-sm animate-pulse transition-all duration-200 z-10">
          <Info size={14} className="flex-shrink-0" />
          <span className="font-mono">{lastEditorInfo}</span>
        </div>
      )}

      {/* Terminal Output Pane */}
      {isTerminalOpen && (
        <div className="h-64 border-t border-slate-800 bg-[#0f172a] flex flex-col z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between p-2 px-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-slate-400">
              <Terminal size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Execution Output</span>
              {executionResult?.senderName && (
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded ml-2">Run by: {executionResult.senderName}</span>
              )}
            </div>
            <button 
              onClick={() => setIsTerminalOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed custom-scrollbar">
            {executionResult ? (
              <pre className={`whitespace-pre-wrap ${executionResult.isError ? "text-red-400" : "text-emerald-400"}`}>
                {executionResult.output}
              </pre>
            ) : (
              <span className="text-slate-500 italic">No output yet...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
