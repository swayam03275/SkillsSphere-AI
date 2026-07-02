
import React, { useState, useRef, useEffect } from "react";
import Navbar from "../../shared/components/Navbar";
import Footer from "../../shared/components/Footer";
import { Link } from "react-router-dom";
import ErrorBoundary from "../../shared/components/ErrorBoundary";
import ProfileSkeleton from "./components/ProfileSkeleton";
import {
  User, Mail, Shield, Calendar, Clock, Pencil, X, Check,
  ChevronLeft, BadgeCheck, AlertCircle, Trash2, LogOut,
  Info, Lock, Sparkles, Activity, Camera, Upload, MapPin,
  Briefcase, Globe, ExternalLink, Settings, Link2, FileText
} from "lucide-react";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateUserProfile, logout, persistUser } from "../../features/auth/authSlice";
import {
  updateProfile,
  deleteProfile,
  uploadAvatar,
  removeAvatar,
  updateUserPassword,
} from "./services/profileService";
import LoadingState from "../../shared/components/LoadingState";
import { getSignedFileUrl } from "../../services/fileService";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import PreferencesSettings from "./components/PreferencesSettings";
import { useToast } from "../../shared/components/toast/ToastProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  student: "Student",
  tutor: "Tutor",
  recruiter: "Recruiter",
};

const ROLE_CONFIG = {
  student:   { label: "Student",   avatar: "from-indigo-500 to-blue-600",   glow: "rgba(99,102,241,0.4)",   icon: "🎓", banner: "from-indigo-400 via-blue-500 to-purple-600" },
  tutor:     { label: "Tutor",     avatar: "from-emerald-500 to-teal-600",  glow: "rgba(16,185,129,0.4)",   icon: "🧑‍🏫", banner: "from-emerald-400 via-teal-500 to-cyan-600" },
  recruiter: { label: "Recruiter", avatar: "from-violet-500 to-purple-600", glow: "rgba(139,92,246,0.4)",   icon: "💼", banner: "from-violet-400 via-purple-500 to-pink-600" },
};

const TABS = [
  { id: "info", label: "Profile Info", icon: <User size={15} /> },
  { id: "settings", label: "Settings", icon: <Settings size={15} /> },
  { id: "account", label: "Account", icon: <Info size={15} /> },
  { id: "security", label: "Security", icon: <Lock size={15} /> },
];

