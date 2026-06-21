
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PreferencesSettings from "../PreferencesSettings";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../services/profileService";

vi.mock("../../services/profileService", () => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

const savedPreferences = {
  notifications: {
    emailNotifications: true,
    inAppNotifications: true,
    interviewReminders: true,
    jobUpdates: false,
    resumeAnalysis: true,
    systemAlerts: false,
  },
  emailFrequency: "weekly",
  privacy: {
    profileVisibility: "recruiters",
    showResumeToRecruiters: true,
    showInterviewHistory: false,
    allowPersonalizedRecommendations: true,
  },
};

const renderSettings = () => render(<PreferencesSettings token="test-token" />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PreferencesSettings", () => {
  it("renders the settings page and loads existing preferences", async () => {
    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });

    renderSettings();

    expect(screen.getByText(/loading preferences/i)).toBeInTheDocument();

    expect(await screen.findByText(/notification preferences/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/in-app notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/job updates/i)).not.toBeChecked();
    expect(screen.getByLabelText(/email frequency/i)).toHaveValue("weekly");
    expect(screen.getByLabelText(/profile visibility/i)).toHaveValue("recruiters");
    expect(getUserPreferences).toHaveBeenCalledWith("test-token");
  });

  it("updates fields and saves changed preferences", async () => {
    const user = userEvent.setup();
    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    // @ts-expect-error TODO: Fix pervasive types
    updateUserPreferences.mockResolvedValue({
      preferences: {
        ...savedPreferences,
        notifications: { ...savedPreferences.notifications, jobUpdates: true, inAppNotifications: false },
        emailFrequency: "daily",
      },
    });

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/job updates/i));
      await user.click(screen.getByLabelText(/in-app notifications/i));
      await user.selectOptions(screen.getByLabelText(/email frequency/i), "daily");
      await user.click(screen.getByRole("button", { name: /save settings/i }));
    });

    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledTimes(1);
    });

    expect(updateUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        emailFrequency: "daily",
        notifications: expect.objectContaining({ jobUpdates: true, inAppNotifications: false }),
      }),
      "test-token",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/preferences saved successfully/i);
  });

  it("resets unsaved changes", async () => {
    const user = userEvent.setup();
    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });

    renderSettings();

    const jobUpdates = await screen.findByLabelText(/job updates/i);
    await act(async () => {
      await user.click(jobUpdates);
    });
    expect(jobUpdates).toBeChecked();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /reset/i }));
    });
    expect(jobUpdates).not.toBeChecked();
  });

  it("shows an error message when loading fails", async () => {
    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockRejectedValue(new Error("Unable to load preferences"));

    renderSettings();

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load preferences/i);
  });

  it("shows an error message when save fails", async () => {
    const user = userEvent.setup();
    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    // @ts-expect-error TODO: Fix pervasive types
    updateUserPreferences.mockRejectedValue(new Error("Save failed"));

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/system alerts/i));
      await user.click(screen.getByRole("button", { name: /save settings/i }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/save failed/i);
  });

  it("disables the save button while saving", async () => {
    const user = userEvent.setup();
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    // @ts-expect-error TODO: Fix pervasive types
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    // @ts-expect-error TODO: Fix pervasive types
    updateUserPreferences.mockReturnValue(savePromise);

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/system alerts/i));
      await user.click(screen.getByRole("button", { name: /save settings/i }));
    });

    expect(screen.getByRole("button", { name: /save settings/i })).toBeDisabled();
    expect(screen.getByRole("form", { hidden: true })).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveSave({ preferences: savedPreferences });
      await savePromise;
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save settings/i })).toBeDisabled();
    });
  });
});
