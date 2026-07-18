/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, Instagram, Camera, Music as MusicIcon, History, Settings, Crown, Gem, Flower2, Image as ImageIcon, Wand2 } from 'lucide-react';
import { AppState, Photo, Song, Reel, TextConfig } from './types';
import PhotoUploader from './components/PhotoUploader';
import MusicSelector, { SOUTHERN_CLASSICS } from './components/MusicSelector';
import ReelPreview from './components/ReelPreview';
import VideoExporter from './components/VideoExporter';
import HistoryView from './components/HistoryView';
import PoseStudio from './components/PoseStudio';
import { db as historyDb, urlToBase64, base64ToBlobUrl } from './lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

const DEFAULT_STORY_TEXTS = [
  "The Morning Glow...",
  "Whispers of Silk",
  "Heritage in Every Thread",
  "The Artisan's Pride",
  "Elegance Redefined",
  "A Bride's Journey Begins",
  "Timeless Tradition",
  "The Golden Hour",
  "Pure Kanchipuram Soul",
  "Draped in Grace"
];

import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization of Gemini AI to avoid crashing on boot if key is missing in APK
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    // Safer check for mobile environments
    let apiKey = '';
    try {
      apiKey = (typeof process !== 'undefined' ? (process.env?.GEMINI_API_KEY || '') : '') || 
               ((import.meta as any).env?.VITE_GEMINI_API_KEY || '');
    } catch (e) {
      console.warn("Error accessing environment variables", e);
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will not work.");
      aiInstance = new GoogleGenAI({ apiKey: 'MISSING' });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
};

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song>();
  const [selectedTransition, setSelectedTransition] = useState<number | 'auto'>('auto');
  const [storyTexts, setStoryTexts] = useState<string[]>(DEFAULT_STORY_TEXTS);
  const [storyConfigs, setStoryConfigs] = useState<TextConfig[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>('vintage_cinema');
  const [brandName, setBrandName] = useState(() => {
    return localStorage.getItem('nivra_brand_name') || 'SAREE HERITAGE';
  });
  const [showWatermark, setShowWatermark] = useState(() => {
    return localStorage.getItem('nivra_show_watermark') !== 'false';
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    return localStorage.getItem('nivra_music_enabled') === 'true'; // Default false as requested
  });
  const [driveEnabled, setDriveEnabled] = useState(() => {
    return localStorage.getItem('nivra_drive_enabled') === 'true'; // Default false
  });
  const [instagramEnabled, setInstagramEnabled] = useState(() => {
    return localStorage.getItem('nivra_instagram_enabled') === 'true'; // Default false
  });

  useEffect(() => {
    localStorage.setItem('nivra_brand_name', brandName);
  }, [brandName]);

  useEffect(() => {
    localStorage.setItem('nivra_show_watermark', String(showWatermark));
  }, [showWatermark]);

  useEffect(() => {
    localStorage.setItem('nivra_music_enabled', String(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    localStorage.setItem('nivra_drive_enabled', String(driveEnabled));
  }, [driveEnabled]);

  useEffect(() => {
    localStorage.setItem('nivra_instagram_enabled', String(instagramEnabled));
  }, [instagramEnabled]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state]);

  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  
  const history = useLiveQuery(() => historyDb.reels.reverse().toArray()) || [];

  const [exportSessionId, setExportSessionId] = useState(0);

  const resetApp = () => {
    console.log("Resetting app state for next curation...");
    // Revoke all current photo URLs to free memory and prevent overlaps
    const currentPhotos = [...photos];
    currentPhotos.forEach(p => {
      if (p.url && p.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(p.url);
        } catch (e) {
          console.warn("Revoke failed for photo", p.id, e);
        }
      }
    });
    
    setPhotos([]);
    setCustomNotes('');
    setSelectedSong(undefined);
    setStoryTexts([...DEFAULT_STORY_TEXTS]);
    setInstagramCaption('');
    setSelectedAesthetic('vintage_cinema');
    setSelectedTransition('auto');
    
    if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch (e) {
        console.warn("Revoke failed for videoUrl", e);
      }
    }
    setVideoUrl(null);
    setExportSessionId(prev => prev + 1);
  };

  const analyzeSarees = async () => {
    if (photos.length === 0) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStep('Observing fabric textures...');
    setVideoUrl(null); 
    
    try {
      // Prepare images for Gemini
      const imageCount = Math.min(photos.length, 4);
      const imageParts = [];
      
      for (let i = 0; i < imageCount; i++) {
        const p = photos[i];
        setAnalysisStep(`Analyzing weave ${i + 1}/${imageCount}...`);
        
        try {
          const response = await fetch(p.url);
          if (!response.ok) throw new Error("Fetch failed");
          const blob = await response.blob();
          
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              if (res) resolve(res.split(',')[1]);
              else reject("Reader empty");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          imageParts.push({
            inlineData: {
              data: base64,
              mimeType: blob.type || "image/jpeg"
            }
          });
          
          setAnalysisProgress(10 + (i + 1) * (40 / imageCount));
        } catch (err) {
          console.warn(`Failed to process image ${i}:`, err);
        }
      }

      if (imageParts.length === 0) throw new Error("No images processed");

      setAnalysisStep('Crafting poetic fragments...');
      setAnalysisProgress(60);

      const prompt = `Analyze these saree photos. User notes: ${customNotes || "none"}.
      You are a luxury fashion curator and poetic storyteller. Generate exactly 10 unique, cinematic reel captions (under 35 chars each).
      Ensure each caption is distinct and tells a progressive story (e.g., from fabric details to emotional payoff).
      
      1. Cap 1: The mood/vibe
      2. Cap 2: Fabric/Texture detail
      3. Cap 3: Artistic detail/Weave
      4. Cap 4: Moving into elegance
      5. Cap 5: Heritage connection
      6. Cap 6: Emotional appeal
      7. Cap 7: Stylistic flair
      8. Cap 8: The "Grand" feel
      9. Cap 9: Timeless aspect
      10. Cap 10: Final brand sign-off line

      Also generate:
      - A visual aesthetic: 'vintage_cinema', 'royal_palace', 'temple_aura', or 'modern_chic'.
      - A premium Instagram caption following the "NIVRA HIGH-CONVERSION CAPTION STRUCTURE".

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
      }`;

      console.log("Requesting AI Analysis with model: gemini-3-flash-preview");
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [...imageParts, { text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              captions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 10 unique aesthetic captions"
              },
              aesthetic: {
                type: Type.STRING,
                description: "One of aesthetic IDs"
              },
              instagramCaption: {
                type: Type.STRING,
                description: "Full Instagram caption"
              }
            },
            required: ["captions", "aesthetic", "instagramCaption"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("No response from AI");
      
      const data = JSON.parse(textOutput.replace(/```json\n?|```/g, '').trim());
      
      if (data.captions && data.captions.length >= 3) {
        setStoryTexts(data.captions);
      } else {
        console.warn("AI returned invalid captions, using defaults");
      }

      if (data.aesthetic) setSelectedAesthetic(data.aesthetic);
      if (data.instagramCaption) setInstagramCaption(data.instagramCaption);
      
      setAnalysisProgress(100);
    } catch (error) {
      console.error("AI Analysis Failed:", error);
      // Fallback is implicit via keeping storyTexts as they are (or setting defaults)
      setStoryTexts([...DEFAULT_STORY_TEXTS]);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      if (!selectedSong && SOUTHERN_CLASSICS.length > 0) {
        setSelectedSong(SOUTHERN_CLASSICS[0]);
      }
      
      if (musicEnabled) {
        setState('music');
      } else {
        setState('preview');
        startExport();
      }
    }
  };

  const [curtainActive, setCurtainActive] = useState(false);

  const triggerStepChange = (targetState: AppState, action?: () => void) => {
    setCurtainActive(true);
    setTimeout(() => {
      if (action) action();
      setState(targetState);
    }, 600); // Middle of animation
    setTimeout(() => setCurtainActive(false), 1200);
  };

  const nextStep = () => {
    if (state === 'landing') {
      triggerStepChange('upload', resetApp);
    }
    else if (state === 'upload') analyzeSarees();
    else if (state === 'music') {
      triggerStepChange('preview', startExport);
    }
    else if (state === 'preview') {
      startExport();
    }
  };

  const prevStep = () => {
    if (state === 'upload') triggerStepChange('landing');
    else if (state === 'music') triggerStepChange('upload');
    else if (state === 'preview') {
      if (musicEnabled) {
        triggerStepChange('music');
      } else {
        triggerStepChange('upload');
      }
    }
    else if (state === 'history') triggerStepChange('landing');
  };

  useEffect(() => {
    if (state === 'exporting') {
      setVideoUrl(null);
    }
  }, [state]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Reset video when creative settings change
  useEffect(() => {
    if (videoUrl) {
      console.log("Creative settings changed or story updated, resetting prepared video.");
      setVideoUrl(null);
    }
  }, [selectedSong, selectedTransition, selectedAesthetic, storyTexts]);

  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleExportComplete = () => {
    setIsExporting(false);
    console.log("Export process finished.");
  };

  const startExport = () => {
    if (isExporting || videoUrl) return; // Already exporting or finished
    setIsExporting(true);
    setExportProgress(0);
  };

  const saveToHistory = async (url: string) => {
    setVideoUrl(url);
    
    // Convert all photo URLs to Base64 for persistent storage in IndexedDB
    const persistentPhotos = await Promise.all(photos.map(async (p) => ({
      ...p,
      url: p.url.startsWith('blob:') ? await urlToBase64(p.url) : p.url
    })));

    const newReel: Reel = {
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      photos: persistentPhotos,
      song: selectedSong,
      texts: [...storyTexts],
      textConfigs: [...storyConfigs],
      filter: selectedFilter,
      aesthetic: selectedAesthetic,
      transitionType: selectedTransition,
      instagramCaption: instagramCaption
    };
    
    await historyDb.reels.add(newReel);
  };

  const deleteReel = async (id: string) => {
    await historyDb.reels.delete(id);
  };

  const hydrateReel = (reel: Reel): Photo[] => {
    // Convert persistent Base64 back to temporary blob URLs for efficient usage in memory
    return reel.photos.map(p => ({
      ...p,
      url: p.url.startsWith('data:') ? base64ToBlobUrl(p.url) : p.url
    }));
  };

  const selectReelFromHistory = (reel: Reel) => {
    const hydratedPhotos = hydrateReel(reel);
    setPhotos(hydratedPhotos);
    setSelectedSong(reel.song);
    if (reel.texts) setStoryTexts(reel.texts);
    if (reel.textConfigs) setStoryConfigs(reel.textConfigs);
    if (reel.filter) setSelectedFilter(reel.filter);
    if (reel.aesthetic) setSelectedAesthetic(reel.aesthetic);
    if (reel.instagramCaption !== undefined) setInstagramCaption(reel.instagramCaption);
    setSelectedTransition(reel.transitionType ?? 'auto');
    setVideoUrl(null); 
    setState('preview');
  };

  const downloadReelFromHistory = (reel: Reel) => {
    const hydratedPhotos = hydrateReel(reel);
    setPhotos(hydratedPhotos);
    setSelectedSong(reel.song);
    if (reel.texts) setStoryTexts(reel.texts);
    if (reel.textConfigs) setStoryConfigs(reel.textConfigs);
    if (reel.filter) setSelectedFilter(reel.filter);
    if (reel.aesthetic) setSelectedAesthetic(reel.aesthetic);
    if (reel.instagramCaption !== undefined) setInstagramCaption(reel.instagramCaption);
    setSelectedTransition(reel.transitionType ?? 'auto');
    setVideoUrl(null);
    setState('preview');
    
    // Trigger export in next frame to ensure state is flushed
    setTimeout(() => {
      startExport();
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-saree-paper">
      {/* Cinematic Curtain */}
      <div className={`curtain-overlay ${curtainActive ? 'curtain-active' : ''}`} />

      {/* Decorative Elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-saree-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-saree-maroon/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Rail */}
      <header className="p-6 md:px-12 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              resetApp();
              setState('landing');
            }}
            className="group relative flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-saree-maroon to-stone-900 flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform group-active:scale-90 border border-saree-gold/20">
              <Crown className="w-6 h-6 text-saree-gold" />
            </div>
            <div className="absolute -top-1 -right-1 bg-saree-gold rounded-full p-0.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-stone-950 animate-pulse" />
            </div>
          </button>
          <div>
            <h1 className="text-xl display-text font-bold tracking-tight text-saree-ink flex flex-col leading-none">
              <span>Kanchipuram</span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-saree-gold font-medium mt-1">Couture Studio</span>
            </h1>
          </div>
        </div>
        
        {state !== 'landing' && state !== 'history' && (
          <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.3em] font-sans font-semibold text-gray-400">
            <span className={state === 'upload' ? 'text-saree-maroon border-b border-saree-gold' : ''}>01 Selection</span>
            {musicEnabled && (
              <span className={state === 'music' ? 'text-saree-maroon border-b border-saree-gold' : ''}>02 Melody</span>
            )}
            <span className={state === 'preview' ? 'text-saree-maroon border-b border-saree-gold' : ''}>{musicEnabled ? '03' : '02'} Masterpiece</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-saree-gold text-white' : 'hover:bg-saree-gold/10 text-saree-gold'}`}
              aria-label="Toggle Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-4 w-64 glass-panel border border-saree-gold/20 shadow-2xl p-6 z-[100] text-left normal-case tracking-normal"
                >
                  <h4 className="display-text text-lg text-saree-maroon mb-4">Studio Settings</h4>
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Brand Identity</label>
                       <input 
                         type="text" 
                         value={brandName}
                         onChange={(e) => setBrandName(e.target.value)}
                         className="w-full px-3 py-2 bg-white/50 border border-saree-gold/20 rounded-lg text-sm outline-none focus:border-saree-gold"
                         placeholder="e.g. SAREE HERITAGE"
                       />
                       <p className="text-[8px] text-gray-400 italic">This will appear as your signature on every reel.</p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-saree-ink">Brand Watermark</span>
                        <span className="text-[10px] text-gray-400">Show signature on video</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWatermark(!showWatermark);
                        }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showWatermark ? 'bg-saree-gold' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          animate={{ x: showWatermark ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-saree-ink">Cinematic Music</span>
                        <span className="text-[10px] text-gray-400">Enable music selector</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMusicEnabled(!musicEnabled);
                        }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${musicEnabled ? 'bg-saree-gold' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          animate={{ x: musicEnabled ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-saree-ink">Google Drive Sync</span>
                        <span className="text-[10px] text-gray-400">Enable Google Drive integration</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDriveEnabled(!driveEnabled);
                        }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${driveEnabled ? 'bg-saree-gold' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          animate={{ x: driveEnabled ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-saree-ink">Instagram Auto-Post</span>
                        <span className="text-[10px] text-gray-400">Directly post reels to Instagram</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstagramEnabled(!instagramEnabled);
                        }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${instagramEnabled ? 'bg-saree-gold' : 'bg-gray-200'}`}
                      >
                        <motion.div 
                          animate={{ x: instagramEnabled ? 20 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setState('history')}
            className={`p-2 rounded-full transition-colors ${state === 'history' ? 'bg-saree-maroon text-white' : 'hover:bg-saree-gold/10 text-saree-gold'}`}
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main key={`curation-main-${exportSessionId}`} className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* AI Loading Overlay */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] gold-shimmer-bg glass-panel flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-32 h-32 relative mb-16">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-t border-saree-gold rounded-full opacity-40 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border-b border-saree-gold/30 rounded-full"
                />
                <motion.div 
                   animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute inset-0 flex items-center justify-center"
                >
                  <Crown className="w-12 h-12 text-saree-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                </motion.div>
                
                {/* Visual Progress Ring */}
                <svg className="absolute -inset-6 w-44 h-44 rotate-[-90deg]">
                  <circle
                    cx="88"
                    cy="88"
                    r="84"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={2 * Math.PI * 84 * (1 - analysisProgress / 100)}
                    className="text-saree-gold/30"
                  />
                </svg>
              </div>
              
              <div className="space-y-6">
                <h3 className="display-text text-3xl text-saree-gold italic drop-shadow-sm">{analysisStep || 'Curating Your Heritage Story...'}</h3>
                <div className="w-72 h-1 bg-white/5 rounded-full mx-auto overflow-hidden border border-saree-gold/10">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-saree-gold/40 via-saree-gold to-saree-gold/40"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="serif-text text-[12px] uppercase tracking-[0.4em] text-saree-gold/60 font-bold">
                  Phase {analysisProgress < 40 ? 'I' : analysisProgress < 80 ? 'II' : 'III'} — {Math.round(analysisProgress)}%
                </p>
                <motion.p 
                  key={analysisStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="serif-text text-gray-400 max-w-xs mx-auto text-sm leading-relaxed"
                >
                  {analysisProgress < 40 && "Identifying ancient yarn patterns and silk weaves..."}
                  {analysisProgress >= 40 && analysisProgress < 80 && "Translating visual elegance into poetic verses..."}
                  {analysisProgress >= 80 && "Polishing your brand's digital presence for the world..."}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {state === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full text-center space-y-12"
            >
              <div className="space-y-8 flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-saree-maroon via-saree-maroon to-stone-950 flex items-center justify-center relative shadow-2xl ring-4 ring-saree-gold/10 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <Crown className="w-20 h-20 text-saree-gold z-10 drop-shadow-2xl" strokeWidth={1} />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 border border-dashed border-saree-gold/30 rounded-[2.2rem]"
                  />
                  <div className="absolute -top-6 -right-6 bg-saree-gold p-4 rounded-full shadow-2xl rotate-12">
                    <Sparkles className="w-6 h-6 text-stone-950" />
                  </div>
                </motion.div>
                
                <div className="space-y-4">
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[12px] uppercase tracking-[0.6em] text-saree-gold font-bold bg-saree-gold/5 px-4 py-1 rounded-full"
                  >
                    Est. 1924 • Handcrafted Heritage
                  </motion.span>
                  <h2 className="text-6xl md:text-8xl display-text font-medium leading-[1.1] text-saree-ink">
                    The Art of <span className="text-saree-maroon italic block md:inline mt-4 md:mt-0">Presentation</span>
                  </h2>
                  <p className="max-w-xl mx-auto text-lg serif-text text-gray-500 leading-relaxed pt-2 px-4">
                    Transform your weaver's craft into digital masterpieces. Choose your studio journey.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto px-4">
                <button 
                  onClick={nextStep}
                  className="p-8 rounded-[2rem] bg-white border border-saree-gold/20 shadow-xl hover:shadow-2xl hover:border-saree-gold transition-all text-left flex flex-col group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Crown className="w-24 h-24 text-saree-maroon" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-saree-gold/10 flex items-center justify-center mb-6 text-saree-gold">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h3 className="display-text text-2xl text-saree-maroon mb-2">Cinematic Reels</h3>
                  <p className="text-sm text-gray-500 serif-text mb-6">Create 10-slide bridal showcases with music and poetic overlays.</p>
                  <span className="mt-auto flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-saree-gold">
                    Enter Studio <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <button 
                  onClick={() => triggerStepChange('pose_studio')}
                  className="p-8 rounded-[2rem] bg-saree-ink text-white border border-white/10 shadow-xl hover:shadow-2xl hover:border-saree-gold/40 transition-all text-left flex flex-col group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-24 h-24 text-saree-gold" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 text-saree-gold">
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <h3 className="display-text text-2xl text-saree-paper mb-2">Pose Studio</h3>
                  <p className="text-sm text-gray-400 serif-text mb-6 italic">Re-imagine any saree in our signature pleated presentation pose.</p>
                  <span className="mt-auto flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-saree-gold">
                    Open Lab <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex items-center gap-8 text-saree-gold/40">
                  <Instagram className="w-5 h-5" />
                  <div className="w-px h-6 bg-saree-gold/20" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Optimized for Instagram</span>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'pose_studio' && (
            <motion.div 
              key="pose_studio"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full h-full"
            >
              <PoseStudio onBack={() => triggerStepChange('landing')} driveEnabled={driveEnabled} />
            </motion.div>
          )}

          {state === 'upload' && (
            <motion.div 
              key={`upload-${exportSessionId}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full h-full"
            >
              <PhotoUploader 
                photos={photos} 
                onPhotosChange={setPhotos}
                notes={customNotes}
                onNotesChange={setCustomNotes}
              />
            </motion.div>
          )}

          {state === 'music' && (
            <motion.div 
              key={`music-${exportSessionId}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full h-full"
            >
              <MusicSelector selectedSong={selectedSong} onSelect={setSelectedSong} />
            </motion.div>
          )}

          {state === 'preview' && (
            <motion.div 
              key={`preview-${exportSessionId}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full h-full relative"
            >
              <ReelPreview 
                photos={photos} 
                song={musicEnabled ? (selectedSong || SOUTHERN_CLASSICS[0]) : null} 
                storyTexts={storyTexts}
                storyConfigs={storyConfigs}
                onTextChange={setStoryTexts}
                onConfigsChange={setStoryConfigs}
                filter={selectedFilter}
                onFilterChange={setSelectedFilter}
                instagramCaption={instagramCaption}
                onInstagramCaptionChange={setInstagramCaption}
                onBack={() => setState('music')}
                onRestart={() => {
                  resetApp();
                  setState('landing');
                }}
                transitionType={selectedTransition}
                onTransitionChange={setSelectedTransition}
                aesthetic={selectedAesthetic}
                onAestheticChange={setSelectedAesthetic}
                brandName={brandName}
                showWatermark={showWatermark}
                onExport={startExport}
                isExporting={isExporting}
                exportProgress={exportProgress}
                videoUrl={videoUrl}
                driveEnabled={driveEnabled}
                instagramEnabled={instagramEnabled}
              />
              
              {isExporting && (
                <VideoExporter 
                  photos={photos} 
                  song={musicEnabled ? (selectedSong || null) : null} 
                  texts={storyTexts} 
                  textConfigs={storyConfigs}
                  filter={selectedFilter}
                  transitionType={selectedTransition}
                  aesthetic={selectedAesthetic}
                  brandName={brandName}
                  showWatermark={showWatermark}
                  headless={true}
                  onProgress={setExportProgress}
                  onReady={saveToHistory}
                  onComplete={handleExportComplete} 
                />
              )}
            </motion.div>
          )}

          {state === 'exporting' && (
            <div className="hidden">
              {/* Exporting is now handled headless in the preview block */}
            </div>
          )}

          {state === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full h-full"
            >
              <HistoryView 
                history={history} 
                onBack={() => setState('landing')} 
                onSelectReel={selectReelFromHistory}
                onDeleteReel={deleteReel}
                onDownloadReel={downloadReelFromHistory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      {state !== 'landing' && state !== 'exporting' && state !== 'complete' && (
        <footer className="p-8 md:px-12 glass-panel border-t flex justify-between items-center sticky bottom-0 z-50">
          <button 
            onClick={prevStep}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-saree-maroon transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex gap-2">
              <div className={`w-2 h-2 rounded-full ${state === 'upload' ? 'bg-saree-gold' : 'bg-gray-200'}`} />
              {musicEnabled && (
                <div className={`w-2 h-2 rounded-full ${state === 'music' ? 'bg-saree-gold' : 'bg-gray-200'}`} />
              )}
              <div className={`w-2 h-2 rounded-full ${state === 'preview' ? 'bg-saree-gold' : 'bg-gray-200'}`} />
            </div>

            <button 
              onClick={nextStep}
              disabled={(state === 'upload' && photos.length === 0) || (state === 'music' && !selectedSong)}
              className={`px-8 py-3 rounded-full flex items-center gap-3 text-xs uppercase tracking-widest font-bold transition-all ${
                (state === 'upload' && photos.length === 0) || (state === 'music' && !selectedSong)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-saree-gold text-white hover:bg-saree-maroon shadow-lg active:scale-95'
              }`}
            >
              {state === 'preview' ? 'Export Reel' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
