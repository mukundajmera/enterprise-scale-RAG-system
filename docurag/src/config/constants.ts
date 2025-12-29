/**
 * Application-wide constants
 */

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_DISPLAY = '50MB';

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md', '.doc', '.docx'] as const;

// Rate limiting
export const RATE_LIMITS = {
  UPLOAD: {
    requests: 10,
    window: '1h',
    windowMs: 60 * 60 * 1000,
  },
  QUERY: {
    requests: 100,
    window: '1h',
    windowMs: 60 * 60 * 1000,
  },
} as const;

// RAG configuration
export const RAG_CONFIG = {
  CHUNK_SIZE: 512, // tokens
  CHUNK_OVERLAP: 50, // tokens
  TOP_K: 10, // Number of chunks to retrieve
  SIMILARITY_THRESHOLD: 0.7,
  EMBEDDING_DIMENSIONS: 768, // text-embedding-004
} as const;

// Document statuses
export const DOCUMENT_STATUSES = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: '/api/upload',
  DOCUMENTS: '/api/documents',
  QUERY: '/api/query',
  PROCESS: '/api/process',
} as const;

// Status colors for UI
export const STATUS_COLORS = {
  uploading: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
} as const;

// Navigation items
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Upload', href: '/dashboard/upload', icon: 'Upload' },
  { label: 'Query', href: '/dashboard/query', icon: 'MessageSquare' },
] as const;
