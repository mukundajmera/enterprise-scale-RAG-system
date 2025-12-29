# DocuRAG Worker - RAG Query Pipeline
# Uses LlamaIndex and Vertex AI for retrieval and generation

import os
import logging
from typing import Dict, Any, List

from llama_index.core import Settings
from llama_index.embeddings.vertex import VertexTextEmbedding
from llama_index.llms.vertex import Vertex
from qdrant_client import QdrantClient

from config import (
    GCP_PROJECT_ID,
    QDRANT_URL,
    QDRANT_API_KEY,
    VERTEX_AI_LOCATION,
    TOP_K,
    SIMILARITY_THRESHOLD,
    EMBEDDING_DIMENSIONS
)

logger = logging.getLogger(__name__)

# Initialize clients
qdrant_client = None
embed_model = None
llm = None


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


def get_llm():
    """Get or create LLM"""
    global llm
    if llm is None:
        llm = Vertex(
            model="gemini-1.5-pro",
            project=GCP_PROJECT_ID,
            location=VERTEX_AI_LOCATION,
            temperature=0.2,
            max_tokens=2048
        )
        Settings.llm = llm
    return llm


def get_collection_name(user_id: str) -> str:
    """Get collection name for user"""
    return f"user_{user_id.replace('-', '_')}"


async def query_documents(
    query: str,
    user_id: str,
    doc_ids: List[str] = None
) -> Dict[str, Any]:
    """
    RAG query pipeline:
    1. Generate query embedding
    2. Search Qdrant for similar vectors
    3. Filter by score threshold
    4. Generate response with LLM
    5. Return answer with sources
    """
    try:
        logger.info(f"Processing query for user {user_id}")
        
        # Get embedding model
        embed_model = get_embed_model()
        
        # Generate query embedding
        query_embedding = embed_model.get_query_embedding(query)
        
        # Search Qdrant
        client = get_qdrant_client()
        collection_name = get_collection_name(user_id)
        
        # Build filter if document IDs provided
        search_filter = None
        if doc_ids and len(doc_ids) > 0:
            from qdrant_client.models import Filter, FieldCondition, MatchAny
            search_filter = Filter(
                should=[
                    FieldCondition(key="doc_id", match=MatchAny(any=doc_ids))
                ]
            )
        
        # Perform search
        try:
            results = client.search(
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=TOP_K,
                score_threshold=SIMILARITY_THRESHOLD,
                query_filter=search_filter,
                with_payload=True
            )
        except Exception as e:
            if "not found" in str(e).lower():
                # Collection doesn't exist - no documents uploaded yet
                return {
                    "answer": "No documents have been uploaded yet. Please upload some documents first.",
                    "sources": [],
                    "confidence": "Low",
                    "tokens": 0
                }
            raise
        
        if not results:
            return {
                "answer": "I couldn't find any relevant information in your documents to answer this question. Please try rephrasing your question or upload more relevant documents.",
                "sources": [],
                "confidence": "Low",
                "tokens": 0
            }
        
        logger.info(f"Found {len(results)} relevant chunks")
        
        # Format sources
        sources = []
        for result in results:
            sources.append({
                "doc_id": result.payload.get("doc_id"),
                "page": result.payload.get("page"),
                "score": result.score,
                "text": result.payload.get("content", "")[:300]
            })
        
        # Build context for LLM
        context_parts = []
        for i, result in enumerate(results):
            page_info = f" (Page {result.payload.get('page')})" if result.payload.get("page") else ""
            context_parts.append(f"[Source {i+1}]{page_info}:\n{result.payload.get('content', '')}")
        
        context = "\n\n".join(context_parts)
        
        # Generate response with LLM
        llm = get_llm()
        
        system_prompt = """You are a helpful document assistant that answers questions based solely on the provided context.

Instructions:
1. Only use information from the provided sources to answer questions
2. If the answer is not in the sources, clearly state that you cannot find the information
3. Cite sources using [Source N] format when using information from them
4. Be concise but comprehensive
5. If sources conflict, mention the discrepancy
6. Never make up or hallucinate information"""

        user_prompt = f"""Context from documents:
{context}

Question: {query}

Please provide a clear, accurate answer based only on the sources above."""

        # Generate response
        response = llm.complete(f"{system_prompt}\n\n{user_prompt}")
        answer = response.text
        
        # Calculate confidence
        avg_score = sum(r.score for r in results) / len(results)
        if avg_score >= 0.85:
            confidence = "High"
        elif avg_score >= 0.7:
            confidence = "Medium"
        else:
            confidence = "Low"
        
        # Check for potential hallucination indicators
        answer_lower = answer.lower()
        if any(phrase in answer_lower for phrase in ["i cannot find", "not mentioned", "no information"]):
            confidence = "Low"
        
        # Estimate token count (rough approximation)
        tokens = len(answer.split()) + len(context.split())
        
        logger.info(f"Generated response with confidence: {confidence}")
        
        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "tokens": tokens
        }
        
    except Exception as e:
        logger.error(f"Error in query pipeline: {e}")
        raise
