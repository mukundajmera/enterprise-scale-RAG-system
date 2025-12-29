# DocuRAG Worker - Document Ingestion Pipeline
# Uses LlamaIndex for document processing

import os
import io
import logging
from typing import Dict, Any
import httpx
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from google.cloud import storage as gcs

from llama_index.core import Document, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.vertex import VertexTextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import uuid

from config import (
    GCP_PROJECT_ID,
    GCS_CREDENTIALS,
    QDRANT_URL,
    QDRANT_API_KEY,
    VERTEX_AI_LOCATION,
    NEXTJS_API_URL,
    WORKER_SECRET,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_DIMENSIONS
)

logger = logging.getLogger(__name__)

# Initialize clients
gcs_client = None
qdrant_client = None
embed_model = None


def get_gcs_client():
    """Get or create GCS client"""
    global gcs_client
    if gcs_client is None:
        if GCS_CREDENTIALS:
            import json
            from google.oauth2 import service_account
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(GCS_CREDENTIALS)
            )
            gcs_client = gcs.Client(project=GCP_PROJECT_ID, credentials=credentials)
        else:
            gcs_client = gcs.Client(project=GCP_PROJECT_ID)
    return gcs_client


def get_qdrant_client():
    """Get or create Qdrant client"""
    global qdrant_client
    if qdrant_client is None:
        qdrant_client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY
        )
    return qdrant_client


def get_embed_model():
    """Get or create embedding model"""
    global embed_model
    if embed_model is None:
        embed_model = VertexTextEmbedding(
            model_name="text-embedding-004",
            project=GCP_PROJECT_ID,
            location=VERTEX_AI_LOCATION
        )
        Settings.embed_model = embed_model
    return embed_model


def get_collection_name(user_id: str) -> str:
    """Get collection name for user"""
    return f"user_{user_id.replace('-', '_')}"


async def ensure_collection(user_id: str):
    """Ensure Qdrant collection exists for user"""
    client = get_qdrant_client()
    collection_name = get_collection_name(user_id)
    
    collections = client.get_collections()
    exists = any(c.name == collection_name for c in collections.collections)
    
    if not exists:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSIONS,
                distance=Distance.COSINE
            )
        )
        logger.info(f"Created collection: {collection_name}")


async def update_document_status(
    doc_id: str,
    status: str,
    chunk_count: int = None,
    error_message: str = None
):
    """Update document status in the Next.js app"""
    if not NEXTJS_API_URL:
        logger.warning("NEXTJS_API_URL not configured, skipping status update")
        return
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {}
            if WORKER_SECRET:
                headers["X-Worker-Secret"] = WORKER_SECRET
            
            payload = {
                "document_id": doc_id,
                "status": status
            }
            if chunk_count is not None:
                payload["chunk_count"] = chunk_count
            if error_message:
                payload["error_message"] = error_message
            
            response = await client.post(
                f"{NEXTJS_API_URL}/api/process",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to update document status: {response.text}")
                
    except Exception as e:
        logger.error(f"Error updating document status: {e}")


def download_from_gcs(storage_url: str) -> bytes:
    """Download file from GCS"""
    # Parse gs:// URL
    if not storage_url.startswith("gs://"):
        raise ValueError("Invalid storage URL format")
    
    parts = storage_url[5:].split("/", 1)
    bucket_name = parts[0]
    blob_name = parts[1] if len(parts) > 1 else ""
    
    client = get_gcs_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    
    return blob.download_as_bytes()


def extract_text_from_pdf(content: bytes) -> list[dict]:
    """Extract text from PDF file with proper error handling"""
    try:
        pdf_reader = PdfReader(io.BytesIO(content))
        
        # Check if PDF is encrypted
        if pdf_reader.is_encrypted:
            try:
                # Try to decrypt with empty password
                pdf_reader.decrypt("")
            except Exception:
                raise ValueError("PDF is password-protected and cannot be processed")
        
        pages = []
        for page_num, page in enumerate(pdf_reader.pages, 1):
            try:
                text = page.extract_text() or ""
                if text.strip():
                    pages.append({
                        "text": text,
                        "page": page_num
                    })
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num}: {e}")
                continue
        
        if not pages:
            raise ValueError("No text content could be extracted from the PDF")
        
        return pages
        
    except PdfReadError as e:
        raise ValueError(f"Invalid or corrupted PDF file: {e}")
    except Exception as e:
        if "password" in str(e).lower() or "encrypted" in str(e).lower():
            raise ValueError("PDF is password-protected and cannot be processed")
        raise ValueError(f"Failed to process PDF: {e}")


def extract_text_from_txt(content: bytes) -> list[dict]:
    """Extract text from TXT/MD file"""
    text = content.decode("utf-8", errors="ignore")
    return [{"text": text, "page": 1}]


async def process_document(
    doc_id: str,
    storage_url: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Main document processing pipeline:
    1. Download document from GCS
    2. Extract text based on file type
    3. Chunk the document
    4. Generate embeddings
    5. Store in Qdrant
    6. Update status in Next.js
    """
    try:
        logger.info(f"Starting processing for document {doc_id}")
        
        # Download document
        content = download_from_gcs(storage_url)
        logger.info(f"Downloaded document: {len(content)} bytes")
        
        # Determine file type and extract text
        if storage_url.lower().endswith('.pdf'):
            pages = extract_text_from_pdf(content)
        else:
            # Assume text-based file (txt, md, etc.)
            pages = extract_text_from_txt(content)
        
        if not pages:
            raise ValueError("No text content extracted from document")
        
        logger.info(f"Extracted {len(pages)} pages")
        
        # Create LlamaIndex documents with metadata
        documents = [
            Document(
                text=page["text"],
                metadata={
                    "doc_id": doc_id,
                    "user_id": user_id,
                    "page": page["page"]
                }
            )
            for page in pages
        ]
        
        # Chunk documents
        parser = SentenceSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        nodes = parser.get_nodes_from_documents(documents)
        logger.info(f"Created {len(nodes)} chunks")
        
        # Get embedding model
        embed_model = get_embed_model()
        
        # Ensure collection exists
        await ensure_collection(user_id)
        
        # Generate embeddings and store in Qdrant
        client = get_qdrant_client()
        collection_name = get_collection_name(user_id)
        
        points = []
        for i, node in enumerate(nodes):
            # Generate embedding
            embedding = embed_model.get_text_embedding(node.text)
            
            # Create point
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "doc_id": doc_id,
                    "chunk_id": point_id,
                    "content": node.text,
                    "page": node.metadata.get("page"),
                    "chunk_index": i
                }
            ))
            
            # Batch insert every 100 points
            if len(points) >= 100:
                client.upsert(
                    collection_name=collection_name,
                    points=points
                )
                points = []
        
        # Insert remaining points
        if points:
            client.upsert(
                collection_name=collection_name,
                points=points
            )
        
        logger.info(f"Stored {len(nodes)} vectors in Qdrant")
        
        # Update document status
        await update_document_status(doc_id, "ready", chunk_count=len(nodes))
        
        return {
            "chunk_count": len(nodes),
            "collection": collection_name
        }
        
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {e}")
        await update_document_status(doc_id, "failed", error_message=str(e))
        raise
