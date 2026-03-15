#!/usr/bin/env node
/** Test RAG chat from CLI: node scripts/chat-cli.js "your question" */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { queryRAG } = require("../lib/rag");

const question = process.argv[2] || "What products does Shreechem offer?";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

queryRAG(question, genAI)
  .then((reply) => console.log(reply))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
