import jwt from "jsonwebtoken";

export async function verifySocketAuth(
  socket,
  next
) {

  try {

    const token =
      socket.handshake.auth?.token;

    if (!token) {

      socket.emit("auth_error", {
        message:
          "Authentication token missing",
      });

      return next(
        new Error("Unauthorized")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.user = decoded;

    next();

  } catch (error) {

    socket.emit("auth_error", {
      message:
        "Invalid or expired token",
    });

    next(
      new Error("Unauthorized")
    );
  }
}
```
