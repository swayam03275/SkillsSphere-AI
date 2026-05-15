import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CameraCheck from "../components/CameraCheck";
import PersonaSelector from "../components/PersonaSelector";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";
import { Play, GraduationCap, History, Loader2 } from "lucide-react";
import { getTopics, startSession } from "../services/interviewService";
import "../styles/mock-interview.css";

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const InterviewLobby = () => {
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
        console.error("[InterviewLobby] Error fetching topics:", err);
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
      const res = await startSession(topic, difficulty);
      const sessionId = res.data?.sessionId;
      if (sessionId) {
        navigate(`/mock-interview/${sessionId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to start interview. Please try again.");
      console.error("[InterviewLobby] Error starting session:", err);
    } finally {
      setStarting(false);
    }
  };

  const topicOptions = topics.map((t) => ({
    value: t.topic,
    label: `${t.topic.charAt(0).toUpperCase() + t.topic.slice(1)} (${t.questionCount} in bank)`,
  }));

  return (
    <div className="interview-lobby-container">
      <header className="lobby-header">
        <h1>Adaptive Cognitive Interview</h1>
        <p className="lobby-subtitle">
          Prepare for your dream role with our concept-aware AI interviewer. 
          The session will adapt to your performance in real-time.
        </p>
      </header>

      {error && (
        <div className="lobby-error">
          {error}
        </div>
      )}

      <div className="lobby-grid">
        <div className="lobby-column">
          <CameraCheck onStreamReady={setIsMediaReady} />
          
          <div className="setup-card">
            <h3 className="setup-card-title">
              <GraduationCap className="text-indigo-500" /> Focus Area
            </h3>
            <div className="focus-area-grid">
              <div className="field-group">
                <label className="field-label">Technical Domain</label>
                {loading ? (
                  <div className="loading-placeholder">Loading topics...</div>
                ) : (
                  <Select
                    options={topicOptions}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                )}
              </div>
              <div className="field-group">
                <label className="field-label">Difficulty</label>
                <Select
                  options={DIFFICULTY_LEVELS}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                />
              </div>
            </div>
            <p className="field-label" style={{ marginTop: "0.5rem", fontWeight: 500, textTransform: "none", letterSpacing: "normal" }}>
              Each session picks 5 random questions from the selected difficulty.
            </p>
          </div>
        </div>

        <div className="lobby-column">
          <PersonaSelector 
            selectedPersona={selectedPersona} 
            onSelect={setSelectedPersona} 
          />

          <div className="start-section">
            <Button
              variant="primary"
              size="lg"
              className="start-button"
              disabled={starting || loading}
              onClick={handleStartInterview}
            >
              {starting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 className="spin-icon" /> Preparing Session...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Play fill="currentColor" /> Start Interview Session
                </span>
              )}
            </Button>

            <button
              className="history-link"
              onClick={() => navigate("/mock-interview/history")}
            >
              <History size={16} /> View Interview History
            </button>
          </div>
          
          {!isMediaReady && (
            <p className="media-warning">
              Please enable Camera & Microphone to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewLobby;
