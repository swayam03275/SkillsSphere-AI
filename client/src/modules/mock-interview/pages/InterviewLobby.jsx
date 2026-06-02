import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import CameraCheck from "../components/CameraCheck";
import PersonaSelector from "../components/PersonaSelector";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";
import { Play, GraduationCap, History, Loader2, Sparkles, ArrowLeft, Brain, Briefcase, Zap, ChevronRight } from "lucide-react";
import { getTopics, startSession } from "../services/interviewService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

import logger from "../../../utils/logger";

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const InterviewLobby = () => {
  useDocumentTitle("Mock Interview");
  const navigate = useNavigate();
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("friendly");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await getTopics();
        const topicList = res.data || [];
        setTopics(topicList);
        if (topicList.length > 0) {
          setTopic(topicList[0].topic);
        }
      } catch (err) {
        setError("Failed to load interview topics. Please try again.");
        logger.error("[InterviewLobby] Error fetching topics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const handleStartInterview = async () => {
    if (!topic) return;
    setStarting(true);
    setError(null);

    try {
      const res = await startSession(topic, difficulty, selectedPersona);
      const sessionId = res.data?.sessionId;
      if (sessionId) {
        navigate(`/mock-interview/${sessionId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to start interview. Please try again.");
      logger.error("[InterviewLobby] Error starting session:", err);
    } finally {
      setStarting(false);
    }
  };

  const topicOptions = topics.map((t) => ({
    value: t.topic,
    label: `${t.topic.charAt(0).toUpperCase() + t.topic.slice(1)} (${t.questionCount} in bank)`,
  }));

  return (
    <div className="min-h-screen bg-bg-main text-text-main overflow-hidden relative pt-24">
      {/* Premium Animated Backgrounds */}
      <div className="pointer-events-none absolute -left-28 top-12 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-600/15 animate-pulse" />
      <div className="pointer-events-none absolute -right-24 top-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/20 blur-[120px] dark:bg-violet-600/15 animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/20 blur-[120px] dark:bg-emerald-600/15" />

      <Navbar />

      <main className="relative z-10 pt-8 pb-12 max-w-[1200px] mx-auto px-4 sm:px-8 min-h-[calc(100vh-80px)] flex flex-col gap-10">
        
        {/* Floating Icons Background */}
        <div className="absolute top-24 left-[2%] xl:-left-[5%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity animate-[float_6s_ease-in-out_infinite]">
          <Briefcase size={28} className="text-purple-500" />
        </div>
        <div className="absolute top-36 right-[2%] xl:-right-[5%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity animate-[float_7s_ease-in-out_infinite_reverse]">
          <Brain size={28} className="text-indigo-500" />
        </div>

        {/* Back to Dashboard Link */}
        <div className="-mt-4 mb-2 flex">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <header className="mb-8 text-center max-w-3xl mx-auto relative pt-4 animate-[fadeIn_0.8s_ease-out] z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-bold tracking-wide uppercase mb-4">
            <Sparkles size={16} /> Cognitive Evaluation Engine
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent mb-6 drop-shadow-sm leading-tight">
            Mock Interview
          </h1>
          <p className="text-text-muted max-w-2xl mx-auto text-lg leading-relaxed font-medium">
            Configure your simulator. The AI interviewer dynamically adapts its questions based on your real-time performance and chosen persona.
          </p>
        </header>

        {error && (
          <div className="max-w-2xl mx-auto w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-center backdrop-blur-md font-medium shadow-lg animate-[shake_0.5s_ease-in-out]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Device & Focus Area */}
          <div className="lg:col-span-7 flex flex-col gap-6 w-full h-full animate-[slideRight_0.6s_ease-out]">
            <CameraCheck onStreamReady={setIsMediaReady} />
            
            {/* Focus Area Card */}
            <div className="group relative rounded-3xl bg-white dark:bg-surface p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(99,102,241,0.1)] dark:hover:border-indigo-500/30">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-slate-900 dark:text-white">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400">
                    <GraduationCap size={22} />
                  </span>
                  Interview Domain
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Technical Subject</label>
                    {loading ? (
                      <div className="h-[42px] bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                    ) : (
                      <Select
                        options={topicOptions}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-900 border-border rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Difficulty Base</label>
                    <Select
                      options={DIFFICULTY_LEVELS}
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-900 border-border rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
                  <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                    The engine selects 5 scenario-based questions. Question difficulty scales dynamically based on your accuracy in previous answers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Persona & Start Action */}
          <div className="lg:col-span-5 flex flex-col gap-6 w-full h-full animate-[slideLeft_0.6s_ease-out]">
            <PersonaSelector 
              selectedPersona={selectedPersona} 
              onSelect={setSelectedPersona} 
            />

            {/* Launch Console */}
            <div className="relative p-1 rounded-[2rem] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)] group mt-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500 rounded-[2rem]" />
              
              <div className="relative bg-white dark:bg-surface backdrop-blur-2xl rounded-[1.85rem] p-6 sm:p-8 flex flex-col items-center justify-center border border-gray-200 dark:border-border">
                {!isMediaReady && (
                  <div className="mb-6 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Awaiting Hardware Access
                  </div>
                )}
                
                <Button
                  variant="primary"
                  size="lg"
                  className={`w-full py-5 text-lg font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                    !isMediaReady || starting || loading || !topic
                      ? "opacity-60 cursor-not-allowed grayscale" 
                      : "shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.7)] hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-r from-indigo-600 to-purple-600 border-none"
                  }`}
                  disabled={!isMediaReady || starting || loading || !topic}
                  onClick={handleStartInterview}
                >
                  {starting ? (
                    <span className="flex items-center gap-2 text-white">
                      <Loader2 className="animate-spin" size={24} /> Initiating Link...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-white">
                      <Play fill="currentColor" size={20} /> Initialize Session <ChevronRight size={20} className="opacity-70" />
                    </span>
                  )}
                </Button>

                <button
                  className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-transparent border-none cursor-pointer group/btn"
                  onClick={() => navigate("/mock-interview/history")}
                >
                  <History size={16} className="group-hover/btn:-rotate-12 transition-transform" /> 
                  <span className="border-b border-transparent group-hover/btn:border-current transition-colors">Access Performance History</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
          <Footer />
    </div>
  );
};

export default InterviewLobby;
