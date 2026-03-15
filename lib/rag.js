/** RAG: MongoDB Vector Search + Gemini. ~35 lines. */
const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const EMBED_DIM = 768; // gemini-embedding-001 default; use 3072 if using embedding-001 full
const INDEX_NAME = "vector_index";

async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("shreechem").collection("chunks");
}

async function embed(text, genAI) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const r = await model.embedContent(text);
  return r.embedding?.values ?? [];
}

async function queryRAG(question, genAI) {
  const coll = await getDb();
  let docs = [];
  try {
    const qEmbed = await embed(question, genAI);
    docs = await coll
      .aggregate([
        {
          $vectorSearch: {
            queryVector: qEmbed,
            path: "embedding",
            numCandidates: 200,
            limit: 10,
            index: INDEX_NAME,
          },
        },
        { $project: { content: 1, source: 1, page: 1, _id: 0 } },
      ])
      .toArray();
  } catch (e) {
    if (process.env.DEBUG) console.error("[RAG] Vector search failed, using text fallback:", e.message);
  }
  if (docs.length === 0) {
    const stop = new Set(["what", "the", "for", "and", "with", "does", "have", "this", "that"]);
    const words = question.replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length >= 2 && !stop.has(w.toLowerCase()));
    const nums = question.match(/\d+/g) || [];
    const terms = [...new Set([...words, ...nums])].filter(Boolean);
    if (terms.length > 0) {
      docs = await coll
        .find({
          $or: terms.map((t) => ({ content: { $regex: t, $options: "i" } })),
        })
        .project({ content: 1, source: 1, page: 1 })
        .limit(10)
        .toArray();
    }
  }
  if (process.env.DEBUG) {
    console.error(`[RAG] Retrieved ${docs.length} chunks from ${docs.map((d) => d.source).join(", ")}`);
  }
  const context = docs.map((d) => `[${d.source} p.${d.page || "?"}] ${d.content}`).join("\n\n");
  const prompt = `You are Shreechem AI Assistant for Shreechem (pharma/chemical). Professional, helpful customer chat.

Rules:
- Reply in 2-4 short sentences. No tables, raw specs, batch numbers, or ppm values.
- Use product names as in docs (e.g. 934 P, not 934P). Be direct; avoid filler like "I can confirm", "high-quality".
- Give 1-2 safe details: form (powder/liquid), typical use, grade — then: "Contact Shreechem for full COA/specs."
- Warm and professional. Never quote lab data.

Context:\n${context || "(no context retrieved)"}\n\nQuestion: ${question}`;
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  const result = await model.generateContent(prompt);
  return result.response?.text() ?? "No response.";
}

module.exports = { queryRAG, embed, getDb };
