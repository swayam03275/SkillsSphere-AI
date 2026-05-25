import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Info, Play, Terminal, XCircle, Loader2 } from "lucide-react";

export default function SharedCodeEditor({ socket, roomId, userRole }) {
  const [code, setCode] = useState(`// Welcome to SkillSphere AI Live Coding Classroom!\n// Type your collaborative code here...\n\nfunction helloWorld() {\n  console.log("Welcome to class!");\n}`);
  const [language, setLanguage] = useState("javascript");
  const [lastEditorInfo, setLastEditorInfo] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null); // { output, isError, senderName }
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  
  const editorRef = useRef(null);
  const isRemoteChangeRef = useRef(false);

  const languages = [
    { label: "JavaScript", value: "javascript" },
    { label: "Python", value: "python" },
    { label: "HTML", value: "html" },
    { label: "CSS", value: "css" },
    { label: "C++", value: "cpp" }
  ];

  useEffect(() => {
    if (!socket) return;

    // Listen for code changes from other participants
    socket.on("code-change", ({ code }) => {
      isRemoteChangeRef.current = true;
      setCode(code);
      // Reset ref flag after rendering cycle
      setTimeout(() => {
        isRemoteChangeRef.current = false;
      }, 50);
    });

    // Listen for remote cursor updates
    socket.on("code-cursor", ({ cursorPosition, senderName }) => {
      setLastEditorInfo(`${senderName} is active on line ${cursorPosition.line}, col ${cursorPosition.column}`);
      // Clear after 3 seconds of inactivity
      const timer = setTimeout(() => {
        setLastEditorInfo("");
      }, 3000);
      return () => clearTimeout(timer);
    });

    // Listen for execution started
    socket.on("execution-started", ({ senderName }) => {
      setIsExecuting(true);
      setIsTerminalOpen(true);
      setExecutionResult({
        output: `${senderName} is running the code...\n`,
        isError: false,
        senderName,
      });
    });

    // Listen for execution result
    socket.on("execution-result", ({ output, isError, senderName }) => {
      setIsExecuting(false);
      setExecutionResult({
        output,
        isError,
        senderName,
      });
    });

    return () => {
      socket.off("code-change");
      socket.off("code-cursor");
      socket.off("execution-started");
      socket.off("execution-result");
    };
  }, [socket]);

  const handleEditorChange = (value) => {
    setCode(value);
    if (socket && !isRemoteChangeRef.current) {
      socket.emit("code-change", { roomId, code: value });
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Emit cursor position changes to others
    editor.onDidChangeCursorPosition((e) => {
      if (socket && !isRemoteChangeRef.current) {
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

  const handleRunCode = () => {
    if (!socket || isExecuting) return;
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setExecutionResult({ output: "Executing...\n", isError: false, senderName: "You" });
    
    socket.emit("execute-code-request", {
      roomId,
      code,
      language
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 h-full relative">
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
      <div className="flex-1 min-h-[400px] h-full relative">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
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
