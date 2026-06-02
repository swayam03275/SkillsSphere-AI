import { getOrCreateRoomState } from "../socket.js";
import { executeCode } from "../../../utils/codeExecutor.js";

export default function registerCodeEditorHandler(io, socket) {
  // Code change event
  socket.on("code-change", ({ roomId, code }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }
    const state = getOrCreateRoomState(roomId);
    state.code = code;
    socket.to(roomId).emit("code-change", { code });
  });

  // Code cursor event
  socket.on("code-cursor", ({ roomId, cursorPosition }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }
    socket.to(roomId).emit("code-cursor", {
      cursorPosition,
      senderId: socket.id,
      senderName: socket.data.user?.name || "Participant",
    });
  });

  // Execute code event
  socket.on("execute-code-request", async ({ roomId, code, language }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    // Broadcast that execution has started
    io.to(roomId).emit("execution-started", {
      senderName: socket.data.user?.name || "Participant",
    });

    // Execute code via API
    const result = await executeCode(language, code);

    // Broadcast result
    io.to(roomId).emit("execution-result", {
      output: result.output,
      isError: result.isError,
      senderName: socket.data.user?.name || "Participant",
    });
  });
}
