import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { PlayCircle, PauseCircle, Save, ArrowLeft, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "../../../services/apiClient.js";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import Input from "../../../shared/components/Input";
import TextArea from "../../../shared/components/TextArea";
import { API_URL } from "../../../config/env";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";


const TutorInterviewConsole = () => {
  useDocumentTitle("Tutor Interview Console");
  const { id } = useParams(); // wait, react-router-dom provides this
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Feedback state
  const [overallScore, setOverallScore] = useState("");
  const [overallFeedback, setOverallFeedback] = useState("");
  const [answersFeedback, setAnswersFeedback] = useState({});
  const [activeAudio, setActiveAudio] = useState(null);
  
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const result = await apiRequest(`/api/interviews/tutor/sessions/${id}`, { token });
        if (result.success) {
          setSession(result.data);
          setOverallScore(result.data.tutorOverallScore || result.data.overallScore || "");
          setOverallFeedback(result.data.tutorOverallFeedback || "");
          
          const initialFeedback = {};
          result.data.answers.forEach(ans => {
            initialFeedback[ans.questionId] = {
              tutorScores: ans.tutorScores || { ...ans.scores },
              tutorFeedback: ans.tutorFeedback || ""
            };
          });
          setAnswersFeedback(initialFeedback);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchSession();
  }, [id, token]);

  const handleAnswerFeedbackChange = (questionId, field, value, subfield = null) => {
    setAnswersFeedback(prev => {
      const updated = { ...prev };
      if (!updated[questionId]) updated[questionId] = {};
      
      if (subfield) {
        updated[questionId][field] = {
          ...updated[questionId][field],
          [subfield]: value
        };
      } else {
        updated[questionId][field] = value;
      }
      return updated;
    });
  };

  const submitFeedback = async () => {
    const parsedOverallScore = parseInt(overallScore, 10);
    if (isNaN(parsedOverallScore) || parsedOverallScore < 0 || parsedOverallScore > 100) {
      toast.error("Please provide a valid overall score between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const feedbackData = {
        tutorOverallScore: parsedOverallScore,
        tutorOverallFeedback: overallFeedback,
        answersFeedback: Object.entries(answersFeedback).map(([qId, data]) => ({
          questionId: qId,
          ...data
        }))
      };
      
      const result = await apiRequest(`/api/interviews/tutor/sessions/${id}/feedback`, {
        method: "POST",
        token,
        body: feedbackData
      });
      
      if (result.success) {
        toast.success("Feedback saved successfully!");
      }
    } catch (err) {
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  const toggleAudio = (url) => {
    if (activeAudio?.src === url) {
      if (activeAudio.paused) activeAudio.play();
      else activeAudio.pause();
    } else {
      if (activeAudio) activeAudio.pause();
      const audio = new Audio(`${API_URL}/${url.replace(/\\/g, "/")}`);
      audio.play();
      setActiveAudio(audio);
    }
  };

  if (loading) return <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900"><Navbar /><div className="flex-1 pt-24 text-center">Loading session data...</div><Footer /></div>;
  if (!session || !session.userId || !session.answers) return <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900"><Navbar /><div className="flex-1 pt-24 text-center">Session data is incomplete or missing.</div><Footer /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 px-6 pb-6 pt-24 max-w-5xl mx-auto w-full space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <Link to="/tutor/interviews" className="flex items-center gap-2 text-indigo-600 mb-2 hover:text-indigo-500 transition-colors">
              <ArrowLeft size={16} /> Back to Interviews
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Interview Player Console</h1>
            <p className="text-slate-500">Evaluating {session.userId.name || 'Unknown User'}'s mock interview on {session.topic}</p>
          </div>
          <button 
            onClick={submitFeedback}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
          >
            <Save size={18} /> {saving ? "Saving..." : "Save Override"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-lg font-bold mb-4 border-b pb-2 dark:border-slate-700">Overall Grading</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-3">AI Overall Score: {session.overallScore}%</label>
                <Input 
                  id="overallScore"
                  label="Tutor Override Score (%)"
                  type="number" 
                  min="0" max="100"
                  value={overallScore}
                  onChange={(e) => setOverallScore(e.target.value)}
                />
              </div>
              
              <div>
                <TextArea 
                  id="overallFeedback"
                  label="Tutor Summary Feedback"
                  rows={4}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Provide overall impressions..."
                />
              </div>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <h3 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                <AlertCircle size={18} /> Weak Concepts Detected
              </h3>
              <ul className="list-disc pl-5 text-sm text-indigo-700 dark:text-indigo-400">
                {session.weakConcepts?.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Answer Transcripts & Scoring</h2>
            
            {session.answers.map((ans, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-lg">Q{idx + 1}: {ans.questionText}</h3>
                  {ans.audioPath && (
                    <button 
                      onClick={() => toggleAudio(ans.audioPath)}
                      className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      <PlayCircle size={16} /> Play Audio
                    </button>
                  )}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-300 italic mb-6 border-l-4 border-slate-300 dark:border-slate-600">
                  "{ans.transcript || "No transcript available."}"
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm mb-3">AI Scores</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Technical:</span> <span>{ans.scores?.technical}%</span></div>
                      <div className="flex justify-between"><span>Communication:</span> <span>{ans.scores?.communication}%</span></div>
                      <div className="flex justify-between"><span>Relevance:</span> <span>{ans.scores?.relevance}%</span></div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-indigo-600 dark:text-indigo-400">Tutor Overrides</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Technical:</span> 
                        <Input id={`tech-${ans.questionId}`} type="number" min="0" max="100" className="w-20" 
                          value={answersFeedback[ans.questionId]?.tutorScores?.technical || ""}
                          onChange={(e) => handleAnswerFeedbackChange(ans.questionId, "tutorScores", parseInt(e.target.value) || 0, "technical")}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Communication:</span> 
                        <Input id={`comm-${ans.questionId}`} type="number" min="0" max="100" className="w-20" 
                          value={answersFeedback[ans.questionId]?.tutorScores?.communication || ""}
                          onChange={(e) => handleAnswerFeedbackChange(ans.questionId, "tutorScores", parseInt(e.target.value) || 0, "communication")}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Relevance:</span> 
                        <Input id={`rel-${ans.questionId}`} type="number" min="0" max="100" className="w-20" 
                          value={answersFeedback[ans.questionId]?.tutorScores?.relevance || ""}
                          onChange={(e) => handleAnswerFeedbackChange(ans.questionId, "tutorScores", parseInt(e.target.value) || 0, "relevance")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t dark:border-slate-700">
                  <div className="mb-2 flex items-center gap-2 font-medium text-sm">
                    <MessageSquare size={16} /> Question Feedback
                  </div>
                  <TextArea 
                    id={`feedback-${ans.questionId}`}
                    rows={2}
                    placeholder="Specific feedback for this answer..."
                    value={answersFeedback[ans.questionId]?.tutorFeedback || ""}
                    onChange={(e) => handleAnswerFeedbackChange(ans.questionId, "tutorFeedback", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
          <Footer />
    </div>
  );
};

export default TutorInterviewConsole;
