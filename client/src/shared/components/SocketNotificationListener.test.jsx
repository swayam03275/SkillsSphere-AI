import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SocketNotificationListener from "./SocketNotificationListener";

const dispatch = vi.fn();
let authState;
let socket;

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => dispatch,
    useSelector: (selector) => selector({ auth: authState }),
  };
});

vi.mock("./toast/ToastProvider", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => socket),
}));

describe("SocketNotificationListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      token: "token-1",
      user: {
        _id: "user-1",
      },
    };
    socket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  it("registers one socket listener set and removes it on cleanup", () => {
    const { rerender, unmount } = render(<SocketNotificationListener />);

    rerender(<SocketNotificationListener />);

    expect(socket.on).toHaveBeenCalledTimes(5);
    expect(socket.on.mock.calls.map(([event]) => event)).toEqual([
      "connect",
      "application-status-updated",
      "new-notification",
      "disconnect",
      "connect_error",
    ]);

    unmount();

    expect(socket.off).toHaveBeenCalledTimes(5);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
