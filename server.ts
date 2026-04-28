import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize OpenAI lazily or with check
let openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY is missing. AI features will be unavailable.");
      return null;
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
};

app.use(express.json({ limit: '50mb' }));

// API Routes
app.post("/api/analyze-sarees", async (req, res) => {
  const { photos, customNotes } = req.body;
  const client = getOpenAI();

  if (!client) {
    return res.status(503).json({ error: "AI service not configured" });
  }

  try {
    // We'll analyze the first 3 photos to save on tokens while getting a good vibe
    const imagesToAnalyze = photos.slice(0, 3).map((p: any) => ({
      type: "image_url",
      image_url: { url: p.base64 || p.url },
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a luxury fashion curator and poetic storyteller. Your task is to analyze saree photos and generate:
1. 10 unique, cinematic captions for a video reel (under 35 chars each).
2. A visual aesthetic: 'vintage_cinema', 'royal_palace', 'temple_aura', or 'modern_chic'.
3. A premium Instagram caption following the "NIVRA HIGH-CONVERSION CAPTION STRUCTURE".

NIVRA CAPTION RULES:
- First lines MUST be an SEO Hook: [Fabric] + [Color] + [Occasion] + [Emotion]
- Emotional Luxury Description: Short, sensory, premium.
- Product Details: Scannable (Fabric, Weave, Blouse, Feel, Occasion).
- Price: Include a realistic luxury price in INR (e.g., ₹4,000 to ₹15,000) based on perceived quality.
- Product Code: NIVRA-[Shortened Color]-[3-digit number].
- Scarcity: premium urgency.
- CTA: DM to order.
- Hashtags: 8-12 niche/broad hashtags.

Return ONLY a JSON object with:
{
  "captions": ["string"],
  "aesthetic": "string",
  "instagramCaption": "string"
}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze these sarees. User notes: ${customNotes || "none"}. Generate the reel captions, aesthetic, and the NIVRA-style Instagram caption.` },
            ...imagesToAnalyze,
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content || "{}");
    const captions = parsed.captions || parsed.storyTexts;
    const aesthetic = parsed.aesthetic || 'vintage_cinema';
    const instagramCaption = parsed.instagramCaption || "";

    if (Array.isArray(captions)) {
      res.json({ captions: captions.slice(0, 10), aesthetic, instagramCaption });
    } else {
      throw new Error("Invalid AI response format");
    }
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze sarees" });
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
