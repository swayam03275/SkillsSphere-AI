import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as authService from "../../services/authService";

const TOKEN_KEY = "skillssphere.auth.token";
const USER_KEY = "skillssphere.auth.user";
const PENDING_EMAIL_KEY = "skillssphere.auth.pendingEmail";

const canUseStorage = () => typeof window !== "undefined";

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const safeGetItem = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch {
    // Auth still works in memory when browser storage is unavailable.
  }
};

const safeRemoveItem = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const readStoredUser = (storage) => {
  const storedUser = safeGetItem(storage, USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

const readStoredAuth = () => {
  if (!canUseStorage()) {
    return { token: null, user: null };
  }

  const localToken = safeGetItem(window.localStorage, TOKEN_KEY);
  const localUser = readStoredUser(window.localStorage);

  if (localToken && localUser) {
    return { token: localToken, user: localUser };
  }

  const sessionToken = safeGetItem(window.sessionStorage, TOKEN_KEY);
  const sessionUser = readStoredUser(window.sessionStorage);

  if (sessionToken && sessionUser) {
    return { token: sessionToken, user: sessionUser };
  }

  return { token: null, user: null };
};

const persistAuth = ({ token, user }, rememberMe) => {
  if (!canUseStorage()) return;

  clearStoredAuth();

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  safeSetItem(storage, TOKEN_KEY, token);
  safeSetItem(storage, USER_KEY, JSON.stringify(user));
};

const clearStoredAuth = () => {
  if (!canUseStorage()) return;

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    safeRemoveItem(storage, TOKEN_KEY);
    safeRemoveItem(storage, USER_KEY);
  });
};

const readPendingEmail = () => {
  if (!canUseStorage()) return "";
  return safeGetItem(window.localStorage, PENDING_EMAIL_KEY) || "";
};

const persistPendingEmail = (email) => {
  if (!canUseStorage()) return;
  safeSetItem(window.localStorage, PENDING_EMAIL_KEY, normalizeEmail(email));
};

const clearPendingEmail = () => {
  if (!canUseStorage()) return;
  safeRemoveItem(window.localStorage, PENDING_EMAIL_KEY);
};

const toErrorMessage = (error, fallback) =>
  error?.message || fallback || "Something went wrong. Please try again.";

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, thunkAPI) => {
    try {
      const payload = {
        ...userData,
        email: normalizeEmail(userData.email),
        name: userData.name.trim(),
      };
      const data = await authService.register(payload);

      return {
        ...data,
        pendingVerificationEmail: payload.email,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        toErrorMessage(error, "Registration failed"),
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password, rememberMe = true }, thunkAPI) => {
    try {
      const data = await authService.login({
        email: normalizeEmail(email),
        password,
      });

      return {
        ...data,
        rememberMe,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(toErrorMessage(error, "Login failed"));
    }
  },
);

export const verifyEmail = createAsyncThunk(
  "auth/verifyEmail",
  async ({ email, otp }, thunkAPI) => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const data = await authService.verifyEmail({
        email: normalizedEmail,
        otp,
      });

      return {
        ...data,
        email: normalizedEmail,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        toErrorMessage(error, "Email verification failed"),
      );
    }
  },
);

export const resendOtp = createAsyncThunk(
  "auth/resendOtp",
  async ({ email }, thunkAPI) => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const data = await authService.resendOtp({ email: normalizedEmail });

      return {
        ...data,
        email: normalizedEmail,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        toErrorMessage(error, "Could not resend verification code"),
      );
    }
  },
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.token;

      if (!token) {
        return thunkAPI.rejectWithValue("No auth token available");
      }

      const data = await authService.getCurrentUser(token);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        toErrorMessage(error, "Failed to fetch user"),
      );
    }
  },
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, thunkAPI) => {
    const token = thunkAPI.getState()?.auth?.token;
    if (token) {
      try {
        await authService.logout(token);
      } catch {
        // Logout API failure is non-fatal — still clear local state
      }
    }
    return null;
  },
);

const storedAuth = readStoredAuth();

const initialState = {
  user: storedAuth.user,
  token: storedAuth.token,
  isAuthenticated: Boolean(storedAuth.token && storedAuth.user),
  pendingVerificationEmail: readPendingEmail(),
  pendingUser: null,
  loading: false,
  verificationLoading: false,
  resendLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setPendingVerificationEmail: (state, action) => {
      const email = normalizeEmail(action.payload);
      state.pendingVerificationEmail = email;
      persistPendingEmail(email);
    },
    setOAuthData: (state, action) => {
      const { token, user, rememberMe = true } = action.payload;

      const storage = rememberMe ? window.localStorage : window.sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));

      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      state.user = action.payload;
      
      // Update storage as well
      const storage = window.localStorage.getItem("skillssphere.auth.token") 
        ? window.localStorage 
        : window.sessionStorage;
      
      try {
        storage.setItem("skillssphere.auth.user", JSON.stringify(action.payload));
      } catch (e) {
        // Ignore storage errors
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        const email = action.payload.pendingVerificationEmail;

        clearStoredAuth();
        persistPendingEmail(email);

        state.loading = false;
        state.error = null;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.pendingUser = action.payload.user || null;
        state.pendingVerificationEmail = email;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { token, user, rememberMe } = action.payload;

        persistAuth({ token, user }, rememberMe);
        clearPendingEmail();

        state.loading = false;
        state.error = null;
        state.user = user;
        state.token = token;
        state.isAuthenticated = Boolean(token && user);
        state.pendingUser = null;
        state.pendingVerificationEmail = "";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyEmail.pending, (state) => {
        state.verificationLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        clearPendingEmail();
        state.verificationLoading = false;
        state.error = null;
        state.pendingUser = null;
        state.pendingVerificationEmail = "";
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verificationLoading = false;
        state.error = action.payload;
      })
      .addCase(resendOtp.pending, (state) => {
        state.resendLoading = true;
        state.error = null;
      })
      .addCase(resendOtp.fulfilled, (state, action) => {
        persistPendingEmail(action.payload.email);
        state.resendLoading = false;
        state.error = null;
        state.pendingVerificationEmail = action.payload.email;
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.resendLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        clearStoredAuth();
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        clearStoredAuth();
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if the API call fails, clear local auth state
        clearStoredAuth();
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const {
  clearAuthError,
  setPendingVerificationEmail,
  setOAuthData,
  updateUserProfile,
} = authSlice.actions;

// Export logoutUser thunk as "logout" to preserve the existing API
// used by all UI components (Navbar, DashboardPage, ProfilePage)
export const logout = logoutUser;

export default authSlice.reducer;
