import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execPromise = promisify(exec);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));

app.post("/api/transcode", async (req, res) => {
  const { videoData } = req.body;
  if (!videoData) {
    return res.status(400).json({ error: "Missing videoData" });
  }

  const base64Data = videoData.replace(/^data:video\/[a-zA-Z0-9.+_-]+;base64,/, "");
  const tempId = Math.random().toString(36).substring(2, 11);
  const inputPath = path.join("/tmp", `input_${tempId}.webm`);
  const outputPath = path.join("/tmp", `output_${tempId}.mp4`);

  try {
    // Write WebM file
    await fs.promises.writeFile(inputPath, Buffer.from(base64Data, "base64"));

    // Run FFmpeg to transcode WebM to H.264 MP4 with AAC audio (if present)
    const command = `ffmpeg -y -i ${inputPath} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -map 0:v -map 0:a? ${outputPath}`;
    console.log(`Executing FFmpeg command: ${command}`);
    await execPromise(command);

    // Read generated MP4 file
    const mp4Buffer = await fs.promises.readFile(outputPath);
    const mp4Base64 = mp4Buffer.toString("base64");

    res.json({
      videoData: `data:video/mp4;base64,${mp4Base64}`
    });
  } catch (error: any) {
    console.error("FFmpeg transcoding error:", error);
    res.status(500).json({ error: "Transcoding failed", details: error.message });
  } finally {
    // Clean up files
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
