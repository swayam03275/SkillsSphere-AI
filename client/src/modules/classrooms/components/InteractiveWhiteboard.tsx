import React, { useState, useEffect, useRef } from "react";
import { Excalidraw, exportToCanvas, exportToBlob } from "@excalidraw/excalidraw";
import { Download, Users } from "lucide-react";
import { useToast } from "../../../shared/components/toast/ToastProvider";
import logger from "../../../utils/logger";

export default function InteractiveWhiteboard({ socket, roomId, userRole, initialStrokes }) {
  const toast = useToast();
  
  // Track if we are currently updating from a remote socket event to prevent echo loops
  const isUpdatingFromRemoteRef = useRef(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);

  // Initialize with initial elements if provided
  const initialData = {
    elements: Array.isArray(initialStrokes) ? initialStrokes : [],
    appState: { viewBackgroundColor: "#0b0f19", theme: "dark" as const },
    scrollToContent: true,
  };

  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    const handleRemoteUpdate = ({ elements }) => {
      if (!Array.isArray(elements)) return;
      
      isUpdatingFromRemoteRef.current = true;
      excalidrawAPI.updateScene({ elements });
      
      // Reset the flag shortly after
      setTimeout(() => {
        isUpdatingFromRemoteRef.current = false;
      }, 50);
    };

    const handleRemotePointer = ({ pointer, senderId, senderName }) => {
      // Excalidraw has a built in API for rendering remote pointers via `updateScene({ collaborators })`
      const currentCollaborators = excalidrawAPI.getAppState().collaborators || new Map();
      const newCollaborators = new Map(currentCollaborators);
      
      newCollaborators.set(senderId, {
        pointer,
        username: senderName,
      });
      
      excalidrawAPI.updateScene({ collaborators: newCollaborators });
      setActiveUsers(newCollaborators.size + 1); // +1 for local user
      
      // Auto-remove pointer after inactivity
      setTimeout(() => {
        const latestCollabs = new Map(excalidrawAPI.getAppState().collaborators || new Map());
        if (latestCollabs.has(senderId)) {
          latestCollabs.delete(senderId);
          excalidrawAPI.updateScene({ collaborators: latestCollabs });
          setActiveUsers(latestCollabs.size + 1);
        }
      }, 3000);
    };

    socket.on("excalidraw-update", handleRemoteUpdate);
    socket.on("excalidraw-pointer", handleRemotePointer);

    return () => {
      socket.off("excalidraw-update", handleRemoteUpdate);
      socket.off("excalidraw-pointer", handleRemotePointer);
    };
  }, [socket, excalidrawAPI]);

  // Triggered when local user draws or modifies elements
  const onChange = (elements, appState) => {
    if (!socket || isUpdatingFromRemoteRef.current) return;
    
    // Broadcast the full elements array so everyone stays exactly in sync
    socket.emit("excalidraw-update", {
      roomId,
      elements,
    });
  };

  // Triggered when local user moves their mouse
  const onPointerUpdate = (payload) => {
    if (!socket) return;
    socket.emit("excalidraw-pointer", {
      roomId,
      pointer: {
        x: payload.pointer.x,
        y: payload.pointer.y,
      }
    });
  };

  const handleExport = async () => {
    if (!excalidrawAPI) return;
    try {
      const elements = excalidrawAPI.getSceneElements();
      if (!elements || !elements.length) {
        toast.warning("Whiteboard is empty. Draw something before exporting.");
        return;
      }
      
      const blob = await exportToBlob({
        elements,
        mimeType: "image/png",
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skillssphere-whiteboard-${Date.now()}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Whiteboard exported successfully!");
    } catch (err) {
      logger.error("Export failed", err);
      toast.error("Failed to export whiteboard image. Please try again.");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
      {/* Header Panel */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <h2 className="text-sm font-semibold text-slate-200">Interactive Whiteboard</h2>
          {activeUsers > 1 && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Users size={12} />
              <span>{activeUsers} Active</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
          >
            <Download size={14} />
            <span>Export Image</span>
          </button>
        </div>
      </div>
      
      {/* Excalidraw Container */}
      <div className="flex-1 w-full relative">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={onChange}
          onPointerUpdate={onPointerUpdate}
          theme="dark"
          viewModeEnabled={false} // Tutors/Students both can draw
          zenModeEnabled={false}
          gridModeEnabled={false}
          UIOptions={{
            canvasActions: {
              export: false, // Using custom export button
              saveAsImage: false,
              loadScene: false,
              clearCanvas: userRole === "admin" || userRole === "tutor", // Only allow tutors to clear completely
              toggleTheme: false,
            }
          }}
        />
      </div>
    </div>
  );
}
