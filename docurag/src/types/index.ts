import { DocumentStatus } from '@/db/schema';

/**
 * API Response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Document types
 */
export interface DocumentInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
  errorMessage?: string;
}

export interface DocumentUploadRequest {
  file: File;
}

export interface DocumentUploadResponse {
  id: string;
  status: DocumentStatus;
  message: string;
}

/**
 * Query types
 */
export interface QuerySource {
  docId: string;
  chunkId: string;
  score: number;
  page?: number;
  text: string;
  fileName?: string;
}

export interface QueryRequest {
  query: string;
  documentIds?: string[];
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  confidence: 'High' | 'Medium' | 'Low';
  tokenCount: number;
  latencyMs: number;
}

export interface StreamingQueryMetadata {
  sources: QuerySource[];
  confidence: 'High' | 'Medium' | 'Low';
  tokenCount: number;
}

/**
 * User types
 */
export interface UserInfo {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  createdAt: string;
}

/**
 * Collection types
 */
export interface CollectionInfo {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  createdAt: string;
}

/**
 * Processing types
 */
export interface ProcessingRequest {
  documentId: string;
  storageUrl: string;
  userId: string;
}

export interface ProcessingResponse {
  status: 'success' | 'error';
  chunkCount?: number;
  error?: string;
}

/**
 * RAG Pipeline types
 */
export interface ChunkInfo {
  id: string;
  content: string;
  pageNumber?: number;
  chunkIndex: number;
  vectorId?: string;
}

export interface RetrievalResult {
  chunks: Array<{
    content: string;
    score: number;
    page?: number;
    docId: string;
    chunkId: string;
  }>;
  query: string;
}

/**
 * Form validation schemas
 */
export interface UploadFormData {
  file: File;
}

export interface QueryFormData {
  query: string;
  selectedDocuments: string[];
}

/**
 * UI State types
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

/**
 * Worker communication types
 */
export interface WorkerProcessRequest {
  document_id: string;
  storage_url: string;
  user_id: string;
}

export interface WorkerQueryRequest {
  query: string;
  user_id: string;
  document_ids: string[];
}

export interface WorkerQueryResponse {
  answer: string;
  sources: Array<{
    doc_id: string;
    page: number;
    score: number;
    text: string;
  }>;
  confidence: 'High' | 'Medium' | 'Low';
  tokens: number;
}

/**
 * Analytics types
 */
export interface UsageStats {
  totalDocuments: number;
  totalQueries: number;
  totalChunks: number;
  storageUsedBytes: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  answer?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  createdAt: string;
}
