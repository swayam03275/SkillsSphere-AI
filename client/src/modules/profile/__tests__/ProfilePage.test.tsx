// @ts-nocheck

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "../ProfilePage";
import { updateUserProfile } from "../../../features/auth/authSlice";
import * as profileService from "../services/profileService";
import * as fileService from "../../../services/fileService";

vi.mock("../services/profileService", () => ({
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  getUserPreferences: vi.fn(async () => ({})),
  updateUserPreferences: vi.fn(async () => ({})),
}));

vi.mock("../../../services/fileService", () => ({
  getSignedFileUrl: vi.fn(),
}));

const baseUser = {
  id: "user-1",
  name: "Aarav Sharma",
  email: "aarav@example.com",
  role: "student",
  provider: "email",
  isVerified: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
  profilePic: null,
};

const createStore = (user = baseUser) =>
  configureStore({
    reducer: {
      auth: (state = { user, token: "test-token", isAuthenticated: true }, action) => {
        if (action.type === updateUserProfile.type) {
          return { ...state, user: action.payload };
        }
        if (action.type === "auth/logout") {
          return { ...state, user: null, token: null, isAuthenticated: false };
        }
        return state;
      },
      notifications: (state = { unreadCount: 0 }) => state,
    },
  });

import { ToastProvider } from "../../../shared/components/toast/ToastProvider";
import { ThemeProvider } from "../../../shared/contexts/ThemeContext";

const renderProfile = (user = baseUser) =>
  render(
    <Provider store={createStore(user)}>
      <MemoryRouter>
        <ThemeProvider>
          <ToastProvider>
            <ProfilePage />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );

const imageFile = (name = "avatar.png", type = "image/png", size = 1024) =>
  new File(["a".repeat(size)], name, { type });

describe("ProfilePage avatar upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let blobId = 0;
    URL.createObjectURL = vi.fn(() => `blob:avatar-${++blobId}`);
    URL.revokeObjectURL = vi.fn();
    fileService.getSignedFileUrl.mockResolvedValue("https://cdn.example.com/avatar.png");
    profileService.uploadAvatar.mockResolvedValue({
      success: true,
      user: {
        ...baseUser,
        profilePic: "https://res.cloudinary.com/demo/image/upload/v1/avatar.png",
        profilePicPublicId: "skillssphere/avatars/avatar",
      },
    });
    profileService.removeAvatar.mockResolvedValue({
      success: true,
      user: { ...baseUser, profilePic: null, profilePicPublicId: null },
    });
  });

  it("renders a default avatar when no image exists", () => {
    renderProfile();

    expect(screen.getByLabelText(/aarav sharma default avatar/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/profile avatar/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/upload profile image/i)).toBeInTheDocument();
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
  });

  it("shows an uploaded image preview immediately", async () => {
    const user = userEvent.setup();
    let resolveUpload;
    profileService.uploadAvatar.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderProfile();

    await act(async () => {
      await user.upload(screen.getByLabelText(/upload profile image/i), imageFile());
    });

    expect(await screen.findByAltText(/aarav sharma profile avatar/i)).toHaveAttribute(
      "src",
      "blob:avatar-1",
    );
    expect(profileService.uploadAvatar).toHaveBeenCalledWith(
      expect.objectContaining({ name: "avatar.png", type: "image/png" }),
      "test-token",
    );

    await act(async () => {
      resolveUpload({
        success: true,
        user: { ...baseUser, profilePic: "https://res.cloudinary.com/demo/image/upload/v1/avatar.png" },
      });
    });
  });

  it("rejects unsupported file types", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderProfile();

    await act(async () => {
      await user.upload(
        screen.getByLabelText(/upload profile image/i),
        new File(["bad"], "avatar.gif", { type: "image/gif" }),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please upload a PNG, JPG, JPEG, or WEBP image.",
    );
    expect(profileService.uploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects files larger than 5MB", async () => {
    const user = userEvent.setup();
    renderProfile();

    await act(async () => {
      await user.upload(
        screen.getByLabelText(/upload profile image/i),
        imageFile("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Profile image must be 5MB or smaller.");
    expect(profileService.uploadAvatar).not.toHaveBeenCalled();
  });

  it("handles upload loading state and disables controls", async () => {
    const user = userEvent.setup();
    let resolveUpload;
    profileService.uploadAvatar.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    renderProfile();

    await act(async () => {
      await user.upload(screen.getByLabelText(/upload profile image/i), imageFile());
    });

    expect(screen.getByLabelText(/upload profile image/i)).toBeDisabled();
    expect(screen.getAllByText(/uploading/i).length).toBeGreaterThan(0);

    await act(async () => {
      resolveUpload({
        success: true,
        user: { ...baseUser, profilePic: "https://res.cloudinary.com/demo/image/upload/v1/avatar.png" },
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/upload profile image/i)).not.toBeDisabled();
    });
  });

  it("updates the avatar image URL after a successful upload", async () => {
    const user = userEvent.setup();
    renderProfile();

    await act(async () => {
      await user.upload(screen.getByLabelText(/upload profile image/i), imageFile());
    });

    expect(await screen.findByAltText(/aarav sharma profile avatar/i)).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/image/upload/v1/avatar.png",
    );
  });

  it("shows a friendly alert when upload fails", async () => {
    const user = userEvent.setup();
    profileService.uploadAvatar.mockRejectedValue(new Error("Unable to upload avatar right now."));
    renderProfile();

    await act(async () => {
      await user.upload(screen.getByLabelText(/upload profile image/i), imageFile());
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to upload avatar right now.");
  });

  it("loads an existing avatar and replaces it with a new preview", async () => {
    const user = userEvent.setup();
    let resolveUpload;
    profileService.uploadAvatar.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderProfile({ ...baseUser, profilePic: "avatars/existing.png" });

    expect(await screen.findByAltText(/aarav sharma profile avatar/i)).toHaveAttribute(
      "src",
      "https://cdn.example.com/avatar.png",
    );

    await act(async () => {
      await user.upload(screen.getByLabelText(/upload profile image/i), imageFile("new.webp", "image/webp"));
    });

    expect(screen.getByAltText(/aarav sharma profile avatar/i)).toHaveAttribute(
      "src",
      "blob:avatar-1",
    );

    await waitFor(() => {
      expect(profileService.uploadAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ name: "new.webp", type: "image/webp" }),
        "test-token",
      );
    });

    await act(async () => {
      resolveUpload({
        success: true,
        user: { ...baseUser, profilePic: "https://res.cloudinary.com/demo/image/upload/v1/avatar.png" },
      });
    });
  });

  it("removes an avatar and returns to the default initials fallback", async () => {
    const user = userEvent.setup();
    renderProfile({
      ...baseUser,
      profilePic: "https://res.cloudinary.com/demo/image/upload/v1/existing.png",
      profilePicPublicId: "skillssphere/avatars/existing",
    });

    expect(screen.getByAltText(/aarav sharma profile avatar/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /remove profile photo/i }));
    });

    expect(profileService.removeAvatar).toHaveBeenCalledWith("test-token");
    expect(await screen.findByLabelText(/aarav sharma default avatar/i)).toBeInTheDocument();
  });
});
