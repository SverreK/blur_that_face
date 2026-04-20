import { useEffect, useRef, useState } from "react"

type JobStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "detecting"
  | "detected"
  | "rendering"
  | "done"
  | "error"

interface JobMeta {
  id: string
  filename: string
  status: JobStatus
  error?: string
  num_faces?: number
  total_frames?: number
  frame_progress?: { current: number; total: number } | null
  faces?: { face_id: number; first_frame: number; last_frame: number; bbox_sample: number[] }[]
}

const STATUS_LABEL: Record<JobStatus, string> = {
  idle:      "Waiting for upload",
  uploading: "Uploading…",
  uploaded:  "Uploaded — queuing detection…",
  detecting: "Detecting faces…",
  detected:  "Detection complete",
  rendering: "Rendering blurred video…",
  done:      "Done",
  error:     "Error",
}

const POLL_INTERVAL_MS = 1500

export default function App() {
  const [status, setStatus]   = useState<JobStatus>("idle")
  const [job, setJob]         = useState<JobMeta | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef           = useRef<HTMLInputElement>(null)
  const pollRef                = useRef<ReturnType<typeof setInterval> | null>(null)

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  function startPolling(jobId: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res  = await fetch(`/api/jobs/${jobId}`)
      const meta = (await res.json()) as JobMeta
      setJob(meta)
      setStatus(meta.status)
      if (["detected", "done", "error"].includes(meta.status)) {
        stopPolling()
      }
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  async function uploadFile(file: File) {
    setStatus("uploading")
    setJob(null)

    const body = new FormData()
    body.append("file", file)

    const res = await fetch("/api/upload", { method: "POST", body })

    if (!res.ok) {
      const { detail } = await res.json()
      setStatus("error")
      setJob({ id: "", filename: file.name, status: "error", error: detail })
      return
    }

    const { job_id } = await res.json()
    setStatus("uploaded")
    startPolling(job_id)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  // -------------------------------------------------------------------------
  // Progress helpers
  // -------------------------------------------------------------------------

  const progressPct =
    job?.frame_progress
      ? Math.round((job.frame_progress.current / job.frame_progress.total) * 100)
      : null

  const isProcessing = ["uploading", "uploaded", "detecting", "rendering"].includes(status)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-4xl font-bold tracking-tight">Blur That Face</h1>

      {/* Drop zone */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-blue-400 bg-blue-950/30"
            : "border-gray-700 hover:border-gray-500",
          isProcessing ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.webm,.mov"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-lg text-gray-400">
          {isProcessing
            ? STATUS_LABEL[status]
            : "Drop a .mp4, .webm or .mov file here, or click to browse"}
        </p>
      </div>

      {/* Status card */}
      {status !== "idle" && (
        <div className="w-full max-w-lg bg-gray-900 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status</span>
            <span
              className={[
                "text-sm font-medium",
                status === "error"    ? "text-red-400"   :
                status === "detected" ? "text-green-400" :
                "text-blue-400",
              ].join(" ")}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          {job?.filename && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">File</span>
              <span className="text-sm truncate max-w-[60%] text-right">{job.filename}</span>
            </div>
          )}

          {/* Progress bar during detection */}
          {status === "detecting" && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: progressPct !== null ? `${progressPct}%` : "100%" }}
                />
              </div>
              {progressPct !== null && (
                <p className="text-xs text-gray-500 text-right">{progressPct}%</p>
              )}
            </div>
          )}

          {/* Face summary */}
          {status === "detected" && job?.faces && (
            <div className="pt-2 space-y-1">
              <span className="text-sm text-gray-400">
                Found {job.num_faces} face{job.num_faces !== 1 ? "s" : ""}
              </span>
              <ul className="text-xs text-gray-500 list-disc list-inside">
                {job.faces.map((f) => (
                  <li key={f.face_id}>
                    Face {f.face_id} — frames {f.first_frame}–{f.last_frame}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-red-400">{job?.error ?? "Unknown error"}</p>
          )}
        </div>
      )}
    </div>
  )
}
