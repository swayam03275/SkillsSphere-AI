import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import ProfileSkeleton from "./components/ProfileSkeleton";
import {
  User, Mail, Shield, Calendar, Clock, Pencil, X, Check,
  ChevronLeft, BadgeCheck, AlertCircle, Trash2, LogOut,
  Info, Lock, Sparkles, Activity, Camera, ImageOff, Upload,
  MapPin, Star, MessageCircle, Phone,
} from "lucide-react";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateUserProfile, logout } from "../../features/auth/authSlice";
import {
  updateProfile,
  deleteProfile,
  uploadAvatar,
  removeAvatar,
} from "./services/profileService";
import LoadingState from "../../shared/components/LoadingState";
import { getProtectedAssetUrl } from "../../utils/protectedAssetUrl";

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
  { id: "account", label: "Account", icon: <Info size={15} /> },
  { id: "security", label: "Security", icon: <Lock size={15} /> },
];
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

const InfoRow = ({ icon, label, value, action }) => (
  <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 dark:border-white/5 last:border-0">
    <span className="mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500 w-4 h-4">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="text-sm text-slate-700 dark:text-slate-200 break-words">
        {value}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border bg-white dark:bg-slate-900/70 border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.4)] backdrop-blur-sm ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
    {children}
  </h3>
);

const StatCard = ({ icon, label, value, sub }) => (
  <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
    <span className="text-slate-400 dark:text-slate-500 mb-1">{icon}</span>
    <span className="text-xl font-bold text-slate-800 dark:text-white">
      {value}
    </span>
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </span>
    {sub && (
      <span className="text-[11px] text-slate-400 dark:text-slate-500">
        {sub}
      </span>
    )}
  </div>
);

// ─── Delete Modal ─────────────────────────────────────────────────────────────

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
        <Button
          variant="outline"
          fullWidth
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          fullWidth
          onClick={onConfirm}
          loading={loading}
        >
          Yes, Delete
        </Button>
      </div>
    </div>
  </div>
);

// ─── Avatar Editor ────────────────────────────────────────────────────────────

const AvatarEditor = ({
  user,
  roleConfig,
  onUpload,
  onRemove,
  uploading,
  isEditing,
  token,
}) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setPendingFile(file);
    setJustSaved(false);
  };

  const handleSavePhoto = () => {
    if (!pendingFile) return;
    onUpload(pendingFile);
    setPendingFile(null);
    setPreview(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setPendingFile(null);
  };

  const handleRemove = () => {
    setPreview(null);
    setPendingFile(null);
    setJustSaved(false);
    onRemove();
  };

  const displayPic = preview || getProtectedAssetUrl(user.profilePic, token);
  const initials = getInitials(user.name || "");
  const hasPendingChange = Boolean(pendingFile);

  // What to show below the avatar:
  // 1. hasPendingChange  → Save / Cancel
  // 2. uploading         → spinner text
  // 3. justSaved         → green success tick
  // 4. user.profilePic   → Change Photo / Remove
  // 5. no photo          → Upload Photo + hint

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative group">
        <div
          className={`relative w-28 h-28 rounded-2xl transition-all duration-200
            ${hasPendingChange ? "ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900" : ""}
            ${justSaved ? "ring-4 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900" : ""}`}
        >
          <div
            className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${roleConfig.avatar} flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-900 shadow-xl select-none overflow-hidden`}
            style={{ boxShadow: `0 0 28px ${roleConfig.glow}` }}
          >
            {displayPic ? (
              <img
                src={displayPic}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* Uploading spinner */}
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Hover overlay — click to change — only in edit mode */}
          {isEditing && !uploading && !hasPendingChange && !justSaved && (
            <div
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Camera size={20} className="text-white" />
              <span className="text-white text-[11px] font-semibold">
                {user.profilePic ? "Change" : "Upload"}
              </span>
            </div>
          )}
        </div>

        {/* X remove badge — only in edit mode with a saved photo */}
        {isEditing &&
          user.profilePic &&
          !hasPendingChange &&
          !uploading &&
          !justSaved && (
            <button
              onClick={handleRemove}
              title="Remove photo"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
            >
              <X size={12} />
            </button>
          )}
      </div>

      {/* ── State-based action area — only visible in edit mode ── */}

      {/* 1. Pending preview */}
      {isEditing && hasPendingChange && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold">
            Preview — not saved yet
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSavePhoto}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              <Check size={13} /> Save Photo
            </button>
            <button
              onClick={handleCancelPreview}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2. Uploading */}
      {isEditing && !hasPendingChange && uploading && (
        <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">
          Saving photo…
        </p>
      )}

      {/* 3. Just saved — success message only, no buttons */}
      {isEditing && !hasPendingChange && !uploading && justSaved && (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <BadgeCheck size={14} /> Photo saved successfully!
        </div>
      )}

      {/* 4. Idle with saved photo — Change / Remove */}
      {isEditing &&
        !hasPendingChange &&
        !uploading &&
        !justSaved &&
        user.profilePic && (
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Camera size={12} /> Change Photo
            </button>
            <button
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-white/10 transition-colors"
            >
              <ImageOff size={12} /> Remove
            </button>
          </div>
        )}

      {/* 5. Idle with no photo — Upload + hint */}
      {isEditing &&
        !hasPendingChange &&
        !uploading &&
        !justSaved &&
        !user.profilePic && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Upload size={12} /> Upload Photo
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              JPG, PNG, WebP or GIF · Max 3 MB · Drag & drop supported
            </p>
          </>
        )}

          <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
       onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};
      

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: user?.name || "" });
  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const roleConfig = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.student;

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    setAvatarError("");
    const blobUrl = URL.createObjectURL(file);
    dispatch(updateUserProfile({ ...user, profilePic: blobUrl }));
    try {
      const response = await uploadAvatar(file, token);
      dispatch(updateUserProfile(response.user));
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Rollback — restore previous profilePic on failure
      dispatch(
        updateUserProfile({ ...user, profilePic: user.profilePic ?? null }),
      );
      URL.revokeObjectURL(blobUrl);
      setAvatarError(err.message || "Failed to upload photo");
    } finally { setAvatarUploading(false); }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const response = await removeAvatar(token);
      dispatch(updateUserProfile(response.user));
    } catch (err) {
      setAvatarError(err.message || "Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEditClick = () => {
    setFormData({ name: user?.name || "" });
    setErrors({});
    setSaveSuccess(false);
    setApiError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({ name: user?.name || "" });
    setErrors({});
    setApiError("");
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = () => {
    const errs = {};
    const trimmed = formData.name.trim();
    if (!trimmed) errs.name = "Name cannot be empty";
    else if (trimmed.length < 2)
      errs.name = "Name must be at least 2 characters";
    return errs;
  };

  const handleSave = async (e) => {
  e?.preventDefault();

  const errs = validate();

  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }

  setIsSaving(true);

  try {
    setApiError("");

    const trimmed = formData.name.trim();

    const response = await updateProfile(
      { name: trimmed },
      token
    );

    dispatch(updateUserProfile(response.user));

    setSaveSuccess(true);
    setIsEditing(false);
    setErrors({});

    setTimeout(() => setSaveSuccess(false), 3500);
  } catch (err) {
    setApiError(err.message || "Failed to update profile");
    } finally {
    setIsSaving(false);
  }
};

return (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
      Profile Page
    </h1>
  </div>
);
};

export default ProfilePage;