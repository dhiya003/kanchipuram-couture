# Kanchipuram Couture: AI-Driven Silk Storytelling

A premium, cinematic reel-making application designed for the heritage saree industry. This app transforms high-quality saree photography into professional social media content using Gemini AI and client-side video rendering.

## 🏛 Architecture Overview

The application is built as a highly responsive **React SPA** with a **Mobile-Native bridge (Capacitor)**. It follows a linear state-management flow to guide users through the "curation" process.

### 💎 Core Technology Stack
- **AI Engine:** Google Gemini 2.0 Flash (Vision & Text generation).
- **Core UI:** React 18 + TypeScript + Tailwind CSS.
- **Motion:** Framer Motion (Route transitions & UI physics).
- **Video Engine:** Canvas API + MediaRecorder (Client-side synthesis).
- **Mobile Bridge:** Capacitor 6 (Android Target).

---

## 🛠 Directory & Logic Structure

### /src (The Application Core)
- **`App.tsx`**: The Central Controller. Manages the global state machine (`welcome`, `upload`, `music`, `preview`).
- **`/components/VideoExporter.tsx`**: The "Render Engine". This is the most complex logic block. It creates a hidden `<canvas>`, renders the reel frame-by-frame at 30fps, captures the stream via `MediaRecorder`, and synthesizes the audio and video into a downloadable blob.
- **`/components/ReelPreview.tsx`**: The interactive playback engine. It handles high-perf image transitions, story text overlays, and "Indian Traditional" aesthetic filters using CSS backdrops.
- **`/services/geminiService.ts`**: (Integrated in App.tsx) Handles the payload packaging for image analysis.

---

## 🧭 Developer Lifecycle: Step-by-Step

### 1. The AI Analysis Pulse
When images are uploaded, the app extracts base64 data and sends it to `gemini-2.0-flash`. The prompt (stored in `App.tsx`) instructs the AI to returning a structured JSON containing:
- **Aesthetic:** (e.g., 'vintage_cinema' or 'modern_luxury').
- **Story Texts:** Narrative hooks based on the saree's weave/color.
- **Caption:** An SEO-optimized Instagram caption.

### 2. The Rendering Engine (`VideoExporter`)
This does not use a backend server. To maintain privacy and speed, the video is rendered in the user's browser:
1. It draws photos to a canvas using `drawImage`.
2. It applies "Ken Burns" effects by calculating zoom/pan offsets per frame.
3. It captures the canvas at 30Hz: `canvas.captureStream(30)`.
4. It initializes `MediaRecorder` with `video/webm` or `video/mp4`.

### 3. Mobile Deployment (Android)
The app is pre-configured for Capacitor. 
- **Config:** `capacitor.config.ts`.
- **Logic:** Web assets from `dist/` are mirrored into the `android/` directory.
- **Process:**
  ```bash
  npm run build        # Build the web assets
  npx cap sync android # Sync assets to the Android project
  cd android && ./gradlew assembleDebug # Build the actual APK
  ```

---

## 🚀 Environment & Variables

- **`GEMINI_API_KEY`**: Required in the environment to power the saree analysis.
- **`VITE_` Prefix**: All environment variables used in the client must be prefixed with `VITE_`.

---

## ⚓ Known Maintenance Constraints

1. **MediaRecorder Formats:** Safari handles downloads differently than Chrome. The `ReelPreview` component uses a direct `<a>` tag with a blob URL to ensure maximum compatibility.
2. **Mobile Screen Wake:** For long renders (60s+), the device might sleep. The UI includes a "Rendering..." overlay to keep the user engaged.
3. **API Limits:** If you hit `PERMISSION_DENIED`, check the model version in `App.tsx`. We transitioned to `gemini-2.0-flash` for higher stability.

---

## 🧪 Common Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start the interactive web development server. |
| `npm run build` | Prepare optimized web assets for deployment. |
| `npm run cap:sync` | Sync the latest UI changes to the Android folder. |
| `npm run cap:open-android` | Open the project in Android Studio for native debugging. |

---

**Crafted by AI Studio Build** — *Optimized for Heritage, Engineered for Mobile.*
