import { useState } from "react";
import ChatBox from "./ChatBox";
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button */}
      <div
        onClick={toggleChat}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "55px",
          height: "55px",
          borderRadius: "50%",
          backgroundColor: "var(--primary)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "var(--shadow-soft)",
          zIndex: 1000,
        }}
      >
        💬
      </div>

      {/* Chat Box */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "85px",
            right: "20px",
            width: "300px",
            height: "400px",
            zIndex: 1000,
          }}
        >
          <ChatBox />
        </div>
      )}
    </>
  );
};

export default ChatWidget;