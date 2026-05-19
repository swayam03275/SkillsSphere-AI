import React, { useRef, useState, useEffect } from "react";
import { Trash2, Eraser, Edit2 } from "lucide-react";

export default function Whiteboard({ socket, roomId, userRole }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#38bdf8"); // Neon Blue default
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const prevPositionRef = useRef({ x: 0, y: 0 });

  const colors = [
    { name: "Sky Blue", value: "#38bdf8" },
    { name: "Neon Green", value: "#4ade80" },
    { name: "Neon Red", value: "#f87171" },
    { name: "Yellow", value: "#facc15" },
    { name: "Purple", value: "#c084fc" },
    { name: "White", value: "#ffffff" }
  ];

  // Set up Canvas dimensions and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Handle canvas resizing
    const resizeCanvas = () => {
      // Save canvas contents before resize
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(canvas, 0, 0);

      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight || 500;

      // Restore contents
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Socket listeners for drawing
    if (socket) {
      socket.on("draw-stroke", ({ strokeData }) => {
        drawRemoteStroke(strokeData);
      });

      socket.on("clear-canvas", () => {
        clearLocalCanvas();
      });
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (socket) {
        socket.off("draw-stroke");
        socket.off("clear-canvas");
      }
    };
  }, [socket]);

  // Draw stroke received from another participant
  const drawRemoteStroke = (strokeData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const { x, y, prevX, prevY, color, width } = strokeData;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(prevX * canvas.width, prevY * canvas.height);
    ctx.lineTo(x * canvas.width, y * canvas.height);
    ctx.stroke();
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Drawing event handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    prevPositionRef.current = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (!clientX || !clientY) return;

    const currentX = (clientX - rect.left) / rect.width;
    const currentY = (clientY - rect.top) / rect.height;

    const strokeColor = isEraser ? "#0f172a" : color; // Slate-900 for background matching

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(prevPositionRef.current.x * canvas.width, prevPositionRef.current.y * canvas.height);
    ctx.lineTo(currentX * canvas.width, currentY * canvas.height);
    ctx.stroke();

    const strokeData = {
      x: currentX,
      y: currentY,
      prevX: prevPositionRef.current.x,
      prevY: prevPositionRef.current.y,
      color: strokeColor,
      width: lineWidth
    };

    if (socket) {
      socket.emit("draw-stroke", { roomId, strokeData });
    }

    prevPositionRef.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    clearLocalCanvas();
    if (socket) {
      socket.emit("clear-canvas", { roomId });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 relative h-full">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between z-10 gap-3">
        {/* Colors Selection */}
        <div className="flex items-center space-x-2">
          {!isEraser && colors.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-150 ${color === c.value ? "scale-125 border-white" : "border-transparent"}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center space-x-4">
          {/* Pen or Eraser Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded-md transition-colors ${!isEraser ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Pen Tool"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded-md transition-colors ${isEraser ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Eraser Tool"
            >
              <Eraser size={16} />
            </button>
          </div>

          {/* Width slider */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Size</span>
            <input
              type="range"
              min="2"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-20 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-mono w-4">{lineWidth}</span>
          </div>

          {/* Clear board (Allowed for all but tutor is marked clearly) */}
          <button
            onClick={handleClear}
            className="p-2 px-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all border border-red-500/20 text-xs font-semibold flex items-center space-x-1"
            title="Clear Entire Canvas"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 bg-slate-950 cursor-crosshair h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}
