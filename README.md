# Blur That Face

A standalone web application for blurring faces in video footage. Built for journalists and editors who need to protect the anonymity of interviewees on camera.

Upload a video, select which faces to blur, preview the effect in real time with custom controls, and export a final MP4 with the blur baked in — all running locally on your machine.

## Quick Start (Docker)

```bash
docker build -t blur-that-face .
docker run -p 8000:8000 blur-that-face
```

Open [http://localhost:8000](http://localhost:8000) in Chrome.

The Docker image includes all dependencies (Python, Node.js, ffmpeg, BlazeFace model). No network access is required at runtime.

## Local Development

### Prerequisites

- Python 3.11 (MediaPipe requires 3.11 or earlier)
- Node.js 22+
- ffmpeg installed and in PATH

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On first run, ensure `blaze_face_short_range.tflite` is present in `backend/`. The Dockerfile downloads it automatically; for local development, download it from the [MediaPipe model card](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite).

### Frontend

```bash
npm install
npm run dev
```

The frontend dev server runs on [http://localhost:5173](http://localhost:5173) and proxies API requests to the backend on port 8000.

## Usage

1. **Upload** — drag and drop a `.mp4`, `.webm`, or `.mov` file onto the landing page, or click to browse
2. **Wait for detection** — the backend scans every frame for faces and tracks them across the video. A progress bar shows detection progress.
3. **Select faces** — click a face card in the sidebar to blur it instantly with the current settings. Click a blurred face card again to select it for editing.
4. **Configure blur** — switch to the Settings tab to choose blur type (Gaussian, Pixelate, or Solid mask), adjust strength, padding, box shape (Rectangle or Ellipse), and smoothing. Changes apply live to selected faces.
5. **Preview** — blur renders in real time on the video canvas. Use the face timeline scrubber to drag through the video and see where each face appears. Enter fullscreen to preview with blur intact.
6. **Export** — click Export to render the final video server-side. A progress bar shows rendering progress and the blurred MP4 downloads automatically when complete.

## How It Works

### Face Detection

Each frame is processed by Google's BlazeFace (short range) model via the MediaPipe Tasks API in VIDEO mode. The detector outputs per-frame bounding boxes and confidence scores, saved as JSON for the tracker to consume.

### Face Tracking

A custom IoU-based tracker assigns stable track IDs across frames:

- **IoU matching** links detections to active tracks when bounding boxes overlap (threshold: 0.3)
- **Centroid distance fallback** reconnects faces that briefly disappeared during head turns by matching nearby positions (150px threshold), disabled for 10 frames after shot cuts to prevent cross-person matching
- **Shot change detection** computes mean pixel difference between consecutive grayscale frames. Cuts above the threshold close all active tracks to prevent carrying identity across scene boundaries
- **Within-shot merging** reconnects track fragments split by brief detection gaps using union-find, never across shot boundaries
- **Noise filtering** removes tracks shorter than 48 frames (~2 seconds)
- **Dual timeout strategy** — tracks survive longer within a shot (48 frames) for head movements, but are killed immediately after a cut to prevent cross-person matching

### Real-Time Preview

A `<canvas>` element is positioned over the `<video>` element. On every decoded frame (via `requestVideoFrameCallback` for frame-accurate sync), the canvas draws yellow bounding boxes for unblurred faces and applies the configured blur effect for blurred faces. Position smoothing interpolates box positions between frames to reduce detection jitter.

Custom video controls replace the native browser controls — play/pause, volume, and a fullscreen button that takes both the video and the blur canvas into fullscreen together, keeping blur visible at all times.

### Face Timeline

A draggable playhead scrubber below the video shows the full duration with colored bars indicating where each detected face appears. Dragging the playhead seeks the video in real time with throttled seeking for smooth scrubbing. Clicking anywhere on the timeline jumps to that position.

### Export

The backend reads the original video frame by frame with OpenCV, applies blur matching the frontend preview settings (Gaussian, Pixelate, or Solid mask with padding, shape, and strength). Frames are written with `cv2.VideoWriter` and ffmpeg re-encodes to H.264 with the original audio track copied over. Progress updates are polled by the frontend and the file downloads automatically on completion.

## Project Structure

```
blur_that_face/
├── backend/
│   ├── main.py                        # FastAPI app, routes, background tasks
│   ├── detector.py                    # BlazeFace face detection per frame
│   ├── tracker.py                     # IoU tracker + shot change detection
│   ├── requirements.txt               # Python dependencies
│   └── Dockerfile                     # Backend-only container (dev)
├── src/
│   ├── App.tsx                        # Root component, view routing
│   ├── types.ts                       # Shared TypeScript types
│   ├── hooks/
│   │   ├── useJobPolling.ts           # Upload, poll, export logic
│   │   ├── useVideoFrame.ts           # Frame-accurate video sync
│   │   └── useScrolled.ts             # Scroll position hook
│   └── components/
│       ├── HomePage.tsx               # Landing page layout
│       ├── HomePageHero.tsx           # Hero section with animations
│       ├── HomePageHowItWorks.tsx     # How it works section
│       ├── HomePageGetStarted.tsx     # Upload drop zone section
│       ├── Header.tsx                 # Adaptive header (landing/app mode)
│       ├── Footer.tsx                 # Footer
│       ├── ProcessingPage.tsx         # Detection progress view
│       ├── ProcessingPageLoader.tsx   # Loading spinner animation
│       ├── EditorPage.tsx             # Main editor layout
│       ├── EditorPageTopBar.tsx       # Filename, export button, progress
│       ├── EditorPageLeftPanel.tsx    # Tabs container (faces/settings)
│       ├── EditorPageFacesTab.tsx     # Face list with blur/reset controls
│       ├── EditorPageBlurTab.tsx      # Blur settings sliders and toggles
│       ├── EditorPageRightPanel.tsx   # Video properties sidebar
│       ├── EditorPageFacesTimeline.tsx # Draggable playhead + face tracks
│       ├── EditorPageVideoPlayer.tsx  # Video + canvas + custom controls
│       ├── GetStartedDropZone.tsx     # Drag-and-drop file picker
│       ├── ProgressBar.tsx            # Reusable progress bar
│       └── JobStatusCard.tsx          # Status display
├── Dockerfile                         # Multi-stage production build
├── docker-compose.yml
├── package.json
├── vite.config.ts
└── index.html
```

## API Endpoints

| Method | Path                                      | Description                    |
| ------ | ----------------------------------------- | ------------------------------ |
| `POST` | `/api/upload`                             | Upload video, starts detection |
| `GET`  | `/api/jobs/:id`                           | Job status and metadata        |
| `GET`  | `/api/jobs/:id/video`                     | Stream original video          |
| `GET`  | `/api/jobs/:id/detections`                | Per-frame detection data       |
| `GET`  | `/api/jobs/:id/faces/:track_id/thumbnail` | Cropped face image             |
| `POST` | `/api/jobs/:id/export`                    | Start blur rendering           |
| `GET`  | `/api/jobs/:id/output`                    | Download blurred video         |

## Design Decisions

**Detection and tracking are separate steps.** Detection is expensive and deterministic — run once, save the results. Tracking is cheap and tunable — iterate on thresholds without re-running detection. Swapping the detector only requires changing `detector.py`.

**Click-to-blur UX.** Clicking a face card immediately applies blur rather than requiring a separate select-then-apply workflow. Already-blurred faces can be selected for batch editing of settings. This minimizes clicks for the common case (blur a face) while still supporting fine-grained control.

**Live preview with canvas overlay.** Drawing blur effects on a canvas over the native `<video>` element avoids decoding and re-encoding video in the browser. Settings changes reflect instantly without re-processing.

**Custom video controls.** Native browser video controls don't include the canvas overlay when entering fullscreen. Custom play/pause, volume, and fullscreen controls wrap both the video and canvas in the same container, keeping blur visible in fullscreen mode.

**requestVideoFrameCallback for frame sync.** The standard `timeupdate` event fires ~4 times per second, causing visible lag between the video and the overlay. `requestVideoFrameCallback` fires once per decoded frame, keeping the canvas perfectly synchronized.

**Per-shot tracking by design.** The tracker does not attempt to re-identify faces across camera cuts. This avoids the failure mode of blurring the wrong person when a different person appears in a similar position after a cut. Users select multiple tracks to blur the same person across shots.

**Dual timeout strategy.** Within a continuous shot, tracks survive 48 frames (~2 seconds) to handle brief detection gaps from head turns. After a shot cut, tracks are killed immediately so they cannot match against a different person in the new shot.

**Server-side export.** The final video is rendered on the backend with OpenCV and ffmpeg, producing a proper H.264 MP4 with audio. Client-side video encoding would be impractical and produce inconsistent results across browsers.

## Limitations

- Face detection works best on frontal and near-frontal faces. Side profiles are detected intermittently, which can cause tracking gaps.
- The same person appearing across multiple camera cuts gets separate track IDs. Users select all relevant tracks to blur them.
- Very rapid head movements can cause brief detection gaps, splitting a face into multiple short tracks.
- Shot change detection catches hard cuts but may miss gradual transitions like crossfades or dissolves.
- Supported input formats: `.mp4`, `.webm`, `.mov`.

## Tech Stack

All tools are open source. The system runs fully offline with no external service dependencies.

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, Python 3.11, Uvicorn
- **Detection:** MediaPipe Tasks API (BlazeFace short range, float16)
- **Tracking:** Custom IoU tracker with centroid fallback and shot change detection
- **Video processing:** OpenCV (headless), ffmpeg
- **Containerization:** Docker (multi-stage build)
