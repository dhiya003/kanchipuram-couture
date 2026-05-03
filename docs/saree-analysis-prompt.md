# Saree Analysis Prompt

This prompt is used by `gemini-2.0-flash` to analyze uploaded saree photos and generate high-conversion marketing content.

## Prompt Text

```text
Analyze these saree photos. User notes: {customNotes}.
You are a luxury fashion curator and poetic storyteller. Generate:
1. 10 unique, cinematic reel captions (under 35 chars each).
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
}
```

## JSON Schema Details

The application expects a structured JSON response to ensure type-safety:

| Field | Type | Description |
| :--- | :--- | :--- |
| `captions` | `string[]` | 3-5 short aesthetic captions for story slides. |
| `aesthetic` | `string` | Must be one of: `vintage_cinema`, `royal_palace`, `temple_aura`, `modern_chic`. |
| `instagramCaption` | `string` | The full-length marketing copy for Instagram. |

## Implementation Context

This prompt is executed in `src/App.tsx` within the `analyzePhotos` function. It uses the Gemini 2.0 Flash model via the `@google/generative-ai` SDK.
