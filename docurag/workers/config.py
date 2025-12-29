# DocuRAG Worker - Configuration
# Environment variables and configuration

import os
from typing import Optional

# GCP Configuration
GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "")
GCS_CREDENTIALS: Optional[str] = os.getenv("GCP_SERVICE_ACCOUNT_KEY")
VERTEX_AI_LOCATION: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")

# Qdrant Configuration
QDRANT_URL: str = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY")

# Next.js API Configuration
NEXTJS_API_URL: Optional[str] = os.getenv("NEXTJS_API_URL")
WORKER_SECRET: Optional[str] = os.getenv("WORKER_SECRET")

# RAG Configuration
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
TOP_K: int = int(os.getenv("TOP_K", "10"))
SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))
EMBEDDING_DIMENSIONS: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))

# Confidence thresholds (single source of truth - keep in sync with TypeScript constants.ts)
CONFIDENCE_HIGH_THRESHOLD: float = float(os.getenv("CONFIDENCE_HIGH_THRESHOLD", "0.85"))
CONFIDENCE_MEDIUM_THRESHOLD: float = float(os.getenv("CONFIDENCE_MEDIUM_THRESHOLD", "0.7"))

# Server Configuration
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

# Validate required configuration
def validate_config():
    """Validate that required configuration is present"""
    required = [
        ("GCP_PROJECT_ID", GCP_PROJECT_ID),
        ("QDRANT_URL", QDRANT_URL),
    ]
    
    missing = [name for name, value in required if not value]
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# Validate on import in production
if ENVIRONMENT == "production":
    validate_config()
