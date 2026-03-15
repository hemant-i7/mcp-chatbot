/** Ingest PDFs: chunk → embed (Gemini) → MongoDB. Run: PDF_DIR=/path/to/pdfs MONGODB_URI=... GEMINI_API_KEY=... node scripts/ingest.js */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { embed } = require("../lib/rag");

const PDF_DIR = process.env.PDF_DIR || "/Users/hemantkadam/Downloads/Shreechem-data";
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    start = end - (end < text.length ? CHUNK_OVERLAP : 0);
  }
  return chunks.filter((c) => c.length > 50);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env.local");
    process.exit(1);
  }
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    tls: true,
  });
  await client.connect();
  const coll = client.db("shreechem").collection("chunks");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  let total = 0;
  for (const file of files) {
    const buf = fs.readFileSync(path.join(PDF_DIR, file));
    const parser = new PDFParse({ data: buf });
    const textResult = await parser.getText();
    await parser.destroy();
    const text = textResult.text;
    const numpages = textResult.pages?.length ?? 1;
    const chunks = chunkText(text);
    const perPage = Math.max(1, Math.ceil(chunks.length / numpages));
    for (let i = 0; i < chunks.length; i++) {
      const page = Math.floor(i / perPage) + 1;
      const embedding = await embed(chunks[i], genAI);
      await coll.insertOne({ content: chunks[i], embedding, source: file, page });
      total++;
      if (total % 50 === 0) process.stdout.write(`\rIngested ${total} chunks...`);
    }
  }
  await client.close();
  console.log(`\nDone. Ingested ${total} chunks from ${files.length} PDFs.`);
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.message?.includes("SSL") || err.message?.includes("tlsv1")) {
    console.error("\nTip: Add your IP in MongoDB Atlas → Network Access → Add IP Address (or 0.0.0.0/0 for testing)");
  }
  process.exit(1);
});
