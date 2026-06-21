
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, RotateCcw, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Button from "../../../shared/components/Button";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../services/profileService";

const DEFAULT_PREFERENCES = {
  notifications: {
    emailNotifications: true,
    inAppNotifications: true,
    interviewReminders: true,
    jobUpdates: true,
    resumeAnalysis: true,
    systemAlerts: true,
  },
  emailFrequency: "weekly",
  privacy: {
    profileVisibility: "recruiters",
    showResumeToRecruiters: true,
    showInterviewHistory: false,
    allowPersonalizedRecommendations: true,
  },
};

const NOTIFICATION_OPTIONS = [
  ["jobUpdates", "Job updates"],
  ["interviewReminders", "Interview reminders"],
  ["resumeAnalysis", "Resume analysis"],
  ["systemAlerts", "System alerts"],
];

const NOTIFICATION_CHANNELS = [
  ["emailNotifications", "Email notifications"],
  ["inAppNotifications", "In-app notifications"],
];

const PRIVACY_TOGGLES = [
  ["showResumeToRecruiters", "Show resume to recruiters"],
  ["showInterviewHistory", "Show interview history"],
  ["allowPersonalizedRecommendations", "Allow personalized recommendations"],
];

const EMAIL_FREQUENCIES = [
  ["instant", "Instant"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["never", "Never"],
];

const PROFILE_VISIBILITIES = [
  ["public", "Public"],
  ["recruiters", "Recruiters only"],
  ["private", "Private"],
];

const mergeNotificationDefaults = (notifications = {}) => ({
  // @ts-expect-error TODO: Fix pervasive types
  emailNotifications: notifications.emailNotifications ?? DEFAULT_PREFERENCES.notifications.emailNotifications,
  // @ts-expect-error TODO: Fix pervasive types
  inAppNotifications: notifications.inAppNotifications ?? DEFAULT_PREFERENCES.notifications.inAppNotifications,
  // @ts-expect-error TODO: Fix pervasive types
  interviewReminders: notifications.interviewReminders ?? DEFAULT_PREFERENCES.notifications.interviewReminders,
  // @ts-expect-error TODO: Fix pervasive types
  jobUpdates: notifications.jobUpdates ?? notifications.jobAlerts ?? DEFAULT_PREFERENCES.notifications.jobUpdates,
  // @ts-expect-error TODO: Fix pervasive types
  resumeAnalysis: notifications.resumeAnalysis ?? DEFAULT_PREFERENCES.notifications.resumeAnalysis,
  // @ts-expect-error TODO: Fix pervasive types
  systemAlerts: notifications.systemAlerts ?? notifications.platformUpdates ?? DEFAULT_PREFERENCES.notifications.systemAlerts,
});

const mergeWithDefaults = (preferences = {}) => ({
  // @ts-expect-error TODO: Fix pervasive types
  notifications: mergeNotificationDefaults(preferences.notifications),
  // @ts-expect-error TODO: Fix pervasive types
  emailFrequency: preferences.emailFrequency || DEFAULT_PREFERENCES.emailFrequency,
  privacy: {
    ...DEFAULT_PREFERENCES.privacy,
    // @ts-expect-error TODO: Fix pervasive types
    ...(preferences.privacy || {}),
  },
});

const ToggleRow = ({ checked, disabled, id, label, onChange }) => (
  <label
    htmlFor={id}
    className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
  >
    <span className="font-medium">{label}</span>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const SettingsGroup = ({ children, icon, title }) => (
  <section className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/30 p-4">
    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
      {icon}
      {title}
    </h4>
    {children}
  </section>
);

const PreferencesSettings = ({ token }) => {
  const [preferences, setPreferences] = useState(() => mergeWithDefaults());
  const [savedPreferences, setSavedPreferences] = useState(() => mergeWithDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isDirty = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const response = await getUserPreferences(token);
        const nextPreferences = mergeWithDefaults(response.preferences);
        if (!isMounted) return;
        setPreferences(nextPreferences);
        setSavedPreferences(nextPreferences);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Could not load your settings. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const updateNotification = useCallback((key, value) => {
    setPreferences((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));
    setMessage("");
    setError("");
  }, []);

  const updatePrivacy = useCallback((key, value) => {
    setPreferences((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        [key]: value,
      },
    }));
    setMessage("");
    setError("");
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updateUserPreferences(preferences, token);
      const nextPreferences = mergeWithDefaults(response.preferences);
      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setMessage("Preferences saved successfully.");
    } catch (err: any) {
      setError(err.message || "Could not save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(savedPreferences);
    setError("");
    setMessage("");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="animate-pulse space-y-4" aria-live="polite">
          <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <form
      role="form"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
            Preferences
          </h3>
        </div>
        <div className="flex gap-2">
          {/* @ts-expect-error TODO: Fix pervasive types */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || saving}
            leftIcon={<RotateCcw size={13} />}
          >
            Reset
          </Button>
          {/* @ts-expect-error TODO: Fix pervasive types */}
          <Button
            type="submit"
            size="sm"
            loading={saving}
            disabled={!isDirty}
            leftIcon={<Save size={13} />}
          >
            Save Settings
          </Button>
        </div>
      </div>

      {message && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check size={15} />
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <SettingsGroup title="Notification Preferences" icon={<Bell size={16} className="text-indigo-500" />}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {NOTIFICATION_CHANNELS.map(([key, label]) => (
              <ToggleRow
                key={key}
                id={`pref-${key}`}
                label={label}
                checked={preferences.notifications[key]}
                disabled={saving}
                onChange={(event) => updateNotification(key, event.target.checked)}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {NOTIFICATION_OPTIONS.map(([key, label]) => (
              <ToggleRow
                key={key}
                id={`pref-${key}`}
                label={label}
                checked={preferences.notifications[key]}
                disabled={saving}
                onChange={(event) => updateNotification(key, event.target.checked)}
              />
            ))}
          </div>
        </SettingsGroup>

        <SettingsGroup title="Email Frequency" icon={<SlidersHorizontal size={16} className="text-emerald-500" />}>
          <label htmlFor="emailFrequency" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email frequency
          </label>
          <select
            id="emailFrequency"
            value={preferences.emailFrequency}
            disabled={saving}
            onChange={(event) => {
              setPreferences((current) => ({ ...current, emailFrequency: event.target.value }));
              setMessage("");
              setError("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {EMAIL_FREQUENCIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </SettingsGroup>

        <SettingsGroup title="Privacy Settings" icon={<ShieldCheck size={16} className="text-violet-500" />}>
          <label htmlFor="profileVisibility" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Profile visibility
          </label>
          <select
            id="profileVisibility"
            value={preferences.privacy.profileVisibility}
            disabled={saving}
            onChange={(event) => updatePrivacy("profileVisibility", event.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {PROFILE_VISIBILITIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIVACY_TOGGLES.map(([key, label]) => (
              <ToggleRow
                key={key}
                id={`pref-${key}`}
                label={label}
                checked={preferences.privacy[key]}
                disabled={saving}
                onChange={(event) => updatePrivacy(key, event.target.checked)}
              />
            ))}
          </div>
        </SettingsGroup>
      </div>
    </form>
  );
};

export default PreferencesSettings;
