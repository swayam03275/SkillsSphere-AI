/**
 * Initialize notification-related socket events.
 * By the time these handlers run, every socket has already been authenticated
 * by the io.use() middleware in index.js and has socket.user attached.
 * @param {Object} io - Socket.io instance
 */
export function initNotificationSockets(io) {
  io.on("connection", (socket) => {
    /**
     * Join the notification room for the authenticated user.
     * The room name is derived from socket.user._id (set by io.use()),
     * not from any client-supplied payload — so no user can join another
     * user's room by passing an arbitrary ID.
     */
    socket.on("join-notifications", () => {
      // socket.user is guaranteed by io.use() — no client payload needed
      const roomName = `user_${socket.user._id}`;
      socket.join(roomName);
      socket.emit("notification-ready", { room: roomName });
    });

    socket.on("disconnect", () => {
      // Socket.io automatically removes the socket from all rooms on disconnect
    });
  });
}
