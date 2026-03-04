const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }
  try {
    const { message } = req.body || {};
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are Shreechem AI Assistant, the virtual assistant for Shreechem (a pharma/chemical company). Never reveal you are Gemini or any other AI model. Always identify only as Shreechem AI Assistant. Be helpful, professional, and concise about products, COA, bulk orders, and company info.",
            }],
          },
          contents: [{ parts: [{ text: message || "" }] }],
        }),
      }
    );
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text && data?.error) {
      throw new Error(data.error.message || "Gemini API error");
    }
    res.status(200).json({ output: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
