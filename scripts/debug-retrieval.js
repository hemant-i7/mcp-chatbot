#!/usr/bin/env node
/** Debug RAG retrieval: node scripts/debug-retrieval.js "your question" */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { embed } = require("../lib/rag");

const question = process.argv[2] || "COA for product 934";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const coll = client.db("shreechem").collection("chunks");
  const count = await coll.countDocuments();
  console.log(`Total chunks in DB: ${count}\n`);

  if (count === 0) {
    console.log("No chunks. Run: npm run ingest");
    process.exit(1);
  }

  const qEmbed = await embed(question, genAI);
  const docs = await coll
    .aggregate([
      {
        $vectorSearch: {
          queryVector: qEmbed,
          path: "embedding",
          numCandidates: 200,
          limit: 5,
          index: "vector_index",
        },
      },
      { $project: { content: 1, source: 1, page: 1, score: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();

  console.log(`Retrieved ${docs.length} chunks for: "${question}"\n`);
  docs.forEach((d, i) => {
    console.log(`--- [${i + 1}] ${d.source} p.${d.page} score: ${d.score?.toFixed(4)} ---`);
    console.log(d.content?.slice(0, 300) + (d.content?.length > 300 ? "..." : ""));
    console.log("");
  });
  await client.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
