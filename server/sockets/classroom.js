import { verifySocketAuth }
  from "../middleware/socketAuth.js";

export default function classroomSocket(io) {

  const classroom =
    io.of("/classroom");

  // Apply auth middleware
  classroom.use(
    verifySocketAuth
  );

  classroom.on(
    "connection",
    async (socket) => {

      try {

        const roomId =
          socket.handshake.query.roomId;

        if (!roomId) {

          socket.emit(
            "auth_error",
            {
              message:
                "Room ID missing",
            }
          );

          return socket.disconnect(true);
        }

        // Optional:
        // verify classroom enrollment
        const isEnrolled =
          await checkUserEnrollment(
            socket.user.id,
            roomId
          );

        if (!isEnrolled) {

          socket.emit(
            "auth_error",
            {
              message:
                "Access denied",
            }
          );

          return socket.disconnect(true);
        }

        socket.join(roomId);

        socket.emit(
          "joined",
          {
            roomId,
            userId:
              socket.user.id,
          }
        );

        console.log(
          `User ${socket.user.id} joined ${roomId}`
        );

      } catch (error) {

        console.error(
          "Socket auth error:",
          error
        );

        socket.disconnect(true);
      }
    }
  );
}

// Example enrollment validation
async function checkUserEnrollment(
  userId,
  roomId
) {

  // Replace with DB lookup
  return true;
}
```
