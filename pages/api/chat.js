const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const { queryRAG } = MONGODB_URI ? require("../../lib/rag") : { queryRAG: null };
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function fallbackChat(message) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are Shreechem AI Assistant for Shreechem (pharma/chemical). Be helpful, professional." }],
        },
        contents: [{ parts: [{ text: message || "" }] }],
      }),
    }
  );
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text && data?.error) throw new Error(data.error.message || "Gemini API error");
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  try {
    const { message } = req.body || {};
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const text = MONGODB_URI && queryRAG
      ? await queryRAG(message || "", genAI)
      : await fallbackChat(message || "");
    res.status(200).json({ output: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
