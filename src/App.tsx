/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, Instagram, Camera, Music as MusicIcon, History, Settings } from 'lucide-react';
import { AppState, Photo, Song, Reel } from './types';
import PhotoUploader from './components/PhotoUploader';
import MusicSelector, { SOUTHERN_CLASSICS } from './components/MusicSelector';
import ReelPreview from './components/ReelPreview';
import VideoExporter from './components/VideoExporter';
import HistoryView from './components/HistoryView';
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will not work.");
      // Return a dummy instance or handle error gracefully in the app
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
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>('vintage_cinema');
  const [brandName, setBrandName] = useState(() => {
    return localStorage.getItem('nivra_brand_name') || 'SAREE HERITAGE';
  });
  const [showWatermark, setShowWatermark] = useState(() => {
    return localStorage.getItem('nivra_show_watermark') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('nivra_brand_name', brandName);
  }, [brandName]);

  useEffect(() => {
    localStorage.setItem('nivra_show_watermark', String(showWatermark));
  }, [showWatermark]);
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
    setVideoUrl(null); // Reset video URL on new analysis
    try {
      // Prepare images for Gemini - parallel fetch
      setAnalysisProgress(15);
      const imageParts = await Promise.all(
        photos.slice(0, 4).map(async (p, idx) => {
          const response = await fetch(p.url);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          setAnalysisProgress(prev => Math.min(prev + 10, 50));
          return {
            inlineData: {
              data: base64,
              mimeType: blob.type
            }
          };
        })
      );

      setAnalysisStep('Crafting poetic fragments...');
      setAnalysisProgress(60);

      const prompt = `Analyze these saree photos. User notes: ${customNotes || "none"}.
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
      }`;

      console.log("Starting saree analysis with model: gemini-2.0-flash");
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            ...imageParts.map(p => ({
              inlineData: {
                data: p.inlineData.data,
                mimeType: p.inlineData.mimeType
              }
            })),
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              captions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3-5 short aesthetic captions for story slides"
              },
              aesthetic: {
                type: Type.STRING,
                description: "One of internal aesthetic IDs: vintage_cinema, royal_palace, temple_aura, modern_chic"
              },
              instagramCaption: {
                type: Type.STRING,
                description: "Full premium Instagram caption following high-conversion structure"
              }
            },
            required: ["captions", "aesthetic", "instagramCaption"]
          }
        }
      });

      setAnalysisProgress(90);
      setAnalysisStep('Finalizing curation...');

      const cleanedText = response.text.replace(/```json\n?|```/g, '').trim();
      const data = JSON.parse(cleanedText);
      if (data.captions) setStoryTexts(data.captions);
      if (data.aesthetic) setSelectedAesthetic(data.aesthetic);
      if (data.instagramCaption) setInstagramCaption(data.instagramCaption);
      
      setAnalysisProgress(100);
    } catch (error) {
      console.error("AI Analysis Failed", error);
      // Fallback to defaults if AI fails
      setStoryTexts([...DEFAULT_STORY_TEXTS]);
      setInstagramCaption("Experience the timeless elegance of Kanchipuram silk. Handcrafted with passion, draped in tradition. #SareeHeritage #KanchipuramCouture #SilkSaree");
      setSelectedAesthetic('vintage_cinema');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      if (!selectedSong && SOUTHERN_CLASSICS.length > 0) {
        setSelectedSong(SOUTHERN_CLASSICS[0]);
      }
      setState('music');
    }
  };

  const nextStep = () => {
    if (state === 'landing') {
      resetApp();
      setState('upload');
    }
    else if (state === 'upload') analyzeSarees();
    else if (state === 'music') {
      setState('preview');
      startExport();
    }
    else if (state === 'preview') {
      startExport();
    }
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
      console.log("Creative settings changed, resetting prepared video.");
      setVideoUrl(null);
    }
  }, [selectedSong, selectedTransition, selectedAesthetic]);

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
      aesthetic: selectedAesthetic,
      transitionType: selectedTransition
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
    if (reel.aesthetic) setSelectedAesthetic(reel.aesthetic);
    setSelectedTransition(reel.transitionType ?? 'auto');
    setVideoUrl(null); 
    setState('preview');
  };

  const downloadReelFromHistory = (reel: Reel) => {
    const hydratedPhotos = hydrateReel(reel);
    setPhotos(hydratedPhotos);
    setSelectedSong(reel.song);
    if (reel.texts) setStoryTexts(reel.texts);
    if (reel.aesthetic) setSelectedAesthetic(reel.aesthetic);
    setSelectedTransition(reel.transitionType ?? 'auto');
    setVideoUrl(null);
    setState('preview');
    
    // Trigger export in next frame to ensure state is flushed
    setTimeout(() => {
      startExport();
    }, 100);
  };

  const prevStep = () => {
    if (state === 'upload') setState('landing');
    else if (state === 'music') setState('upload');
    else if (state === 'preview') setState('music');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-saree-paper">
      {/* Decorative Elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-saree-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-saree-maroon/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Rail */}
      <header className="p-6 md:px-12 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              resetApp();
              setState('landing');
            }}
            className="w-10 h-10 rounded-full bg-saree-maroon flex items-center justify-center text-white shadow-lg cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <h1 className="text-xl display-text font-bold tracking-tighter text-saree-ink">
            Kanchipuram <span className="text-saree-gold">Couture</span>
          </h1>
        </div>
        
        {state !== 'landing' && state !== 'history' && (
          <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.3em] font-sans font-semibold text-gray-400">
            <span className={state === 'upload' ? 'text-saree-maroon border-b border-saree-gold' : ''}>01 Selection</span>
            <span className={state === 'music' ? 'text-saree-maroon border-b border-saree-gold' : ''}>02 Melody</span>
            <span className={state === 'preview' ? 'text-saree-maroon border-b border-saree-gold' : ''}>03 Masterpiece</span>
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
              className="absolute inset-0 z-[100] bg-saree-paper/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-24 h-24 relative mb-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-t-2 border-saree-gold rounded-full"
                />
                <motion.div 
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 text-saree-gold animate-pulse" />
                </motion.div>
                
                {/* Visual Progress Ring */}
                <svg className="absolute -inset-4 w-32 h-32 rotate-[-90deg]">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - analysisProgress / 100)}
                    className="text-saree-gold/20"
                  />
                </svg>
              </div>
              
              <div className="space-y-4">
                <h3 className="display-text text-2xl text-saree-maroon italic">{analysisStep || 'Curating Your Heritage Story...'}</h3>
                <div className="w-64 h-1 bg-stone-100 rounded-full mx-auto overflow-hidden">
                  <motion.div 
                    className="h-full bg-saree-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="serif-text text-[10px] uppercase tracking-[0.2em] text-saree-gold font-bold">
                  {Math.round(analysisProgress)}% Processed
                </p>
                <p className="serif-text text-gray-500 max-w-xs mx-auto text-xs">
                  {analysisProgress < 40 && "Identifying yarn patterns and silk weaves..."}
                  {analysisProgress >= 40 && analysisProgress < 80 && "Translating visual elegance into poetic verses..."}
                  {analysisProgress >= 80 && "Polishing your brand's digital presence..."}
                </p>
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
              <div className="space-y-6">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] uppercase tracking-[0.5em] text-saree-gold font-bold"
                >
                  Est. 1924 • Handcrafted Heritage
                </motion.span>
                <h2 className="text-6xl md:text-8xl display-text font-medium leading-none text-saree-ink italic">
                  Crafting <span className="text-saree-maroon">Stories</span> <br />
                  in Silk
                </h2>
                <p className="max-w-xl mx-auto text-lg serif-text text-gray-500 leading-relaxed">
                  Transform your masterpiece photography into cinematic bridal journeys. 
                  An elite reel studio for the modern heritage weaver.
                </p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <button 
                  onClick={nextStep}
                  className="px-12 py-5 rounded-full bg-saree-ink text-saree-paper flex items-center gap-4 text-sm uppercase tracking-widest font-bold hover:bg-saree-maroon transition-all shadow-xl group"
                >
                  Begin Curation
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-8 text-saree-gold/40">
                  <Instagram className="w-5 h-5" />
                  <div className="w-px h-10 bg-saree-gold/20" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Optimized for Reels</span>
                </div>
              </div>
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
                song={selectedSong || SOUTHERN_CLASSICS[0]} 
                storyTexts={storyTexts}
                onTextChange={setStoryTexts}
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
              />
              
              {isExporting && (
                <VideoExporter 
                  photos={photos} 
                  song={selectedSong || null} 
                  texts={storyTexts} 
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
              <div className={`w-2 h-2 rounded-full ${state === 'music' ? 'bg-saree-gold' : 'bg-gray-200'}`} />
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
