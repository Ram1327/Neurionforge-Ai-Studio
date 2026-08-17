/**
 * @neurionforge/shared-types
 * API contract and shared data models for NeurionForge AI Studio
 */

// -----------------------------------------------------------------------------
// Inference Types
// -----------------------------------------------------------------------------

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  id?: string;
  created_at?: string;
  stats?: InferenceStats;
}

export interface InferenceRequest {
  model_id?: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  system_prompt?: string;
}

export interface InferenceStats {
  tokens_per_sec: number;
  ttft_ms: number;
  total_tokens: number;
  total_duration_sec: number;
}

export interface InferenceTokenChunk {
  token: string;
  finished: boolean;
  stats?: InferenceStats;
  error?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  model_id?: string;
}

// -----------------------------------------------------------------------------
// Model Metadata Types
// -----------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  filename: string;
  path: string;
  size_gb: number;
  quantization: string;
  context_length: number;
  loaded: boolean;
  gpu_layers?: number;
  is_mmproj?: boolean;
  last_used_at?: string;
}

export interface ModelLoadResponse {
  id: string;
  loaded: boolean;
  load_time_sec: number;
  message?: string;
}

export interface ModelDeleteResponse {
  id: string;
  deleted: boolean;
  message?: string;
}

// -----------------------------------------------------------------------------
// HuggingFace Hub & Download Types (Phase 1.1)
// -----------------------------------------------------------------------------

export interface HubModelResult {
  repo_id: string;
  author: string;
  model_name: string;
  downloads: number;
  likes: number;
  last_modified: string;
  tags: string[];
  pipeline_tag?: string;
  featured?: boolean;
}

export interface GGUFFileInfo {
  filename: string;
  rfilename: string;
  repo_id: string;
  size_gb: number;
  quantization: string;
  already_downloaded: boolean;
  is_mmproj?: boolean;
  url: string;
}

export type DownloadStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface DownloadJob {
  job_id: string;
  repo_id: string;
  filename: string;
  rfilename?: string;
  status: DownloadStatus;
  bytes_downloaded: number;
  total_bytes: number;
  percent: number;
  speed_mbps: number;
  eta_sec: number | null;
  started_at?: string;
  finished_at?: string;
  error?: string;
}

export interface StartDownloadRequest {
  repo_id: string;
  filename: string;
  rfilename?: string;
}

export interface StartDownloadResponse {
  job_id: string;
  status: DownloadStatus;
  message?: string;
}

// -----------------------------------------------------------------------------
// Fine-Tuning & Adapter Types
// -----------------------------------------------------------------------------

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface TrainRequest {
  base_model_id: string;
  dataset_id: string;
  adapter_name: string;
  lora_rank: number;
  lora_alpha: number;
  learning_rate: number;
  epochs: number;
  batch_size: number;
}

export interface TrainJob {
  job_id: string;
  status: JobStatus;
  base_model_id: string;
  dataset_id: string;
  adapter_name: string;
  current_step: number;
  total_steps: number;
  current_loss?: number;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface TrainLogMessage {
  job_id: string;
  step: number;
  total_steps: number;
  loss: number;
  epoch: number;
  elapsed_sec: number;
  status: JobStatus;
  message?: string;
}

export interface AdapterInfo {
  id: string;
  name: string;
  base_model_id: string;
  path: string;
  created_at: string;
  size_mb: number;
}

// -----------------------------------------------------------------------------
// Health & System Types
// -----------------------------------------------------------------------------

export interface SystemStatus {
  status: 'ok' | 'degraded' | 'error';
  models_dir: string;
  active_model?: string | null;
  is_model_loaded?: boolean;
  cpu_threads: number;
  gpu_available: boolean;
  total_ram_gb?: number;
  available_ram_gb?: number;
}
