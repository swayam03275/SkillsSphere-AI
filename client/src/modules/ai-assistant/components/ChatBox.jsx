import { useState } from "react";
import MessageBubble from "./MessageBubble";
import { API_URL } from "../../../config/env";

const ChatBox = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! How can I help you?" },
  ]);

  const [input, setInput] = useState("");

  // 🔥 NEW: backend call function
  const sendMessageToBackend = async (message) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error(error);
      return "Server error. Please try again.";
    }
  };

  // 🔥 UPDATED handleSend
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;

    // show user message
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage },
    ]);

    setInput("");

    // temporary loading message
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "Thinking..." },
    ]);

    // call backend
    const reply = await sendMessageToBackend(userMessage);

    // replace "Thinking..." with actual reply
    setMessages((prev) => [
      ...prev.slice(0, -1),
      { sender: "bot", text: reply },
    ]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "var(--surface)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px",
          backgroundColor: "var(--primary)",
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        AI Assistant
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "10px",
          overflowY: "auto",
          backgroundColor: "#f9fafb",
        }}
      >
        {messages.map((msg, index) => (
          <MessageBubble key={index} sender={msg.sender} text={msg.text} />
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid var(--border)",
          padding: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            outline: "none",
            color: "var(--text-main)",
            backgroundColor: "var(--surface)",
          }}
        />

        <button
          onClick={handleSend}
          style={{
            marginLeft: "8px",
            padding: "8px 12px",
            backgroundColor: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;