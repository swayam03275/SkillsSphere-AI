import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Trash2,
  Eraser,
  Edit2,
  Undo,
  Redo,
  Type,
  Square,
  Circle,
  ArrowUpRight,
  Minus
} from "lucide-react";

export default function Whiteboard({ socket, roomId, userRole, initialStrokes }) {
  const canvasRef = useRef(null);
  
  // State for canvas configuration and tool selections
  const [tool, setTool] = useState("pen"); // pen, line, rect, circle, arrow, text, eraser
  const [color, setColor] = useState("#38bdf8"); // Neon Blue default
  const [lineWidth, setLineWidth] = useState(4);
  
  // State lists for action undo-redo sync
  const [rawEvents, setRawEvents] = useState([]);
  const [undoStack, setUndoStack] = useState([]); // holds arrays of undone raw events
  
  // Text input overlay state
  const [textInput, setTextInput] = useState({
    visible: false,
    x: 0,
    y: 0,
    normX: 0,
    normY: 0,
    value: ""
  });
  const textInputRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const prevPositionRef = useRef({ x: 0, y: 0 });
  const currentPointsRef = useRef([]);
  const currentActionIdRef = useRef(null);

  const colors = [
    { name: "Sky Blue", value: "#38bdf8" },
    { name: "Neon Green", value: "#4ade80" },
    { name: "Neon Red", value: "#f87171" },
    { name: "Yellow", value: "#facc15" },
    { name: "Purple", value: "#c084fc" },
    { name: "White", value: "#ffffff" }
  ];

  // Helper to compile raw events list into logical drawings
  const compileActions = useCallback((events) => {
    const actionMap = {};
    const compiled = [];

    events.forEach((item) => {
      const data = item.strokeData;
      if (!data) return;

      if (data.type === "shape" || data.type === "text") {
        compiled.push(data);
      } else {
        // Freehand or Eraser segment
        const actionId = data.actionId || "legacy";
        if (!actionMap[actionId]) {
          actionMap[actionId] = {
            type: "freehand",
            points: [],
            color: data.color || "#38bdf8",
            width: data.width || 4,
            isEraser: data.isEraser,
            actionId
          };
          compiled.push(actionMap[actionId]);
        }
        actionMap[actionId].points.push({ x: data.x, y: data.y });
        if (actionMap[actionId].points.length === 1 && data.prevX !== undefined) {
          actionMap[actionId].points.unshift({ x: data.prevX, y: data.prevY });
        }
      }
    });

    return compiled;
  }, []);

  // Draw a single action onto the context
  const drawAction = useCallback((ctx, canvas, action) => {
    ctx.strokeStyle = action.isEraser ? "#0b0f19" : action.color; // Match background
    ctx.lineWidth = action.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (action.type === "freehand") {
      const pts = action.points;
      if (!pts || pts.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
      }
      ctx.stroke();
    } else if (action.type === "shape") {
      const startX = action.startX * canvas.width;
      const startY = action.startY * canvas.height;
      const endX = action.endX * canvas.width;
      const endY = action.endY * canvas.height;

      ctx.beginPath();
      if (action.shape === "line") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (action.shape === "rect") {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (action.shape === "circle") {
        const dx = endX - startX;
        const dy = endY - startY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.shape === "arrow") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead wings
        const angle = Math.atan2(endY - startY, endX - startX);
        const headlen = Math.max(12, action.width * 3);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (action.type === "text") {
      ctx.font = `${action.size}px sans-serif`;
      ctx.fillStyle = action.color;
      ctx.fillText(action.text, action.x * canvas.width, action.y * canvas.height);
    }
  }, []);

  // Redraw the entire canvas from compiled actions
  const redrawCanvas = useCallback((events) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const compiledActions = compileActions(events);
    compiledActions.forEach((action) => {
      drawAction(ctx, canvas, action);
    });
  }, [compileActions, drawAction]);

  // Handle canvas sizing and sockets synchronization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent || parent.clientWidth === 0) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawCanvas(rawEvents);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Socket Event listeners
    if (socket) {
      socket.on("sync-state", ({ whiteboard }) => {
        if (whiteboard) {
          setRawEvents(whiteboard);
          redrawCanvas(whiteboard);
        }
      });

      socket.on("draw-stroke", (payload) => {
        setRawEvents((prev) => {
          const next = [...prev, payload];
          redrawCanvas(next);
          return next;
        });
      });

      socket.on("undo-whiteboard", ({ actionId }) => {
        setRawEvents((prev) => {
          let next;
          if (actionId) {
            next = prev.filter((item) => item.strokeData?.actionId !== actionId);
          } else {
            next = prev.slice(0, -1);
          }
          redrawCanvas(next);
          return next;
        });
      });

      socket.on("clear-canvas", () => {
        setRawEvents([]);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    if (initialStrokes && initialStrokes.length > 0) {
      // Small timeout to ensure canvas is fully mounted and sized before drawing
      setTimeout(() => {
        initialStrokes.forEach((strokeData) => {
          // Wrap drawRemoteStroke logic locally here if it needs ctx access,
          // but drawRemoteStroke creates its own context so it's safe.
          drawRemoteStroke(strokeData.strokeData || strokeData);
        });
      }, 50);
    }

    return () => {
      resizeObserver.disconnect();
      if (socket) {
        socket.off("sync-state");
        socket.off("draw-stroke");
        socket.off("undo-whiteboard");
        socket.off("clear-canvas");
      }
    };
  }, [socket, rawEvents, redrawCanvas]);

  // Focus inline text input when it opens
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.visible]);

  // Drawing event handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || textInput.visible) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const normX = (clientX - rect.left) / rect.width;
    const normY = (clientY - rect.top) / rect.height;

    // Handle Text tool selection immediately
    if (tool === "text") {
      setTextInput({
        visible: true,
        x: clientX - rect.left,
        y: clientY - rect.top,
        normX,
        normY,
        value: ""
      });
      return;
    }

    setIsDrawing(true);
    startPosRef.current = { x: normX, y: normY };
    prevPositionRef.current = { x: normX, y: normY };
    currentActionIdRef.current = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    currentPointsRef.current = [{ x: normX, y: normY }];
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    const normX = (clientX - rect.left) / rect.width;
    const normY = (clientY - rect.top) / rect.height;

    const ctx = canvas.getContext("2d");
    const strokeColor = tool === "eraser" ? "#0b0f19" : color;

    if (tool === "pen" || tool === "eraser") {
      // Draw segment locally immediately for responsive feedback
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(prevPositionRef.current.x * canvas.width, prevPositionRef.current.y * canvas.height);
      ctx.lineTo(normX * canvas.width, normY * canvas.height);
      ctx.stroke();

      const strokeData = {
        x: normX,
        y: normY,
        prevX: prevPositionRef.current.x,
        prevY: prevPositionRef.current.y,
        color: strokeColor,
        width: lineWidth,
        isEraser: tool === "eraser",
        actionId: currentActionIdRef.current,
        type: "freehand"
      };

      // Emit segment
      if (socket) {
        socket.emit("draw-stroke", { roomId, strokeData });
      }

      currentPointsRef.current.push({ x: normX, y: normY });
      prevPositionRef.current = { x: normX, y: normY };
    } else {
      // For shapes, render a real-time drag preview on top of compiled canvas
      redrawCanvas(rawEvents);
      drawAction(ctx, canvas, {
        type: "shape",
        shape: tool,
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: normX,
        endY: normY,
        color: strokeColor,
        width: lineWidth
      });
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.changedTouches && e.changedTouches[0]) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    const normX = clientX ? (clientX - rect.left) / rect.width : prevPositionRef.current.x;
    const normY = clientY ? (clientY - rect.top) / rect.height : prevPositionRef.current.y;

    const strokeColor = tool === "eraser" ? "#0b0f19" : color;

    // For shapes, commit the finalized action path on mouse release
    if (tool !== "pen" && tool !== "eraser") {
      const shapeAction = {
        type: "shape",
        shape: tool,
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: normX,
        endY: normY,
        color: strokeColor,
        width: lineWidth,
        actionId: currentActionIdRef.current
      };

      const payload = { strokeData: shapeAction, sender: socket?.user };
      
      setRawEvents((prev) => {
        const next = [...prev, payload];
        redrawCanvas(next);
        return next;
      });

      if (socket) {
        socket.emit("draw-stroke", { roomId, strokeData: shapeAction });
      }
    } else {
      // Append completed freehand path locally for local sync state
      const freehandAction = {
        type: "freehand",
        points: currentPointsRef.current,
        color: strokeColor,
        width: lineWidth,
        isEraser: tool === "eraser",
        actionId: currentActionIdRef.current
      };
      
      const payload = { strokeData: freehandAction, sender: socket?.user };
      setRawEvents((prev) => [...prev, payload]);
    }
    setUndoStack([]); // Clear redo stack on new action
  };

  // Commit text inputs on Enter
  const handleTextSubmit = (e) => {
    if (e.key === "Enter" && textInput.value.trim()) {
      const textAction = {
        type: "text",
        text: textInput.value,
        x: textInput.normX,
        y: textInput.normY,
        color: color,
        size: 16 + lineWidth
      };

      const payload = { strokeData: textAction, sender: socket?.user };

      setRawEvents((prev) => {
        const next = [...prev, payload];
        redrawCanvas(next);
        return next;
      });

      if (socket) {
        socket.emit("draw-stroke", { roomId, strokeData: textAction });
      }

      setTextInput({ visible: false, x: 0, y: 0, normX: 0, normY: 0, value: "" });
      setUndoStack([]);
    } else if (e.key === "Escape") {
      setTextInput({ visible: false, x: 0, y: 0, normX: 0, normY: 0, value: "" });
    }
  };

  // Undo last local/remote action
  const handleUndo = () => {
    if (rawEvents.length === 0) return;
    
    // Save last action details locally to support Redo
    const lastEvent = rawEvents[rawEvents.length - 1];
    const lastActionId = lastEvent?.strokeData?.actionId;
    
    let undoneEvents;
    if (lastActionId) {
      undoneEvents = rawEvents.filter((item) => item.strokeData?.actionId === lastActionId);
    } else {
      undoneEvents = [lastEvent];
    }
    
    setUndoStack((prev) => [...prev, undoneEvents]);

    if (socket) {
      socket.emit("undo-whiteboard", { roomId });
    }
  };

  // Redo last undone action
  const handleRedo = () => {
    if (undoStack.length === 0) return;

    const nextUndone = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    nextUndone.forEach((event) => {
      const payload = { strokeData: event.strokeData, sender: socket?.user };
      setRawEvents((prev) => {
        const next = [...prev, payload];
        redrawCanvas(next);
        return next;
      });
      if (socket) {
        socket.emit("draw-stroke", { roomId, strokeData: event.strokeData });
      }
    });
  };

  // Clear canvas
  const handleClear = () => {
    if (rawEvents.length === 0) return;
    if (!window.confirm("Clear the entire whiteboard canvas?")) return;

    setRawEvents([]);
    setUndoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (socket) {
      socket.emit("clear-canvas", { roomId });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
      
      {/* Absolute Toolbar overlay */}
      <div className="absolute top-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between z-10 gap-3">
        {/* Colors Selection */}
        <div className="flex items-center space-x-2">
          {tool !== "eraser" && colors.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-150 cursor-pointer ${color === c.value ? "scale-125 border-white" : "border-transparent"}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active drawing tools selection */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => { setTool("pen"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "pen" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Pencil Tool"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => { setTool("line"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "line" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Draw Line"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => { setTool("rect"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "rect" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Draw Rectangle"
            >
              <Square size={16} />
            </button>
            <button
              onClick={() => { setTool("circle"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "circle" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Draw Circle"
            >
              <Circle size={16} />
            </button>
            <button
              onClick={() => { setTool("arrow"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "arrow" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Draw Arrow"
            >
              <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => { setTool("text"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "text" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Add Text"
            >
              <Type size={16} />
            </button>
            <button
              onClick={() => { setTool("eraser"); setTextInput({ visible: false }); }}
              className={`p-2 rounded-md transition-colors cursor-pointer ${tool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Eraser Tool"
            >
              <Eraser size={16} />
            </button>
          </div>

          {/* Width brush size slider */}
          <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-1.5 px-3 border border-slate-700">
            <span className="text-xs text-slate-400 font-medium">Size</span>
            <input
              type="range"
              min="2"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16 accent-indigo-500 h-1 bg-slate-750 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-mono w-4">{lineWidth}</span>
          </div>

          {/* Undo and Redo control buttons */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={handleUndo}
              disabled={rawEvents.length === 0}
              className="p-2 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Undo Last Action"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={undoStack.length === 0}
              className="p-2 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Redo Undone Action"
            >
              <Redo size={16} />
            </button>
          </div>

          {/* Clear board trigger */}
          <button
            onClick={handleClear}
            disabled={rawEvents.length === 0}
            className="p-2 px-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-35 disabled:cursor-not-allowed transition-all border border-red-500/20 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            title="Clear Entire Canvas"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Inline absolute text input overlay */}
      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput.value}
          onChange={(e) => setTextInput((prev) => ({ ...prev, value: e.target.value }))}
          onKeyDown={handleTextSubmit}
          onBlur={() => setTextInput({ visible: false, x: 0, y: 0, normX: 0, normY: 0, value: "" })}
          className="absolute bg-slate-900 border border-indigo-500 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 z-25"
          style={{
            left: `${textInput.x}px`,
            top: `${textInput.y}px`,
            color: color,
            font: `${16 + lineWidth}px sans-serif`
          }}
          placeholder="Type label & Enter"
        />
      )}

      {/* HTML5 Canvas wrapper to ensure accurate flex box sizing */}
      <div className="flex-1 w-full relative min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full bg-slate-950 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
}
