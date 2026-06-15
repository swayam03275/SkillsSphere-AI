import React from "react";
import { AlertCircle, MicOff, Mic, Loader2, Send } from "lucide-react";

export const AnswerInputSection = ({
  isObserver,
  textareaRef,
  liveTyping,
  answer,
  onChange,
  onKeyDown,
  submitting,
  error,
  failedAction,
  onRetry,
  isRecording,
  startRecording,
  stopRecording,
  onSubmit,
  requestStatus,
}) => {
  const getWordCount = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col">
      {isObserver ? (
        <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-56 overflow-y-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Candidate Typing
          </span>
          <p className="text-base text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
            {liveTyping || <span className="text-slate-400 italic">Waiting for input...</span>}
          </p>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl p-6 text-slate-900 dark:text-slate-100 text-lg leading-relaxed resize-y min-h-[180px] focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all shadow-inner"
          placeholder="Type your answer here... (Ctrl+Enter to submit)"
          value={answer}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={submitting}
          rows={5}
        />
      )}
      
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isObserver ? getWordCount(liveTyping) : getWordCount(answer)} words
          </span>
          {error && (
            <span className="text-sm font-semibold text-red-500 flex flex-wrap items-center gap-1.5 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg">
              <AlertCircle size={16} /> {error}
              {failedAction && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={submitting || Boolean(requestStatus)}
                  className="ml-2 underline underline-offset-2 disabled:opacity-50 bg-transparent border-none cursor-pointer text-red-500 font-bold"
                >
                  Retry
                </button>
              )}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {!isObserver && (
            <button
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all border-none cursor-pointer ${
                isRecording 
                  ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 animate-[pulse_1.5s_ease-in-out_infinite]" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={submitting || Boolean(requestStatus)}
            >
              {isRecording ? <><MicOff size={18} /> Stop</> : <><Mic size={18} /> Record</>}
            </button>
          )}

          {!isObserver && (
            <button
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 border-none cursor-pointer"
              onClick={onSubmit}
              disabled={!answer.trim() || submitting || Boolean(requestStatus)}
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Evaluating</>
              ) : (
                <><Send size={18} /> Submit</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default AnswerInputSection;
