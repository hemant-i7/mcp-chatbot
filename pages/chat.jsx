import { useState, useRef, useEffect } from "react";

const CHAT_API = "/api/chat";

const COLORS = {
  red: "#C8102E",
  redDark: "#A50E25",
  white: "#FFFFFF",
  bgLight: "#F6F8FA",
  grey: "#E4E7EC",
  text: "#1D2939",
  textMuted: "#667085",
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const aiContent = data?.output?.reply ?? data?.output ?? data?.reply ?? data?.message ?? JSON.stringify(data);
      setMessages((prev) => [...prev, { role: "assistant", content: aiContent }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: " + (err.message || "Failed to get response") },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-screen max-w-2xl mx-auto font-sans antialiased"
      style={{ background: COLORS.bgLight }}
    >
      <header
        className="flex-none px-5 py-4 flex items-center justify-between shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.redDark})`,
          color: COLORS.white,
        }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Shreechem AI Assistant</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: COLORS.bgLight }}>
        {messages.length === 0 && (
          <div
            className="max-w-[85%] rounded-2xl px-4 py-3"
            style={{ background: COLORS.grey, color: COLORS.text }}
          >
            Hi 👋 Welcome to Shreechem AI Assistant. How can I help you today?
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "rounded-br-md"
                  : "rounded-bl-md"
              }`}
              style={
                m.role === "user"
                  ? { background: COLORS.red, color: COLORS.white }
                  : { background: COLORS.grey, color: COLORS.text }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3 flex gap-1"
              style={{ background: COLORS.grey, color: COLORS.textMuted }}
            >
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="flex-none p-4 flex gap-3 items-center"
        style={{ background: COLORS.white, borderTop: "1px solid #E4E7EC", boxShadow: "0 -2px 10px rgba(0,0,0,0.04)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about products, COA, or bulk orders..."
          className="flex-1 px-5 py-3 rounded-full outline-none focus:ring-2 transition"
          style={{
            background: COLORS.bgLight,
            color: COLORS.text,
            border: "1px solid #E4E7EC",
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="w-12 h-12 rounded-full font-medium flex items-center justify-center transition hover:scale-105 hover:bg-[#A50E25] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: COLORS.red, color: COLORS.white }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
