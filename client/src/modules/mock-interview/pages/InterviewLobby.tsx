
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
      } catch (err: any) {
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
    } catch (err: any) {
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6">
        
        {/* Floating Icons Background (managed in hero section now) */}

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
               <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Brain className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> COGNITIVE EVALUATION ENGINE
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Mock</span> Interview
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Configure your simulator. The AI interviewer dynamically adapts its questions based on your real-time performance and chosen persona.
            </p>
          </div>

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
                      // @ts-expect-error TODO: Fix pervasive types
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
                    {/* @ts-expect-error TODO: Fix pervasive types */}
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
                
                {/* @ts-expect-error TODO: Fix pervasive types */}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InterviewLobby;
