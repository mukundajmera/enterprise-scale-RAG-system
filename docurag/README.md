# DocuRAG - Enterprise Document Intelligence Platform

<div align="center">
  <img src="public/assets/logo.svg" alt="DocuRAG Logo" width="120" height="120" />
  
  **Enterprise-Scale Retrieval-Augmented Generation System**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

---

## 📋 Overview

DocuRAG is a production-ready, enterprise-scale Retrieval-Augmented Generation (RAG) platform that allows users to:

- 📄 **Upload Documents**: Support for PDF, TXT, Markdown, and Word documents up to 50MB
- 💬 **Ask Questions**: Natural language queries with AI-powered answers
- 📚 **Source Citations**: Every answer includes clickable source citations with page numbers
- 🎯 **Confidence Scores**: Real-time confidence scoring for answer reliability
- 🔒 **Multi-tenant Security**: Complete user isolation with enterprise-grade security

### Key Features

| Feature | Description |
|---------|-------------|
| **Streaming Responses** | Real-time SSE streaming for smooth UX |
| **Hybrid Search** | Semantic + keyword search for better retrieval |
| **Hallucination Detection** | Built-in checks to ensure answers are grounded |
| **Rate Limiting** | Configurable limits per user (100 queries/hour) |
| **Cost Tracking** | Token usage monitoring per query |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  Dashboard  │ │   Upload    │ │    Query    │ │   Auth     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ /api/upload │ │/api/documents│ │  /api/query │ │/api/process│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐
│   Clerk      │  │   Neon       │  │   Python Worker (FastAPI)    │
│   (Auth)     │  │ (PostgreSQL) │  │  ┌────────────────────────┐  │
└──────────────┘  └──────────────┘  │  │   LlamaIndex Pipeline  │  │
                                     │  │   - Ingestion          │  │
         │                           │  │   - Retrieval          │  │
         ▼                           │  └────────────────────────┘  │
┌──────────────┐  ┌──────────────┐  └──────────────────────────────┘
│   GCS        │  │   Qdrant     │                │
│ (Storage)    │  │ (Vectors)    │◄───────────────┘
└──────────────┘  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Vertex AI   │
                  │  - Gemini    │
                  │  - Embeddings│
                  └──────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.1.3 (App Router, React 19)
- **Language**: TypeScript 5.7+ (strict mode)
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **Form Handling**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query 5.62

### Backend
- **Runtime**: Node.js 22 LTS
- **API**: Next.js API Routes
- **Database**: PostgreSQL 16 via Neon (serverless)
- **ORM**: Drizzle ORM 0.38+
- **Authentication**: Clerk v5.x
- **File Storage**: Google Cloud Storage
- **Caching/Rate Limiting**: Upstash Redis

### RAG Pipeline
- **Framework**: LlamaIndex 0.12+ (Python)
- **Vector Store**: Qdrant Cloud
- **Embeddings**: Vertex AI text-embedding-004 (768 dimensions)
- **LLM**: Gemini 1.5 Pro via Vertex AI

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- Python 3.11+ (for worker service)
- Docker (optional, for worker)
- Accounts for: Clerk, Neon, GCP, Qdrant Cloud, Upstash

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/docurag.git
cd docurag
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python worker dependencies
cd workers
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/docurag

# Google Cloud
GCP_PROJECT_ID=your-project-id
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GCS_BUCKET_NAME=your-bucket-name

# Qdrant
QDRANT_URL=https://xxx.qdrant.io:6333
QDRANT_API_KEY=xxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Worker
WORKER_URL=http://localhost:8000
```

### 4. Set Up the Database

```bash
npm run db:generate
npm run db:push
```

### 5. Run the Development Servers

```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Python worker (in workers directory)
cd workers
source venv/bin/activate
python main.py
```

Visit `http://localhost:3000` to see the application.

---

## 📁 Project Structure

