
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getResults, toggleQuestionBookmark } from "../services/interviewService";
import InterviewResultsSkeleton from "../components/InterviewResultsSkeleton";
import { analyzeText } from "../utils/sentiment";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import {
  Trophy,
  Brain,
  MessageSquare,
  Target,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  ArrowLeft,
  Video,
  Play,
  FileJson,
  Sparkles,
  Bookmark,
  Download
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { exportToPDF } from "../../../utils/exportUtils";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import logger from "../../../utils/logger";


const InterviewResults = () => {
  useDocumentTitle("Interview Results");
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [bookmarkingQuestionId, setBookmarkingQuestionId] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        const defaultVoice = availableVoices.find(v => v.lang.startsWith("en")) || availableVoices[0];
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSpeak = (text: string, id: string) => {
    if (!window.speechSynthesis) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await getResults(sessionId);
        setResults(res.data);
      } catch (err: any) {
        setError("Failed to load results.");
        logger.error("[InterviewResults] Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId]);

  const toggleCard = (idx) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleBookmarkToggle = async (answer) => {
    if (!answer?.questionId || bookmarkingQuestionId) return;

    const nextBookmarked = !answer.bookmarked;
    setBookmarkingQuestionId(answer.questionId);
    setBookmarkError(null);
    setResults((currentResults) => ({
      ...currentResults,
      answers: currentResults.answers.map((item) =>
        item.questionId === answer.questionId
          ? { ...item, bookmarked: nextBookmarked }
          : item,
      ),
    }));

    try {
      const response = await toggleQuestionBookmark(sessionId, answer.questionId, nextBookmarked);
      const savedBookmarked = Boolean(response.data?.bookmarked);
      setResults((currentResults) => ({
        ...currentResults,
        answers: currentResults.answers.map((item) =>
          item.questionId === answer.questionId
            ? { ...item, bookmarked: savedBookmarked }
            : item,
        ),
      }));
    } catch (err: any) {
      setResults((currentResults) => ({
        ...currentResults,
        answers: currentResults.answers.map((item) =>
          item.questionId === answer.questionId
            ? { ...item, bookmarked: Boolean(answer.bookmarked) }
            : item,
        ),
      }));
      setBookmarkError(err.message || "Could not update bookmark. Please try again.");
      logger.error("[InterviewResults] Bookmark error:", err);
    } finally {
      setBookmarkingQuestionId(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const handleExportPDF = async () => {
    try {
      const filename = `Interview_Report_${results?.topic?.replace(/[^a-z0-9]/gi, '_') || 'Session'}.pdf`;
      await exportToPDF("mock-interview-pdf-target", filename, {
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#09090b' }
      });
    } catch (err: any) {
      logger.error("[InterviewResults] PDF export failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6">
        <Navbar />
        <InterviewResultsSkeleton />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
            <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
            <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
          </div>
          <div className="w-full max-w-[900px] relative z-10 flex flex-col gap-6">
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted mt-24">
              <AlertTriangle size={48} className="text-red-500" />
              <p className="font-medium text-lg">{error || "No results found."}</p>
              <button
                className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-none py-3 px-6 rounded-xl font-semibold cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors mt-4"
                onClick={() => navigate("/mock-interview")}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const overallScore = results.overallScore || 0;
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  // Calculate per-category averages from answers
  const answers = results.answers || [];
  const avgTechnical = answers.length
    ? Math.round(
        answers.reduce((s, a) => s + (a.scores?.technical || 0), 0) /
          answers.length,
      )
    : 0;
  const avgCommunication = answers.length
    ? Math.round(
        answers.reduce((s, a) => s + (a.scores?.communication || 0), 0) /
          answers.length,
      )
    : 0;
  const avgRelevance = answers.length
    ? Math.round(
        answers.reduce((s, a) => s + (a.scores?.relevance || 0), 0) /
          answers.length,
      )
    : 0;

  let totalHesitations = 0;
  let totalConfidence = 0;
  let totalTone = 0;

  if (answers.length) {
    answers.forEach(a => {
      const analysis = analyzeText(a.transcript || "");
      totalHesitations += analysis.hesitationCount;
      totalConfidence += analysis.confidence;
      totalTone += analysis.tone;
    });
  }

  const avgConfidence = answers.length ? Math.round(totalConfidence / answers.length) : 0;
  const avgTone = answers.length ? Math.round(totalTone / answers.length) : 0;

  const radarData = [
    { subject: 'Technical', A: avgTechnical, fullMark: 100 },
    { subject: 'Communication', A: avgCommunication, fullMark: 100 },
    { subject: 'Relevance', A: avgRelevance, fullMark: 100 },
    { subject: 'Confidence', A: avgConfidence, fullMark: 100 },
    { subject: 'Tone', A: avgTone, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[900px] relative z-10 flex flex-col gap-6">
          
          {/* Back to Dashboard Link */}
          <div className="py-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center space-y-4 mb-10 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <FileJson className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Brain className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> COGNITIVE EVALUATION REPORT
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Interview</span> Results
            </h1>
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          <span className="py-1 px-3 rounded-full text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
            {results.topic?.toUpperCase()}
          </span>
          <span className="py-1 px-3 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 capitalize">
            {results.difficulty}
          </span>
          {results.duration && (
            <span className="py-1 px-3 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
              <Clock size={12} className="inline-block mr-1" />
              {results.duration}s
            </span>
          )}
        </div>
        </div>

        {/* Overall Score Ring */}
        <div className="bg-white dark:bg-surface border border-border shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:shadow-none rounded-3xl p-10 text-center animate-[fadeInUp_0.4s_ease-out]">
        <div className="w-[140px] h-[140px] mx-auto mb-6 relative">
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r="56"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r="56"
              fill="none"
              stroke={getScoreColor(overallScore)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-in-out"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">{overallScore}</div>
        </div>

        <div className="flex justify-center gap-8 mt-4 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <Brain size={20} className="text-indigo-500" />
            <span className="text-3xl font-bold text-text-main">{avgTechnical}%</span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Technical</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageSquare size={20} className="text-indigo-500" />
            <span className="text-3xl font-bold text-text-main">{avgCommunication}%</span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Communication</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Target size={20} className="text-indigo-500" />
            <span className="text-3xl font-bold text-text-main">{avgRelevance}%</span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Relevance</span>
          </div>
        </div>
      </div>

      {/* Soft Skills Report */}
      <div className="bg-white dark:bg-surface border border-border shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:shadow-none rounded-3xl p-10 mt-6 animate-[fadeInUp_0.5s_ease-out]">
        <h3 className="text-xl font-bold text-text-main mb-6 text-center flex items-center justify-center gap-2">
          <Target size={20} className="text-emerald-500" />
          Soft Skills & Delivery
        </h3>
        <div className="flex flex-col gap-8 items-center">
          <div className="w-full max-w-[500px] h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Candidate" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Avg Confidence</span>
              <span className="text-xl font-bold text-text-main">{avgConfidence}%</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Avg Tone</span>
              <span className="text-xl font-bold text-text-main">{avgTone}%</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Hesitations</span>
              <span className="text-xl font-bold text-text-main">{totalHesitations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Synthesis Settings Card */}
      <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-6 mb-6 shadow-sm animate-[fadeInUp_0.6s_ease-out]">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-500" />
          Voice Synthesis Settings (AI Playback)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Voice Selection</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-sm text-gray-800 dark:text-slate-100 outline-none"
            >
              {voices.length === 0 ? (
                <option value="">System Default Voice</option>
              ) : (
                voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Playback Speed</label>
              <span className="text-xs text-indigo-500 font-bold">{rate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="accent-indigo-500 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Pitch</label>
              <span className="text-xs text-indigo-500 font-bold">{pitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="accent-indigo-500 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Weak Concepts */}
      {bookmarkError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {bookmarkError}
        </div>
      )}

      {results.weakConcepts?.length > 0 && (
        <div className="bg-amber-50 dark:bg-surface border border-amber-200 dark:border-amber-500/20 rounded-3xl p-8 dark:shadow-none animate-[fadeInUp_0.6s_ease-out]">
          <h3 className="text-lg font-bold mb-4 text-text-main flex items-center gap-2">
            <AlertTriangle
              size={20}
              className="text-amber-500"
            />
            Concepts to Review
          </h3>
          <div className="flex flex-wrap gap-2">
            {results.weakConcepts.map((c, i) => (
              <span key={i} className="py-1.5 px-3 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-Question Breakdown */}
      {answers.map((a, idx) => (
        <div key={idx} className="bg-white dark:bg-surface border border-border shadow-[0_10px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-2xl overflow-hidden animate-[fadeInUp_0.7s_ease-out]">
          <div className="py-5 px-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleCard(idx)}>
            <div className="flex items-center gap-2.5 flex-1 pr-4">
              <span className="font-semibold text-text-main">
                Q{idx + 1}. {a.questionText}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(a.questionText, `q-${idx}`);
                }}
                className={`p-1.5 rounded-lg border transition-all ${
                  speakingId === `q-${idx}`
                    ? "bg-indigo-500 text-white border-indigo-500 animate-pulse"
                    : "border-gray-200 dark:border-white/10 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 bg-gray-50 dark:bg-white/5"
                }`}
                title="Listen to question"
              >
                {speakingId === `q-${idx}` ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                )}
              </button>
            </div>
            {a.bookmarked && (
              <span className="mr-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Bookmark size={13} fill="currentColor" />
                Bookmarked
              </span>
            )}
            <span
              className="font-bold text-lg text-[color:var(--tw-score-color)]"
              style={{ '--tw-score-color': getScoreColor(a.scores?.technical || 0) }}
            >
              {a.scores?.technical || 0}%
            </span>
            {expandedCards[idx] ? (
              <ChevronUp size={20} className="text-text-muted" />
            ) : (
              <ChevronDown size={20} className="text-text-muted" />
            )}
          </div>
          {expandedCards[idx] && (
            <div className="px-6 pb-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => handleBookmarkToggle(a)}
                disabled={bookmarkingQuestionId === a.questionId}
                aria-pressed={Boolean(a.bookmarked)}
                className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  a.bookmarked
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-gray-200 bg-gray-50 text-slate-600 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                <Bookmark size={16} fill={a.bookmarked ? "currentColor" : "none"} />
                {a.bookmarked ? "Remove bookmark" : "Bookmark question"}
              </button>
              <div className="text-text-muted leading-relaxed my-4 text-sm bg-gray-50 dark:bg-slate-900 p-4 rounded-xl relative group/transcript pr-12">
                <strong className="text-text-main block mb-2">Your Answer:</strong>{" "}
                {a.transcript || "No answer submitted"}
                {a.transcript && (
                  <button
                    type="button"
                    onClick={() => handleSpeak(a.transcript, `t-${idx}`)}
                    className={`absolute top-4 right-4 p-1.5 rounded-lg border transition-all ${
                      speakingId === `t-${idx}`
                        ? "bg-indigo-500 text-white border-indigo-500 animate-pulse"
                        : "border-gray-200 dark:border-white/10 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 bg-white dark:bg-slate-800"
                    }`}
                    title="Listen to answer"
                  >
                    {speakingId === `t-${idx}` ? (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    )}
                  </button>
                )}
              </div>
              <div className="flex gap-4 my-4 flex-wrap">
                <span className="py-1.5 px-3 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300">
                  Tech: {a.scores?.technical || 0}%
                </span>
                <span className="py-1.5 px-3 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300">
                  Comm: {a.scores?.communication || 0}%
                </span>
                <span className="py-1.5 px-3 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300">
                  Rel: {a.scores?.relevance || 0}%
                </span>
              </div>
              {a.concepts && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.concepts.detected?.map((c, i) => (
                    <span key={`d-${i}`} className="py-1.5 px-3 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                      ✓ {c}
                    </span>
                  ))}
                  {a.concepts.missed?.map((c, i) => (
                    <span key={`m-${i}`} className="py-1.5 px-3 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
                      ✗ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-8 flex-wrap mb-10">
        <button
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all text-white border-none py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2"
          onClick={() => navigate("/mock-interview")}
        >
          <RefreshCw size={18} /> New Interview
        </button>
        <button
          className="bg-white dark:bg-surface text-indigo-600 dark:text-indigo-400 border border-border shadow-[0_5px_15px_rgba(0,0,0,0.02)] py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:border-indigo-500/30 transition-all hover:-translate-y-0.5"
          onClick={handleExportPDF}
        >
          <Download size={18} /> Export Report (PDF)
        </button>
        <button
          className="bg-white dark:bg-surface text-indigo-600 dark:text-indigo-400 border border-border shadow-[0_5px_15px_rgba(0,0,0,0.02)] py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:border-indigo-500/30 transition-all hover:-translate-y-0.5"
          onClick={() => navigate("/mock-interview/history")}
        >
          <Clock size={18} /> View History
        </button>
        <button
          className="bg-white dark:bg-surface text-text-main border border-border shadow-[0_5px_15px_rgba(0,0,0,0.02)] py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:border-gray-300 dark:hover:border-slate-600 transition-all hover:-translate-y-0.5"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      {/* Printable PDF Report (Off-screen) */}
      <div 
        id="mock-interview-pdf-target" 
        className="absolute left-[-9999px] top-0 w-[800px] p-8 bg-[#09090b] text-slate-100 flex flex-col gap-6"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-500 via-purple-500 to-teal-400 bg-clip-text text-transparent tracking-tight">
              SkillSphere AI
            </h1>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Mock Interview Performance Report</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Generated on {new Date().toLocaleDateString()}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Session: #{sessionId?.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Topic & Level</span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold uppercase text-white tracking-wide">{results?.topic}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                {results?.difficulty}
              </span>
            </div>
            {results?.duration && (
              <p className="text-xs text-slate-400">
                Duration: <strong className="text-slate-300">{results?.duration} seconds</strong>
              </p>
            )}
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-8 py-4 rounded-2xl text-center">
            <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Overall Score</span>
            <span className="text-4xl font-extrabold text-white">{overallScore}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Technical Skills</span>
            <span className="text-2xl font-bold text-emerald-400">{avgTechnical}%</span>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Communication</span>
            <span className="text-2xl font-bold text-indigo-400">{avgCommunication}%</span>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Relevance Score</span>
            <span className="text-2xl font-bold text-purple-400">{avgRelevance}%</span>
          </div>
        </div>

        {results?.weakConcepts?.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Recommended Concepts to Review</h3>
            <div className="flex flex-wrap gap-1.5">
              {results.weakConcepts.map((c, i) => (
                <span key={i} className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Detailed Questions & Answers</h3>
          {answers.map((a, idx) => (
            <div key={idx} className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-slate-200 flex-1 pr-6 leading-snug">
                  Q{idx + 1}. {a.questionText}
                </h4>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    Tech: {a.scores?.technical || 0}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0c0c0e] p-4 rounded-lg border border-slate-800/50">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Your Transcript:</span>
                {a.transcript || "No answer submitted"}
              </div>
              {a.concepts && (a.concepts.detected?.length > 0 || a.concepts.missed?.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {a.concepts.detected?.map((c, i) => (
                    <span key={`det-${i}`} className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded">
                      ✓ {c}
                    </span>
                  ))}
                  {a.concepts.missed?.map((c, i) => (
                    <span key={`mis-${i}`} className="text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded">
                      ✗ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center text-[9px] text-slate-600 border-t border-slate-800/60 pt-4 mt-4 uppercase tracking-widest font-semibold">
          SkillsSphere AI © {new Date().getFullYear()} — Career intelligence ecosystem
        </div>
      </div>
      </div>
      </main>
      <Footer />
    </div>
  );
};

export default InterviewResults;
