import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check, Camera, Loader2, LogOut } from "lucide-react";
import { useToast } from "../../shared/components";
import { apiRequest } from "../../services/apiClient";
import { setOAuthData, logoutUser, persistAuth } from "../../features/auth/authSlice";
import Navbar from "../../shared/components/Navbar";
import Footer from "../../shared/components/Footer";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const ROLES = [
  {
    id: "student",
    title: "Student",
    description: "Looking for jobs and guidance.",
    icon: "🎓"
  },
  {
    id: "tutor",
    title: "Tutor",
    description: "Ready to guide students.",
    icon: "👨‍🏫"
  },
  {
    id: "recruiter",
    title: "Recruiter",
    description: "Looking to hire top talent.",
    icon: "🏢"
  }
];

const OnboardingPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "student");
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState("");

  // If they somehow land here and are already onboarded, send them to dashboard
  useEffect(() => {
    if (user?.isOnboarded) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error("File size should be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProfilePic(objectUrl);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadPhoto = async (file) => {
    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiRequest("/api/users/me/avatar", {
        method: "PUT",
        token,
        body: formData,
      });
      
      return response.user.profilePic;
    } catch (err) {
      error(err.message || "Failed to upload photo");
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    
    const parsed = onboardingSchema.safeParse({ name });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photo if changed
      let finalPicUrl = profilePic;
      if (selectedFile) {
        const uploadedUrl = await uploadPhoto(selectedFile);
        if (uploadedUrl) {
          finalPicUrl = uploadedUrl;
        } else {
          setIsSubmitting(false);
          return; // Stop if photo upload failed
        }
      }

      // 2. Submit onboarding data
      const data = await apiRequest("/api/users/onboard", {
        method: "PUT",
        token,
        body: { name, role },
      });

      const updatedUser = { ...data.user, id: data.user._id, isOnboarded: true };
      persistAuth({ token, user: updatedUser }, true);
      dispatch(setOAuthData({ token, user: updatedUser, rememberMe: true }));
      
      if (role === "recruiter" || role === "tutor") {
        success("Please add your LinkedIn profile and a supporting document to unlock full access.");
        navigate("/profile", { replace: true });
      } else {
        success("Profile setup complete!");
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      error(err.message || "Onboarding failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative">
      <Navbar />
      
      <main className="flex-grow flex flex-col justify-center items-center px-3 py-16 sm:py-24 min-h-screen relative z-10">
        <div className="w-full max-w-[600px] relative">
          {/* Background glow matching Login/Register */}
          <div className="hidden sm:block absolute w-[520px] h-[520px] bg-blue-400/45 dark:bg-blue-500/40 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
          <div className="hidden sm:block absolute w-[420px] h-[420px] bg-purple-400/45 dark:bg-purple-500/40 rounded-full blur-[140px] dark:blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

          <form 
          onSubmit={handleSubmit} 
          className="p-4 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] w-full flex flex-col gap-6"
        >
          <div className="text-center">
            <h2 className="text-gray-900 dark:text-white mb-2 text-xl sm:text-2xl font-semibold">
              Complete Your Profile
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Almost there! Let's get to know you better.
            </p>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group cursor-pointer shrink-0" onClick={triggerFileInput}>
              <div className="w-24 h-24 rounded-full border-[3px] border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative shadow-sm">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                    {name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex-1 space-y-4 w-full">
              <Input
                id="name"
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormError("");
                }}
                error={formError}
                disabled={isSubmitting || isUploadingPhoto}
              />

              <Input
                id="email"
                type="email"
                label="Email Address"
                value={user?.email || ""}
                disabled
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              How will you use SkillsSphere?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ROLES.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`
                    relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center sm:items-start text-center sm:text-left
                    ${role === r.id 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"}
                  `}
                >
                  {role === r.id && (
                    <div className="absolute top-2 right-2 text-blue-500">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <h3 className={`font-semibold text-sm ${role === r.id ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {r.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight hidden sm:block">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting || isUploadingPhoto}
            className="mt-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-sm sm:text-base hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 min-h-[48px]"
          >
            {isSubmitting || isUploadingPhoto ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Profile...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Complete Setup
                <Check className="w-5 h-5" />
              </span>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center mt-4 sm:mt-5 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
          Changed your mind?{" "}
          <button 
            type="button"
            onClick={handleLogout}
            className="text-blue-500 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OnboardingPage;
