import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Info } from "lucide-react";

export default function SharedCodeEditor({ socket, roomId, userRole }) {
  const [code, setCode] = useState(`// Welcome to SkillSphere AI Live Coding Classroom!\n// Type your collaborative code here...\n\nfunction helloWorld() {\n  console.log("Welcome to class!");\n}`);
  const [language, setLanguage] = useState("javascript");
  const [lastEditorInfo, setLastEditorInfo] = useState("");
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

    return () => {
      socket.off("code-change");
      socket.off("code-cursor");
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

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 h-full relative">
      {/* Editor Header / Controls */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-10 flex-wrap gap-3">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Code2 size={20} />
          <span className="font-semibold text-sm text-slate-200">Collaborative Editor</span>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 px-3 text-xs focus:outline-none focus:border-indigo-500 font-medium"
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
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
        <div className="bg-indigo-950/40 border-t border-indigo-900/50 p-2 px-4 flex items-center space-x-2 text-xs text-indigo-300 backdrop-blur-sm animate-pulse transition-all duration-200">
          <Info size={14} className="flex-shrink-0" />
          <span className="font-mono">{lastEditorInfo}</span>
        </div>
      )}
    </div>
  );
}
