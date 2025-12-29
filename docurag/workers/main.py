# DocuRAG Worker Service
# FastAPI-based document processing service using LlamaIndex

from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import logging
from contextlib import asynccontextmanager

from ingestion import process_document
from retrieval import query_documents

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Starting DocuRAG Worker Service")
    yield
    logger.info("Shutting down DocuRAG Worker Service")


app = FastAPI(
    title="DocuRAG Worker Service",
    description="Document processing and RAG query service",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    """Request model for document processing"""
    document_id: str
    storage_url: str
    user_id: str


class ProcessResponse(BaseModel):
    """Response model for document processing"""
    status: str
    chunks: Optional[int] = None
    error: Optional[str] = None


class QueryRequest(BaseModel):
    """Request model for RAG queries"""
    query: str
    user_id: str
    document_ids: List[str] = []


class QueryResponse(BaseModel):
    """Response model for RAG queries"""
    answer: str
    sources: List[dict]
    confidence: str
    tokens: int


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    version: str


def verify_worker_secret(x_worker_secret: Optional[str] = Header(None)) -> bool:
    """Verify the worker secret for authentication"""
    expected_secret = os.getenv("WORKER_SECRET")
    if expected_secret and x_worker_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", version="1.0.0")


@app.post("/process", response_model=ProcessResponse)
async def process(
    req: ProcessRequest,
    background_tasks: BackgroundTasks,
    x_worker_secret: Optional[str] = Header(None)
):
    """
    Process uploaded document:
    - Download from GCS
    - Extract text
    - Chunk the document
    - Generate embeddings
    - Store in Qdrant
    """
    verify_worker_secret(x_worker_secret)
    
    try:
        logger.info(f"Processing document {req.document_id} for user {req.user_id}")
        
        # Process document (can be run in background for large files)
        result = await process_document(
            doc_id=req.document_id,
            storage_url=req.storage_url,
            user_id=req.user_id
        )
        
        logger.info(f"Document {req.document_id} processed successfully with {result['chunk_count']} chunks")
        
        return ProcessResponse(
            status="success",
            chunks=result["chunk_count"]
        )
        
    except Exception as e:
        logger.error(f"Error processing document {req.document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    x_worker_secret: Optional[str] = Header(None)
):
    """
    RAG query:
    - Generate query embedding
    - Retrieve relevant chunks
    - Rerank results
    - Generate response with citations
    """
    verify_worker_secret(x_worker_secret)
    
    try:
        logger.info(f"Processing query for user {req.user_id}: {req.query[:50]}...")
        
        result = await query_documents(
            query=req.query,
            user_id=req.user_id,
            doc_ids=req.document_ids
        )
        
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            confidence=result["confidence"],
            tokens=result["tokens"]
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
