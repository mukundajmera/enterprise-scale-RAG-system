# Enterprise-Scale RAG System

This repository contains **DocuRAG** - an enterprise-scale Retrieval-Augmented Generation (RAG) platform built with modern technologies.

## Quick Start

Navigate to the `docurag` directory for the complete application:

```bash
cd docurag
npm install
npm run dev
```

See [docurag/README.md](./docurag/README.md) for detailed documentation.

## Features

- 📄 Multi-format document upload (PDF, TXT, MD, DOC, DOCX)
- 💬 Natural language querying with AI-powered answers
- 📚 Source citations with page numbers
- 🎯 Confidence scoring
- 🔒 Enterprise security with multi-tenant isolation
- 🚀 Streaming responses with real-time updates

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Drizzle ORM, PostgreSQL (Neon)
- **AI/ML**: LlamaIndex, Vertex AI (Gemini 1.5 Pro, text-embedding-004)
- **Vector Store**: Qdrant Cloud
- **Auth**: Clerk
- **Storage**: Google Cloud Storage
- **Caching**: Upstash Redis

## License

MIT