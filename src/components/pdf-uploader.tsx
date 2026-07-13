"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, File as FileIcon, X, AlertCircle, CheckCircle2, RotateCcw, Loader2, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface Job {
  id: string;
  upload_id: string;
  chunk_start_page: number;
  chunk_end_page: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  status_message?: string;
  questions_generated: number;
  error_message: string | null;
  retry_count: number;
}

interface PdfUploaderProps {
  onExtractionComplete: (questionsCount: number) => void;
  className?: string;
  aiConfig?: Record<string, unknown>;
}

type UploadStatus = "idle" | "uploading" | "registering" | "processing_chunks" | "success" | "error";

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB
const MAX_FILE_SIZE_MB = 150;

/**
 * Get a fresh Firebase ID token for the current user.
 * Passing `true` forces a token refresh — important because the user may
 * have had the file picker open for a while, letting the 1-hour token expire.
 */
async function getFreshIdToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Not logged in. Please sign in and try again.");
  }
  // force=true refreshes the token if it has expired or is close to expiry
  return currentUser.getIdToken(true);
}

export function PdfUploader({ onExtractionComplete, className, aiConfig }: PdfUploaderProps) {
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMsg("");
    setUploadId(null);
    setJobs([]);
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateFile = (selectedFile: File): string | null => {
    if (!selectedFile.type.includes("pdf") && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      return "Unsupported file type. Please upload a valid PDF document.";
    }
    if (selectedFile.size === 0) {
      return "This PDF file is completely empty (0 bytes).";
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      return `File too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    resetState();
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("error");
      return;
    }
    setFile(selectedFile);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fetchJobs = useCallback(async (currentUploadId: string) => {
    if (!user) return;
    try {
      const token = await getFreshIdToken();
      const res = await fetch(`/api/jobs/status?uploadId=${currentUploadId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      } else if (res.status === 401 || res.status === 403) {
        setErrorMsg("Session expired or unauthorized. Please refresh.");
        setStatus("error");
      }
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    }
  }, [user]);

  useEffect(() => {
    if (!uploadId || status !== "processing_chunks") return;

    // Fetch immediately
    fetchJobs(uploadId);

    const interval = setInterval(() => {
      fetchJobs(uploadId);
    }, 4000);

    // Timeout check: if no jobs appear after 10 seconds, show error
    const timeout = setTimeout(() => {
      setJobs(prevJobs => {
        if (prevJobs.length === 0) {
          setErrorMsg("Processing never started. The server failed to create background jobs.");
          setStatus("error");
        }
        return prevJobs;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [uploadId, status, user, fetchJobs]);

  const isProcessingRef = useRef(false);

  // Check for completion
  useEffect(() => {
    if (jobs.length > 0 && status === "processing_chunks") {
      const completedJobs = jobs.filter(j => j.status === 'completed');
      if (completedJobs.length === jobs.length) {
        setStatus("success");
        const totalQuestions = jobs.reduce((sum, j) => sum + (j.questions_generated || 0), 0);
        onExtractionComplete(totalQuestions);
      }
    }
  }, [jobs, status, onExtractionComplete]);

  const startProcessingLoop = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log("[Orchestrator] Starting chunk processing loop...");
    
    while (isProcessingRef.current) {
      try {
        const token = await getFreshIdToken();
        const res = await fetch("/api/process-next", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ config: aiConfig })
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data.message === 'No waiting jobs found.') {
            console.log("[Orchestrator] No more waiting jobs. Stopping loop.");
            isProcessingRef.current = false;
            break;
          }
          console.log("[Orchestrator] Chunk processed successfully. Moving to next immediately.");
          if (uploadId) fetchJobs(uploadId);
          continue; 
        }
        
        if (res.status === 202) {
          console.log("[Orchestrator] Job claimed by another worker. Retrying in 1s...");
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const errText = await res.text();
        console.error(`[Orchestrator] Server error calling process-next (Status ${res.status}):`, errText);
        await new Promise(r => setTimeout(r, 5000));
        
      } catch (err) {
        console.error("[Orchestrator] Network/Client error in processing loop:", err);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }, [aiConfig, uploadId, fetchJobs]);

  // Auto-resume on mount / state change
  useEffect(() => {
    if (isProcessingRef.current || !user) return;
    const hasWaitingJobs = jobs.some(j => j.status === 'waiting');
    if (hasWaitingJobs || status === "processing_chunks") {
      startProcessingLoop();
    }
  }, [jobs, status, user, startProcessingLoop]);

  const handleUpload = async () => {
    if (!file || !user) {
      setErrorMsg("Please select a file and ensure you are logged in.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      let idToken: string;
      try {
        idToken = await getFreshIdToken();
      } catch (tokenErr: unknown) {
        const msg = tokenErr instanceof Error ? tokenErr.message : "Failed to get auth token.";
        throw new Error(msg);
      }

      const urlRes = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/pdf",
          fileSize: file.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Failed to get upload URL.");
      const { uploadUrl, storagePath } = urlData;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed with status ${xhr.status}. Try again.`));
        };

        xhr.onerror = () => reject(new Error("Network error occurred during upload. Check your connection."));
        xhr.onabort = () => reject(new Error("Upload cancelled by user."));

        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
        xhr.send(file);
      });

      setStatus("registering");
      const idToken2 = await getFreshIdToken();

      const registerRes = await fetch("/api/register-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken2}`,
        },
        body: JSON.stringify({ storagePath }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.error || "Failed to register upload.");

      setUploadId(registerData.uploadId);
      setStatus("processing_chunks");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "Upload cancelled by user.") {
        setErrorMsg(message);
        setStatus("error");
      }
    } finally {
      xhrRef.current = null;
    }
  };

  const handleCancel = () => {
    if (xhrRef.current && status === "uploading") {
      xhrRef.current.abort();
    }
    resetState();
  };

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const renderJobProgress = () => {
    if (jobs.length === 0) {
      return (
        <div className="flex items-center justify-center gap-3 py-6 text-blue-400 font-medium">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Waiting for background jobs to appear...</span>
        </div>
      );
    }

    const completed = jobs.filter(j => j.status === 'completed').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const total = jobs.length;
    const percent = Math.round((completed / total) * 100);

    return (
      <div className="space-y-4 w-full mt-4">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-foreground">
            Processing Book ({total} parts)
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>

        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden flex">
          <div
            className="bg-green-500 h-2 transition-all duration-500 ease-out"
            style={{ width: `${(completed / total) * 100}%` }}
          />
          <div
            className="bg-blue-500 h-2 transition-all duration-500 ease-out animate-pulse"
            style={{ width: `${(processing / total) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/5 p-2 rounded text-center">
            <div className="text-muted-foreground">Completed</div>
            <div className="font-bold text-green-400">{completed}</div>
          </div>
          <div className="bg-white/5 p-2 rounded text-center">
            <div className="text-muted-foreground">Processing</div>
            <div className="font-bold text-blue-400">{processing}</div>
          </div>
          <div className="bg-white/5 p-2 rounded text-center">
            <div className="text-muted-foreground">Waiting</div>
            <div className="font-bold text-zinc-400">{total - completed - processing - failed}</div>
          </div>
          <div className="bg-white/5 p-2 rounded text-center">
            <div className="text-muted-foreground">Failed</div>
            <div className="font-bold text-red-400">{failed}</div>
          </div>
        </div>

        {failed > 0 && (
          <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded border border-red-500/20">
            {failed} part(s) failed. The orchestrator will automatically retry them up to 3 times.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {jobs.filter(j => j.status === 'processing').map(j => (
            <div key={j.id} className="text-xs text-blue-400 bg-blue-500/10 p-3 rounded flex items-center gap-3 border border-blue-500/20">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="truncate font-medium">Pages {j.chunk_start_page}-{j.chunk_end_page}: {j.status_message || 'Processing...'}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-4 mt-2"
        >
          {detailsExpanded ? "Hide Details" : "View Detailed Status"}
        </button>

        {detailsExpanded && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2 rounded-lg bg-background/50 border border-white/10 p-3">
            {jobs.map(j => (
              <div key={j.id} className="text-xs flex items-start justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">Pages {j.chunk_start_page}-{j.chunk_end_page}</span>
                  <span className="text-muted-foreground">{j.status_message || (j.status === 'waiting' ? 'Queued' : j.status)}</span>
                  {j.error_message && <span className="text-red-400 truncate max-w-[200px]" title={j.error_message}>{j.error_message}</span>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("px-2 py-0.5 rounded-full",
                    j.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    j.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    j.status === 'waiting' ? 'bg-white/10 text-zinc-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {j.status}
                  </span>
                  {j.questions_generated > 0 && <span className="text-green-400">+{j.questions_generated} Qs</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-full max-w-3xl mx-auto space-y-4", className)}>
      {/* Upload Zone */}
      {status === "idle" && !file && (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer flex flex-col items-center gap-4",
            isDragActive ? "border-primary bg-primary/10" : "border-white/20 bg-background/50 hover:bg-white/5 hover:border-white/40"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-2" />
          <div>
            <p className="text-lg font-semibold text-foreground">Drag &amp; drop large PDF book here</p>
            <p className="text-sm text-muted-foreground mt-1">Up to {MAX_FILE_SIZE_MB} MB · Processes in parallel background chunks</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
        </div>
      )}

      {/* File Selected / Active State */}
      {(file || status !== "idle") && (
        <div className="bg-background/80 border border-white/10 rounded-xl p-6 flex flex-col gap-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className={cn("p-3 rounded-lg", status === "success" ? "bg-green-500/20 text-green-400" : "bg-primary/10 text-primary")}>
                {status === "success" ? <CheckCircle2 className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
              </div>
              <div className="flex flex-col truncate pr-4">
                <span className="font-semibold text-foreground text-lg truncate">{file?.name || "Processing Upload..."}</span>
                <span className="text-sm text-muted-foreground">
                  {file ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB
                </span>
              </div>
            </div>

            {status === "idle" && (
              <button onClick={resetState} className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {status === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-primary font-medium animate-pulse">Uploading to secure storage...</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === "registering" && (
            <div className="flex items-center justify-center gap-3 py-6 text-primary font-medium">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Analyzing PDF and queueing background jobs...</span>
            </div>
          )}

          {status === "processing_chunks" && renderJobProgress()}

          {status === "success" && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center justify-between mt-4">
              <span className="text-green-400 font-medium">Processing complete! Questions saved to staging.</span>
              <button onClick={resetState} className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md">Upload Another</button>
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col gap-2 mt-4">
              <div className="flex items-start gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-4">
            {status === "idle" && (
              <button
                onClick={handleUpload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                <Play className="w-4 h-4 fill-current" /> Start Processing Pipeline
              </button>
            )}

            {status === "uploading" && (
              <button
                onClick={handleCancel}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel Upload
              </button>
            )}

            {status === "error" && (
              <>
                <button
                  onClick={resetState}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-white"
                >
                  Choose Different File
                </button>
                <button
                  onClick={handleUpload}
                  className="bg-primary/20 text-primary hover:bg-primary/30 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Retry Upload
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
