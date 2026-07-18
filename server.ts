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

app.post("/api/transcode", express.raw({ type: "*/*", limit: "100mb" }), async (req, res) => {
  const videoBuffer = req.body;
  if (!videoBuffer || videoBuffer.length === 0) {
    return res.status(400).json({ error: "Missing video data" });
  }

  const tempId = Math.random().toString(36).substring(2, 11);
  const inputPath = path.join("/tmp", `input_${tempId}.webm`);
  const outputPath = path.join("/tmp", `output_${tempId}.mp4`);

  try {
    // Write WebM file directly from buffer
    await fs.promises.writeFile(inputPath, videoBuffer);

    // Run FFmpeg to transcode WebM to H.264 MP4 with AAC audio (if present)
    const command = `ffmpeg -y -i ${inputPath} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -map 0:v -map 0:a? ${outputPath}`;
    console.log(`Executing FFmpeg command: ${command}`);
    await execPromise(command);

    // Read generated MP4 file
    const mp4Buffer = await fs.promises.readFile(outputPath);

    res.setHeader("Content-Type", "video/mp4");
    res.send(mp4Buffer);
  } catch (error: any) {
    console.error("FFmpeg transcoding error:", error);
    res.status(500).json({ error: "Transcoding failed", details: error.message });
  } finally {
    // Clean up files
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
});

// 1. Prepare temporary video for Instagram Graph API download
app.post("/api/instagram/prepare", express.raw({ type: "*/*", limit: "100mb" }), async (req, res) => {
  const videoBuffer = req.body;
  if (!videoBuffer || videoBuffer.length === 0) {
    return res.status(400).json({ error: "Missing video data" });
  }

  const tempId = Math.random().toString(36).substring(2, 11);
  const inputPath = path.join("/tmp", `instagram_input_${tempId}`);
  const outputPath = path.join("/tmp", `instagram_${tempId}.mp4`);

  try {
    // Write raw video to input file
    await fs.promises.writeFile(inputPath, videoBuffer);

    // Transcode input video to compliant H.264 MP4 with AAC audio
    const command = `ffmpeg -y -i ${inputPath} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -map 0:v -map 0:a? ${outputPath}`;
    console.log(`Executing FFmpeg Instagram prepare command: ${command}`);
    await execPromise(command);

    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const videoUrl = `${protocol}://${host}/api/instagram/video/${tempId}`;

    console.log(`Prepared and transcoded temporary Instagram video at: ${videoUrl}`);
    res.json({ id: tempId, url: videoUrl });
  } catch (error: any) {
    console.error("Error preparing/transcoding Instagram video:", error);
    res.status(500).json({ error: "Failed to prepare and transcode video for Instagram", details: error.message });
  } finally {
    // Clean up input file
    fs.promises.unlink(inputPath).catch(() => {});
  }
});

// 2. Serve prepared temporary video publicly for Facebook/Instagram Crawler
app.get("/api/instagram/video/:id", async (req, res) => {
  const filePath = path.join("/tmp", `instagram_${req.params.id}.mp4`);
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "video/mp4");
    res.sendFile(filePath);
  } else {
    res.status(404).send("Video not found");
  }
});

