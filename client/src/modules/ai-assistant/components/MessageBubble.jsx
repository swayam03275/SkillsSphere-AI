const MessageBubble = ({ sender, text }) => {
  const isUser = sender === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          borderRadius: "12px",
          backgroundColor: isUser ? "#2563eb" : "#e5e7eb",
          color: isUser ? "#fff" : "#000",
          fontSize: "14px",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;