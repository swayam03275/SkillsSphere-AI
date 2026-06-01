import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResults } from "../services/interviewService";
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
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import logger from "../../../utils/logger";


const InterviewResults = () => {
  useDocumentTitle("Interview Results");
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await getResults(sessionId);
        setResults(res.data);
      } catch (err) {
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

  const getScoreColor = (score) => {
    if (score >= 75) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
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
      <div className="max-w-[900px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6">
        
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
          <AlertTriangle size={48} />
          <p>{error || "No results found."}</p>
          <button
            className="bg-indigo-500/15 text-indigo-300 border-none py-3 px-6 rounded-xl font-semibold cursor-pointer"
            onClick={() => navigate("/mock-interview")}
          >
            Back to Lobby
          </button>
        </div>
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
    <div className="max-w-[900px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6">
      
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">Interview Results</h1>
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          <span className="py-1 px-3 rounded-full text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
            {results.topic?.toUpperCase()}
          </span>
          <span className="py-1 px-3 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 capitalize">
            {results.difficulty}
          </span>
          {results.duration && (
            <span className="py-1 px-3 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
              <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
              {results.duration}s
            </span>
          )}
        </div>
      </div>

      {/* Overall Score Ring */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center dark:bg-gray-900/70">
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
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">{overallScore}</div>
        </div>

        <div className="flex justify-center gap-8 mt-4 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <Brain size={20} style={{ color: "#818cf8" }} />
            <span className="text-2xl font-bold text-slate-100">{avgTechnical}%</span>
            <span className="text-xs text-slate-400">Technical</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageSquare size={20} style={{ color: "#818cf8" }} />
            <span className="text-2xl font-bold text-slate-100">{avgCommunication}%</span>
            <span className="text-xs text-slate-400">Communication</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Target size={20} style={{ color: "#818cf8" }} />
            <span className="text-2xl font-bold text-slate-100">{avgRelevance}%</span>
            <span className="text-xs text-slate-400">Relevance</span>
          </div>
        </div>
      </div>

      {/* Soft Skills Report */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 mt-6 dark:bg-gray-900/70">
        <h3 className="text-xl font-bold text-slate-100 mb-6 text-center">
          <Target size={16} style={{ color: "#10b981", marginRight: 8, display: "inline" }} />
          Soft Skills & Delivery
        </h3>
        <div className="flex flex-col gap-8 items-center">
          <div className="w-full max-w-[500px]" style={{ height: 300 }}>
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
            <div className="bg-indigo-500/10 border border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Confidence</span>
              <span className="text-xl font-bold text-slate-100">{avgConfidence}%</span>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Tone Positivity</span>
              <span className="text-xl font-bold text-slate-100">{avgTone}%</span>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 py-3 px-6 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total Hesitations</span>
              <span className="text-xl font-bold text-slate-100">{totalHesitations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Concepts */}
      {results.weakConcepts?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 dark:bg-gray-900/70">
          <h3 className="text-base font-bold mb-4 text-slate-100">
            <AlertTriangle
              size={16}
              style={{ color: "#f59e0b", marginRight: 8, display: "inline" }}
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
        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden dark:bg-gray-900/70">
          <div className="py-4 px-6 flex justify-between items-center cursor-pointer hover:bg-white/5" onClick={() => toggleCard(idx)}>
            <span className="font-semibold text-slate-100 flex-1">
              Q{idx + 1}. {a.questionText}
            </span>
            <span
              className="font-bold text-lg"
              style={{ color: getScoreColor(a.scores?.technical || 0) }}
            >
              {a.scores?.technical || 0}%
            </span>
            {expandedCards[idx] ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </div>
          {expandedCards[idx] && (
            <div className="px-6 pb-6 border-t border-white/5 pt-4">
              <p className="text-slate-400 leading-relaxed my-4 text-sm">
                <strong className="text-slate-200">Your Answer:</strong>{" "}
                {a.transcript || "No answer submitted"}
              </p>
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
      <div className="flex justify-center gap-4 mt-4 flex-wrap">
        <button
          className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:opacity-90"
          onClick={() => navigate("/mock-interview")}
        >
          <RefreshCw size={16} /> New Interview
        </button>
        <button
          className="bg-white/5 text-indigo-300 border border-indigo-500/30 py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:bg-indigo-500/10"
          onClick={() => navigate("/mock-interview/history")}
        >
          <ArrowLeft size={16} /> View History
        </button>
        <button
          className="bg-white/5 text-indigo-300 border border-indigo-500/30 py-3 px-8 rounded-full font-bold cursor-pointer flex items-center gap-2 hover:bg-indigo-500/10"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
          <Footer />
    </div>
  );
};

export default InterviewResults;
