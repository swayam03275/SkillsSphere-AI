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
    interviewReminders: true,
    jobAlerts: false,
    applicationStatusUpdates: true,
    platformUpdates: false,
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
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });

    renderSettings();

    expect(screen.getByText(/loading preferences/i)).toBeInTheDocument();

    expect(await screen.findByText(/notification preferences/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job alerts/i)).not.toBeChecked();
    expect(screen.getByLabelText(/email frequency/i)).toHaveValue("weekly");
    expect(screen.getByLabelText(/profile visibility/i)).toHaveValue("recruiters");
    expect(getUserPreferences).toHaveBeenCalledWith("test-token");
  });

  it("updates fields and saves changed preferences", async () => {
    const user = userEvent.setup();
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    updateUserPreferences.mockResolvedValue({
      preferences: {
        ...savedPreferences,
        notifications: { ...savedPreferences.notifications, jobAlerts: true },
        emailFrequency: "daily",
      },
    });

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/job alerts/i));
      await user.selectOptions(screen.getByLabelText(/email frequency/i), "daily");
      await user.click(screen.getByRole("button", { name: /save settings/i }));
    });

    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledTimes(1);
    });

    expect(updateUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        emailFrequency: "daily",
        notifications: expect.objectContaining({ jobAlerts: true }),
      }),
      "test-token",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/preferences saved successfully/i);
  });

  it("resets unsaved changes", async () => {
    const user = userEvent.setup();
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });

    renderSettings();

    const jobAlerts = await screen.findByLabelText(/job alerts/i);
    await act(async () => {
      await user.click(jobAlerts);
    });
    expect(jobAlerts).toBeChecked();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /reset/i }));
    });
    expect(jobAlerts).not.toBeChecked();
  });

  it("shows an error message when loading fails", async () => {
    getUserPreferences.mockRejectedValue(new Error("Unable to load preferences"));

    renderSettings();

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load preferences/i);
  });

  it("shows an error message when save fails", async () => {
    const user = userEvent.setup();
    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    updateUserPreferences.mockRejectedValue(new Error("Save failed"));

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/platform updates\/news/i));
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

    getUserPreferences.mockResolvedValue({ preferences: savedPreferences });
    updateUserPreferences.mockReturnValue(savePromise);

    renderSettings();

    await screen.findByText(/notification preferences/i);
    await act(async () => {
      await user.click(screen.getByLabelText(/platform updates\/news/i));
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
