# Creative Directions & Aesthetics

The application uses specific "Aesthetics" to define the visual filter and storytelling mood. These are mapped in `src/components/ReelPreview.tsx`.

## Aesthetic Definitions

| ID | Visual Style | Narrative Tone |
| :--- | :--- | :--- |
| `vintage_cinema` | Sepia tones, grain, slow zooms | Nostalgic, timeless, cinematic. |
| `royal_palace` | Golden glints, high saturation | Majestic, grand, opulent. |
| `temple_aura` | Soft warm glow, subtle shadows | Spiritual, traditional, divine. |
| `modern_chic` | Clean lines, high contrast | Minimalist, sharp, fashionable. |

## Filter Logic

Each aesthetic applies a specific CSS backdrop filter and animation curve:

- **Vintage Cinema:** `brightness-90 sepia-[0.1] saturate-[0.9]`
- **Royal Palace:** `saturate-125 contrast-105 brightness-110`
- **Temple Aura:** `sepia-[0.05] brightness-105 saturate-110`
- **Modern Chic:** `contrast-110 brightness-110 saturate-115`

## Tuning for Developers

If you wish to add a new aesthetic:
1. Update the AI Prompt in `App.tsx` to include the new ID in the list of allowed values.
2. Add the corresponding visual style mapping in `ReelPreview.tsx`.
3. Add the narrative "feel" in the AI instruction section of the prompt.