const AVATAR_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeAgo(iso) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DeleteModal = ({ onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 mx-auto mb-4">
        <Trash2 size={22} className="text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white mb-2">
        Delete Account
      </h3>
      <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
        This will permanently delete your account and all associated data. This
        action <strong>cannot be undone</strong>.
      </p>
      <div className="flex gap-3">
        {/* @ts-expect-error TODO: Fix pervasive types */}
        <Button variant="outline" fullWidth onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        {/* @ts-expect-error TODO: Fix pervasive types */}
        <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
          Yes, Delete
        </Button>
      </div>
    </div>
  </div>
);

const AvatarEditor = ({ user, roleConfig, onUpload, onRemove, uploading, avatarSrc }) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!AVATAR_FILE_TYPES.includes(file.type)) {
      setValidationError("Please upload a PNG, JPG, JPEG, or WEBP image.");
      setPreview(null);
      return;
    }

    if (file.size > AVATAR_MAX_SIZE) {
      setValidationError("Profile image must be 5MB or smaller.");
      setPreview(null);
      return;
    }

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const nextPreview = URL.createObjectURL(file);
    setPreview(nextPreview);
    setValidationError("");
    setJustSaved(false);

    const uploaded = await onUpload(file);
    setPreview(null);
    if (uploaded) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }
  };

  const displayPic = preview || avatarSrc;
  const initials = getInitials(user.name || "");
  const inputId = "profile-avatar-upload";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative group">
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${roleConfig.avatar} flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden select-none shadow-[0_4px_24px_var(--tw-glow)]`} style={{ '--tw-glow': roleConfig.glow }}>
          {displayPic ? (
            <img src={displayPic} alt={`${user.name || "User"} profile avatar`} className="w-full h-full object-cover" />
          ) : (
            <span aria-label={`${user.name || "User"} default avatar`}>{initials || "U"}</span>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center gap-2 text-white" aria-live="polite">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-[11px] font-semibold">Uploading...</span>
          </div>
        )}
        {!uploading && !justSaved && (
          <label
            htmlFor={inputId}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Camera size={18} className="text-white" />
            <span className="text-white text-[10px] font-semibold">{displayPic ? "Change" : "Upload"}</span>
          </label>
        )}
        {displayPic && !uploading && !justSaved && onRemove && (
          <button
            type="button"
            aria-label="Remove profile photo"
            onClick={onRemove}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Upload profile image"
          disabled={uploading}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
        />
        <label
          htmlFor={inputId}
          aria-disabled={uploading}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900 ${
            uploading
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
              : "cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          }`}
        >
          <Upload size={12} aria-hidden="true" />
          {displayPic ? "Change photo" : "Upload photo"}
        </label>
      </div>

      {!uploading && justSaved && (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <BadgeCheck size={13} /> Saved!
        </span>
      )}
      {validationError && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center" role="alert">
          {validationError}
        </p>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfilePage = () => {
  useDocumentTitle("Profile");
  const { user, token } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    company: user?.company || "",
    companyWebsite: user?.companyWebsite || "",
    linkedinUrl: user?.linkedinUrl || "",
    credentialUrl: user?.credentialUrl || "",
  });
  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordApiError, setPasswordApiError] = useState("");

  const roleConfig = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.student;

  useEffect(() => {
    let isMounted = true;

    if (!user?.profilePic) {
      setAvatarSrc(null);
      return () => { isMounted = false; };
    }

    if (/^(blob:|data:|https?:\/\/)/.test(user.profilePic)) {
      setAvatarSrc(user.profilePic);
      return () => { isMounted = false; };
    }

    getSignedFileUrl(user.profilePic, token).then((url) => {
      if (isMounted) setAvatarSrc(url);
    }).catch(() => {
      if (isMounted) setAvatarSrc(null);
    });

    return () => { isMounted = false; };
  }, [user?.profilePic, token]);

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const response = await uploadAvatar(file, token);
      persistUser(response.user);
      dispatch(updateUserProfile(response.user));
      setAvatarSrc(response.user?.profilePic ?? null);
      return true;
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload photo");
      return false;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const response = await removeAvatar(token);
      persistUser(response.user);
      dispatch(updateUserProfile(response.user));
      setAvatarSrc(null);
    } catch (err: any) {
      setAvatarError(err.message || "Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleEditClick = () => {
    setFormData({
      name: user?.name || "",
      company: user?.company || "",
      companyWebsite: user?.companyWebsite || "",
      linkedinUrl: user?.linkedinUrl || "",
      credentialUrl: user?.credentialUrl || "",
    });
    setErrors({});
    setSaveSuccess(false);
    setApiError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      company: user?.company || "",
      companyWebsite: user?.companyWebsite || "",
      linkedinUrl: user?.linkedinUrl || "",
      credentialUrl: user?.credentialUrl || "",
    });
    setErrors({});
    setApiError("");
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const key = e.target.name || e.target.id;
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const trimmed = formData.name.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrors({ name: "Name must be at least 2 characters" });
      return;
    }
    setIsSaving(true);
    try {
      setApiError("");
      const payload = { name: trimmed };
      if (user.role === "recruiter" || user.role === "tutor") {
        // Always include these fields so the backend receives them.
        // Trimmed empty string means user left the field blank — the backend
        // can then decide whether to accept that or keep the old value.
        // @ts-expect-error TODO: Fix pervasive types
        payload.linkedinUrl  = formData.linkedinUrl.trim();
        // @ts-expect-error TODO: Fix pervasive types
        payload.credentialUrl = formData.credentialUrl.trim();
      }
      if (user.role === "recruiter") {
        // @ts-expect-error TODO: Fix pervasive types
        payload.company        = formData.company.trim();
        // @ts-expect-error TODO: Fix pervasive types
        payload.companyWebsite = formData.companyWebsite.trim();
      }
      const response = await updateProfile(payload, token);
      persistUser(response.user);
      dispatch(updateUserProfile(response.user));
      setSaveSuccess(true);
      setIsEditing(false);
      setErrors({});
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setApiError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteProfile(token);
      dispatch(logout());
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [id]: value }));
    if (passwordErrors[id]) {
      setPasswordErrors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordApiError("");
    setPasswordSuccess(false);
    
    const newErrors: Record<string, string> = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9\s]/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one special character";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setPasswordSaving(true);
    try {
      await updateUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, token);

      setPasswordSuccess(true);
      toast.success("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setPasswordApiError(err.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        {/* @ts-expect-error TODO: Fix pervasive types */}
        <LoadingState message="Loading profile..." />
      </div>
    );
  }

  const isVerified = user.isVerified ?? user.isEmailVerified;
  const accountStatus =
    (user.role === "recruiter" || user.role === "tutor")
      ? user.accessLevel
      : (isVerified ? "active" : "pending");
  const daysSinceJoined = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) : 0;

  const verificationBadge = isVerified ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
      <BadgeCheck size={11} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
      <AlertCircle size={11} /> Not Verified
    </span>
  );

  return (
    <div className="min-h-screen transition-colors duration-300 relative bg-gradient-to-br from-[#f0eeff] via-[#f7f9fc] to-[#edfdf5] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-24">
      <Navbar />
      <div className="relative z-[2]">
        
        {/* ── Cover Banner ── */}
        <div className="relative w-full h-44 sm:h-36 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${roleConfig.banner} opacity-90`} />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/4 w-24 h-24 rounded-full bg-white/5" />

          {/* Animated Glassy Bubbles inside banner */}
          <div className="absolute w-20 h-20 rounded-full top-[10%] left-[8%] bg-gradient-to-br from-white/25 to-white/10 border-[1.5px] border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_16px_rgba(0,0,0,0.1)] backdrop-blur-sm" />
          <div className="absolute w-12 h-12 rounded-full bottom-[15%] left-[30%] bg-gradient-to-br from-white/20 to-white/5 border-[1.5px] border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[6px]" />
          <div className="absolute w-16 h-16 rounded-full top-[15%] right-[25%] bg-gradient-to-br from-white/20 to-white/10 border-[1.5px] border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_14px_rgba(0,0,0,0.09)] backdrop-blur-[7px]" />
        </div>

        {/* ── Main Layout Grid ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 -mt-10">
          
          {/* Left Sidebar — Single Consolidated Card */}
          <aside>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
              {/* Avatar + Identity */}
              <div className="p-5 flex flex-col items-center">
                <AvatarEditor
                  user={user}
                  roleConfig={roleConfig}
                  onUpload={handleAvatarUpload}
                  onRemove={handleAvatarRemove}
                  uploading={avatarUploading}
                  // @ts-expect-error TODO: Fix pervasive types
                  isEditing={isEditing}
                  avatarSrc={avatarSrc}
                />
                {avatarError && <p className="mt-2 text-xs text-red-500 dark:text-red-400" role="alert">{avatarError}</p>}
                
                <div className="text-center mt-3 w-full">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{user.name}</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="mt-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30">
                      {roleConfig.icon} {roleConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-white/5" />

              {/* Contact Info */}
              <div className="px-5 py-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 bg-gradient-to-br from-[#7C3AED] to-[#059669] bg-clip-text text-transparent">
                  Contact Info
                </h3>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Shield size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{user.provider === "google" ? "Google OAuth" : "Email & Password"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                    <span>Joined {timeAgo(user.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-white/5" />

              {/* Activity Metrics */}
              <div className="px-5 py-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 bg-gradient-to-br from-[#7C3AED] to-[#059669] bg-clip-text text-transparent">
                  Activity
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 text-center border border-slate-100 dark:border-white/5">
                    <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{daysSinceJoined}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Days Active</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 text-center border border-slate-100 dark:border-white/5">
                    <div className={`text-sm font-bold ${
                      accountStatus === "pending"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {accountStatus === "pending" ? "Pending" : "Active"}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Status</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <ErrorBoundary>
          <div className="flex flex-col gap-5 min-w-0">

            {/* Pending Access Banner */}
            {user.accessLevel === "pending" && (user.role === "recruiter" || user.role === "tutor") && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-sm">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Profile Verification Pending</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Please add your LinkedIn profile and a supporting document (e.g. offer letter, degree certificate) to unlock full access to {user.role === "recruiter" ? "talent search and candidate matching" : "classroom creation"}.
                  </p>
                </div>
              </div>
            )}
            
            {/* Edit Profile Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" /> My Profile
              </h2>

              {/* Desktop Mode Action Buttons */}
              <div className="hidden sm:block">
                {!isEditing ? (
                  // @ts-expect-error TODO: Fix pervasive types
                  <Button variant="outline" size="sm" onClick={handleEditClick} leftIcon={<Pencil size={13} />}>Edit Profile</Button>
                ) : (
                  <div className="flex gap-2">
                    {/* @ts-expect-error TODO: Fix pervasive types */}
                    <Button size="sm" onClick={handleSave} loading={isSaving} leftIcon={<Check size={13} />} className="bg-gradient-to-r from-violet-500 to-indigo-500 border-none text-white hover:opacity-90">Save</Button>
                    {/* @ts-expect-error TODO: Fix pervasive types */}
                    <Button variant="ghost" size="sm" onClick={handleCancel} leftIcon={<X size={13} />}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Mode Action Triggers */}
            {isEditing && (
              <div className="flex sm:hidden gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm justify-end">
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Button size="sm" onClick={handleSave} loading={isSaving} leftIcon={<Check size={13} />} className="bg-gradient-to-r from-violet-500 to-indigo-500 border-none text-white hover:opacity-90">Save</Button>
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Button variant="ghost" size="sm" onClick={handleCancel} leftIcon={<X size={13} />}>Cancel</Button>
              </div>
            )}
            {!isEditing && (
              <div className="flex sm:hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm justify-end">
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Button variant="outline" size="sm" fullWidth onClick={handleEditClick} leftIcon={<Pencil size={13} />}>Edit Profile</Button>
              </div>
            )}

            {apiError && <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 px-2"><AlertCircle size={12} />{apiError}</p>}
            {saveSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2"><BadgeCheck size={12} /> Profile updated!</p>}

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 scrollbar-hide">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200 dark:border-white/5"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ═══ Section 1: Basic Information ═══ */}
            {activeTab === "info" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-5 bg-gradient-to-br from-[#7C3AED] to-[#059669] bg-clip-text text-transparent">
                Basic Information
              </h3>
              {isEditing ? (
                <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
                  {/* @ts-expect-error TODO: Fix pervasive types */}
                  <Input id="name" label="Full Name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} error={errors.name} required leftIcon={<User size={16} />} />
                  {/* @ts-expect-error TODO: Fix pervasive types */}
                  <Input id="email-display" label="Email" type="email" value={user.email} disabled leftIcon={<Mail size={16} />} helperText="Email cannot be changed." />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300">Role</label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-sm cursor-not-allowed">
                      <Shield size={15} /><span>{roleConfig.label}</span>
                    </div>
                  </div>
                  {user.role === "recruiter" && (
                    <>
                      <Input id="company" name="company" label="Company Name" placeholder="Enter company name" value={formData.company} onChange={handleChange} leftIcon={<Briefcase size={16} />} />
                      <Input id="companyWebsite" name="companyWebsite" label="Company Website" placeholder="e.g. www.mycompany.com" value={formData.companyWebsite} onChange={handleChange} leftIcon={<Globe size={16} />} helperText="Link to your company's official website." />
                      <Input id="linkedinUrl" name="linkedinUrl" label="LinkedIn Company Page" placeholder="https://linkedin.com/company/..." value={formData.linkedinUrl} onChange={handleChange} leftIcon={<Link2 size={16} />} />
                      <Input id="credentialUrl" name="credentialUrl" label="Proof Document Link" placeholder="https://drive.google.com/..." value={formData.credentialUrl} onChange={handleChange} leftIcon={<FileText size={16} />} helperText="Link to an offer letter, ID card, or company proof (e.g. Google Drive link)." />
                    </>
                  )}
                  {user.role === "tutor" && (
                    <>
                      <Input id="linkedinUrl" name="linkedinUrl" label="LinkedIn Profile" placeholder="https://linkedin.com/in/..." value={formData.linkedinUrl} onChange={handleChange} leftIcon={<Link2 size={16} />} />
                      <Input id="credentialUrl" name="credentialUrl" label="Qualification Proof" placeholder="https://drive.google.com/..." value={formData.credentialUrl} onChange={handleChange} leftIcon={<FileText size={16} />} helperText="Link to your degree/certification (e.g. Google Drive link)." />
                    </>
                  )}
                </form>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                  {(() => {
                    const infoRows = [
                      { icon: <User size={15} />, label: "Full Name", value: user.name },
                      { icon: <Mail size={15} />, label: "Email", value: user.email },
                      { icon: <Shield size={15} />, label: "Role", value: `${roleConfig.icon} ${roleConfig.label}` },
                      { icon: <BadgeCheck size={15} />, label: "Verification", value: verificationBadge },
                    ];
                    if (user.role === "recruiter") {
                      infoRows.push(
                        { icon: <Briefcase size={15} />, label: "Company", value: user.company || <span className="text-slate-400 italic">Not set</span> },
                        { icon: <Globe size={15} />, label: "Company Website", value: user.companyWebsite ? (
                          <a href={user.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            {user.companyWebsite} <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-slate-400 italic">Not set</span> },
                        { icon: <Link2 size={15} />, label: "LinkedIn Company Page", value: user.linkedinUrl ? (
                          <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            {user.linkedinUrl} <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-slate-400 italic">Not set</span> },
                        { icon: <FileText size={15} />, label: "Proof Document", value: user.credentialUrl ? (
                          <a href={user.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            {user.credentialUrl} <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-slate-400 italic">Not set</span> }
                      );
                    }
                    if (user.role === "tutor") {
                      infoRows.push(
                        { icon: <Link2 size={15} />, label: "LinkedIn Profile", value: user.linkedinUrl ? (
                          <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            {user.linkedinUrl} <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-slate-400 italic">Not set</span> },
                        { icon: <FileText size={15} />, label: "Qualification Proof", value: user.credentialUrl ? (
                          <a href={user.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            {user.credentialUrl} <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-slate-400 italic">Not set</span> }
                      );
                    }
                    return infoRows.map((row, i) => (
                      <div key={i} className="flex items-start gap-3 py-3.5">
                        <span className="mt-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0">{row.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{row.label}</p>
                          <div className="text-sm text-slate-700 dark:text-slate-200">{row.value}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
            )}

            {activeTab === "settings" && (
              <PreferencesSettings token={token} />
            )}

            {activeTab === "security" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-5 bg-gradient-to-br from-[#7C3AED] to-[#059669] bg-clip-text text-transparent">
                  Password & Access
                </h3>
                {user.provider === "google" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm text-blue-700 dark:text-blue-300">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p>Your account uses Google OAuth. Password management is handled by Google.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    {passwordApiError && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{passwordApiError}</span>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Check size={15} className="shrink-0 mt-0.5" />
                        <span>Password changed successfully!</span>
                      </div>
                    )}
                    <Input
                      id="currentPassword"
                      label="Current Password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      error={passwordErrors.currentPassword}
                      disabled={passwordSaving}
                      required
                    />
                    <Input
                      id="newPassword"
                      label="New Password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      error={passwordErrors.newPassword}
                      disabled={passwordSaving}
                      required
                    />
                    <Input
                      id="confirmPassword"
                      label="Confirm New Password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={passwordErrors.confirmPassword}
                      disabled={passwordSaving}
                      required
                    />
                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={passwordSaving}
                        disabled={passwordSaving}
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {/* ═══ Section 2: Account Details ═══ */}
            {activeTab === "account" && (
              <div className="flex flex-col gap-5 min-w-0">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-5 bg-gradient-to-br from-[#7C3AED] to-[#059669] bg-clip-text text-transparent">
                    Account Details
                  </h3>
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                    {[
                      { icon: <Calendar size={15} />, label: "Member Since", value: formatDate(user.createdAt) },
                      { icon: <Clock size={15} />, label: "Last Updated", value: user.updatedAt ? `${formatDate(user.updatedAt)} (${timeAgo(user.updatedAt)})` : "—" },
                      { icon: <Shield size={15} />, label: "Auth Provider", value: user.provider === "google" ? "🔵 Google OAuth" : "🔑 Email & Password" },
                      { icon: <User size={15} />, label: "User ID", value: <span className="font-mono text-xs text-slate-400 break-all">{user.id || user._id}</span> },
                    ].map((row, i) => (
                      <div key={i} className="flex items-start gap-3 py-3.5">
                        <span className="mt-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0">{row.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{row.label}</p>
                          <div className="text-sm text-slate-700 dark:text-slate-200">{row.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ═══ Danger Zone ═══ */}
                <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-500/20 p-6">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Danger Zone</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </Button>
                </div>
              </div>
            )}

          </div>
          </ErrorBoundary> {/* Closes Right Column */}

        </div> {/* Closes Main Layout Grid */}
      </div> {/* Closes Content Wrapper */}

      {showDeleteModal && (
        <DeleteModal 
          onConfirm={handleDeleteAccount} 
          onCancel={() => setShowDeleteModal(false)} 
          loading={isDeleting} 
        />
      )}
          <Footer />
    </div> /* Closes Root Background Container */
  );
};

export default ProfilePage;