```
docurag/
├── .env.example              # Environment template
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript config
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind CSS config
├── drizzle.config.ts         # Drizzle ORM config
├── middleware.ts             # Clerk auth middleware
├── components.json           # shadcn/ui config
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   ├── globals.css       # Global styles
│   │   ├── (auth)/           # Auth pages
│   │   ├── dashboard/        # Dashboard pages
│   │   └── api/              # API routes
│   │
│   ├── components/           # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── document-upload.tsx
│   │   ├── query-interface.tsx
│   │   └── source-citations.tsx
│   │
│   ├── lib/                  # Utility libraries
│   │   ├── db.ts             # Database client
│   │   ├── storage.ts        # GCS client
│   │   ├── embeddings.ts     # Vertex AI embeddings
│   │   ├── vector-store.ts   # Qdrant client
│   │   ├── llm.ts            # Gemini client
│   │   ├── rate-limit.ts     # Redis rate limiting
│   │   └── utils.ts          # Helper functions
│   │
│   ├── db/                   # Database
│   │   ├── schema.ts         # Drizzle schema
│   │   └── index.ts          # DB exports
│   │
│   ├── types/                # TypeScript types
│   ├── config/               # Configuration
│   └── hooks/                # React hooks
│
├── workers/                  # Python worker service
│   ├── Dockerfile            # Container config
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # FastAPI application
│   ├── ingestion.py          # Document processing
│   ├── retrieval.py          # RAG pipeline
│   └── config.py             # Configuration
│
└── tests/                    # Test files
```

---

## 🔧 API Reference

### Document Upload

```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "id": "uuid",
  "status": "processing",
  "message": "Document uploaded successfully"
}
```

### List Documents

```http
GET /api/documents?page=1&limit=20
```

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "fileName": "report.pdf",
      "status": "ready",
      "chunkCount": 42,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Query Documents

```http
POST /api/query
Content-Type: application/json

{
  "query": "What is the refund policy?",
  "documentIds": ["uuid1", "uuid2"]
}
```

**Response (SSE Stream):**
```
data: According to the document...
data: [Source 1] indicates...
data: __SOURCES__:[{"docId":"...","page":12,"score":0.92}]
data: __CONFIDENCE__:High
```

---

## 🔒 Security

### Authentication
- Clerk handles all authentication with OAuth support
- JWT tokens with 15-minute expiry
- Session management via secure cookies

### Authorization
- Multi-tenant isolation: users can only access their own documents
- Row-level security in database queries
- API route protection via Clerk middleware

### Data Protection
- Files encrypted at rest in GCS
- TLS 1.3 for all connections
- Signed URLs with 15-minute expiry for downloads
- No document content in logs

### Rate Limiting
- 10 uploads per hour per user
- 100 queries per hour per user
- Configurable via Upstash Redis

---

## 📊 Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Query Latency | < 3s p95 | Qdrant HNSW indexing |
| Document Processing | < 60s/MB | Parallel chunk processing |
| Lighthouse Score | > 90 | Next.js optimization |
| Bundle Size | < 250KB | Code splitting, tree shaking |

### Optimization Strategies
- Redis caching for embeddings (5min TTL)
- Database connection pooling via Neon
- Optimized vector indexes in Qdrant
- Image optimization via next/image

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/components/query-interface.test.tsx
```

---

## 🚢 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

```bash
vercel --prod
```

### Google Cloud Run (Worker)

```bash
cd workers

# Build and push Docker image
docker build -t gcr.io/YOUR_PROJECT/docurag-worker .
docker push gcr.io/YOUR_PROJECT/docurag-worker

# Deploy to Cloud Run
gcloud run deploy docurag-worker \
  --image gcr.io/YOUR_PROJECT/docurag-worker \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=xxx,QDRANT_URL=xxx"
```

---

## 📈 Monitoring

### Recommended Tools
- **Error Tracking**: Sentry
- **Logs**: Google Cloud Logging
- **Metrics**: Prometheus + Grafana
- **APM**: Datadog or New Relic

### Key Metrics to Monitor
- Query latency (p50, p95, p99)
- Document processing time
- Error rates by endpoint
- Token usage per user
- Vector database size

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- ESLint + Prettier for TypeScript
- Black + isort for Python
- Conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [LlamaIndex](https://www.llamaindex.ai/) for the RAG framework
- [Qdrant](https://qdrant.tech/) for the vector database
- [Clerk](https://clerk.com/) for authentication
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Vercel](https://vercel.com/) for hosting

---

<div align="center">
  <strong>Built with ❤️ for enterprise document intelligence</strong>
</div>