// 3. Initiate Facebook/Instagram Graph API OAuth Flow
app.get("/api/instagram/auth-url", (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return res.status(400).json({ error: "FACEBOOK_APP_ID environment variable is not configured." });
  }
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  const redirectUri = `${protocol}://${host}/auth/instagram/callback`;
  
  const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement&response_type=code`;
  
  res.json({ url: facebookAuthUrl });
});

// 4. Facebook/Instagram OAuth Callback Handler
app.get(["/auth/instagram/callback", "/auth/instagram/callback/"], async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'INSTAGRAM_AUTH_ERROR', error: 'No authorization code provided' }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/auth/instagram/callback`;

    // Exchange authorization code for User Access Token
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
    const tokenData: any = await tokenRes.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Failed to exchange authorization token");
    }

    const userAccessToken = tokenData.access_token;

    // Fetch managed Facebook Pages to find linked Instagram Business Accounts
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    const pagesData: any = await pagesRes.json();
    
    const accounts: any[] = [];
    if (pagesData.data && Array.isArray(pagesData.data)) {
      for (const page of pagesData.data) {
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${userAccessToken}`);
        const igData: any = await igRes.json();
        if (igData.instagram_business_account) {
          const igUserRes = await fetch(`https://graph.facebook.com/v19.0/${igData.instagram_business_account.id}?fields=username,name,profile_picture_url&access_token=${userAccessToken}`);
          const igUserData: any = await igUserRes.json();
          accounts.push({
            instagramId: igData.instagram_business_account.id,
            username: igUserData.username || "instagram_user",
            name: igUserData.name || page.name,
            profilePicture: igUserData.profile_picture_url || "",
            accessToken: userAccessToken
          });
        }
      }
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'INSTAGRAM_AUTH_SUCCESS', 
                accounts: ${JSON.stringify(accounts)},
                accessToken: ${JSON.stringify(userAccessToken)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You may close this window.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Instagram OAuth Error:", err);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'INSTAGRAM_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
              window.close();
            }
          </script>
          <p>Authentication failed: ${err.message}</p>
        </body>
      </html>
    `);
  }
});

// 5. Publish video to Instagram directly using Facebook Graph API
app.post("/api/instagram/publish", async (req, res) => {
  const { accessToken, instagramId, videoId, caption } = req.body;
  if (!accessToken || !instagramId || !videoId) {
    return res.status(400).json({ error: "Missing required parameters (accessToken, instagramId, videoId)" });
  }

  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  const videoUrl = `${protocol}://${host}/api/instagram/video/${videoId}`;
  const localFilePath = path.join("/tmp", `instagram_${videoId}.mp4`);

  try {
    console.log(`Publishing Reel to Instagram Account ${instagramId}. Video URL: ${videoUrl}`);

    // Step A: Create media container
    const containerParams = new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption || "",
      access_token: accessToken
    });

    const initRes = await fetch(`https://graph.facebook.com/v19.0/${instagramId}/media`, {
      method: "POST",
      body: containerParams
    });
    const initData: any = await initRes.json();

    if (initData.error) {
      throw new Error(initData.error.message || "Failed to initialize video container with Instagram API");
    }

    const containerId = initData.id;
    console.log(`Instagram media container created: ${containerId}. Polling processing status...`);

    // Step B: Poll container processing status (since Facebook transcode is asynchronous)
    let attempts = 0;
    let isFinished = false;
    let publishError = "";

    while (attempts < 20 && !isFinished) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));

      const checkRes = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${accessToken}`);
      const checkData: any = await checkRes.json();

      if (checkData.error) {
        console.error("Polling container error:", checkData.error);
        publishError = checkData.error.message;
        break;
      }

      const status = checkData.status_code || checkData.status;
      console.log(`Container status check #${attempts}: ${status}`);

      if (status === "FINISHED") {
        isFinished = true;
      } else if (status === "ERROR" || checkData.status === "FAILED") {
        publishError = checkData.error?.message || "Instagram processing failed. Check video size/format.";
        break;
      }
    }

    if (!isFinished) {
      throw new Error(publishError || "Instagram processing timed out. Please try publishing again.");
    }

    // Step C: Publish the media container
    console.log(`Container fully processed. Publishing media container ${containerId}...`);
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken
    });

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${instagramId}/media_publish`, {
      method: "POST",
      body: publishParams
    });
    const publishData: any = await publishRes.json();

    if (publishData.error) {
      throw new Error(publishData.error.message || "Failed to publish media container");
    }

    const mediaId = publishData.id;
    console.log(`Instagram post successfully published! Media ID: ${mediaId}`);

    // Fetch the post permalink to show the user!
    const permalinkRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=permalink&access_token=${accessToken}`);
    const permalinkData: any = await permalinkRes.json();
    const permalink = permalinkData.permalink || `https://www.instagram.com/`;

    res.json({ success: true, mediaId, permalink });
  } catch (error: any) {
    console.error("Direct Instagram publishing error:", error);
    res.status(500).json({ error: error.message || "Failed to publish video to Instagram" });
  } finally {
    // Delete local temporary video file
    fs.promises.unlink(localFilePath).catch(() => {});
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
