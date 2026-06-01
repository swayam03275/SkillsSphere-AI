import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);
const TOAST_DURATION = 3500;
let toastCounter = 0;

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    barClass: "bg-emerald-400",
    title: "Success",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-400",
    borderClass: "border-red-500/30",
    barClass: "bg-red-400",
    title: "Error",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    barClass: "bg-amber-400",
    title: "Warning",
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type, message, title) => {
    const id = `${Date.now()}-${toastCounter++}`;

    setToasts((prevToasts) => [
      ...prevToasts,
      {
        id,
        type,
        message,
        title,
      },
    ]);

    window.setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
  }, [removeToast]);

  const value = useMemo(
    () => ({
      showToast,
      success: (message, title) => showToast("success", message, title),
      error: (message, title) => showToast("error", message, title),
      warning: (message, title) => showToast("warning", message, title),
      removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed top-4 right-4 z-[1000] flex w-[min(90vw,380px)] flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              className={`relative overflow-hidden rounded-xl border bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm pointer-events-auto animate-toast-in ${style.borderClass}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3 pr-6">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">
                    {toast.title || style.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-300">{toast.message}</p>
                </div>
              </div>

              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-700/70">
                <div
                  className={`h-full w-full animate-toast-progress origin-left ${style.barClass}`}
                  style={{ animationDuration: `${TOAST_DURATION}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
};
