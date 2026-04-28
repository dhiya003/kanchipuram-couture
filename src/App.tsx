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
import SuccessView from './components/SuccessView';
import HistoryView from './components/HistoryView';

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

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song>();
  const [selectedTransition, setSelectedTransition] = useState<number | 'auto'>('auto');
  const [storyTexts, setStoryTexts] = useState<string[]>(DEFAULT_STORY_TEXTS);
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>('vintage_cinema');
  const [brandName, setBrandName] = useState('SAREE HERITAGE');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<Reel[]>(() => {
    const saved = localStorage.getItem('saree_reels_history');
    return saved ? JSON.parse(saved) : [];
  });

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzeSarees = async () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    try {
      // Prepare photos by converting first few to base64 for AI analysis
      const photosForAI = await Promise.all(
        photos.slice(0, 3).map(async (p) => {
          try {
            const base64 = await urlToBase64(p.url);
            return { ...p, base64 };
          } catch (e) {
            console.error("Failed to convert image to base64", e);
            return p;
          }
        })
      );

      const response = await fetch('/api/analyze-sarees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: photosForAI, customNotes })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.captions) setStoryTexts(data.captions);
        if (data.aesthetic) setSelectedAesthetic(data.aesthetic);
        if (data.instagramCaption) setInstagramCaption(data.instagramCaption);
      }
    } catch (error) {
      console.error("AI Analysis Failed", error);
      // Fallback to defaults (already set)
    } finally {
      setIsAnalyzing(false);
      // Auto-select a song if none selected
      if (!selectedSong && SOUTHERN_CLASSICS.length > 0) {
        setSelectedSong(SOUTHERN_CLASSICS[0]);
      }
      setState('music');
    }
  };

  const nextStep = () => {
    if (state === 'landing') setState('upload');
    else if (state === 'upload') analyzeSarees();
    else if (state === 'music') setState('preview');
    else if (state === 'preview') setState('exporting');
  };

  useEffect(() => {
    if (state === 'exporting') {
      // Mock timer removed - logic moved to VideoExporter onComplete
    }
  }, [state]);

  const handleExportComplete = () => {
    const newReel: Reel = {
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      photos: [...photos],
      song: selectedSong,
      transitionType: selectedTransition
    };
    const updatedHistory = [newReel, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('saree_reels_history', JSON.stringify(updatedHistory));
    
    setState('complete');
  };

  const deleteReel = (id: string) => {
    const updatedHistory = history.filter(r => r.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('saree_reels_history', JSON.stringify(updatedHistory));
  };

  const selectReelFromHistory = (reel: Reel) => {
    setPhotos(reel.photos);
    setSelectedSong(reel.song);
    setSelectedTransition(reel.transitionType ?? 'auto');
    setState('preview');
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
            onClick={() => setState('landing')}
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-saree-ink">Brand Watermark</span>
                        <span className="text-[10px] text-gray-400">Show brand name at the bottom</span>
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

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* AI Loading Overlay */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-saree-paper/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-24 h-24 relative mb-6">
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
              </div>
              <h3 className="display-text text-2xl text-saree-maroon italic mb-2">Curating Your Heritage Story...</h3>
              <p className="serif-text text-gray-500 max-w-xs">Our AI is analyzing your sarees to craft poetic fragments for your reel.</p>
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
              key="upload"
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
                brandName={brandName}
                onBrandNameChange={setBrandName}
              />
            </motion.div>
          )}

          {state === 'music' && (
            <motion.div 
              key="music"
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
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full h-full"
            >
              <ReelPreview 
                photos={photos} 
                song={selectedSong} 
                storyTexts={storyTexts}
                instagramCaption={instagramCaption}
                onInstagramCaptionChange={setInstagramCaption}
                transitionType={selectedTransition}
                onTransitionChange={setSelectedTransition}
                onTextChange={setStoryTexts}
                aesthetic={selectedAesthetic}
                onAestheticChange={setSelectedAesthetic}
                brandName={brandName}
                showWatermark={showWatermark}
                onExport={() => setState('exporting')} 
              />
            </motion.div>
          )}

          {state === 'exporting' && (
            <motion.div 
              key="exporting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <VideoExporter 
                photos={photos} 
                song={selectedSong} 
                texts={storyTexts} 
                transitionType={selectedTransition}
                aesthetic={selectedAesthetic}
                brandName={brandName}
                showWatermark={showWatermark}
                onComplete={handleExportComplete} 
              />
            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div 
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full h-full"
            >
              <SuccessView onRestart={() => setState('landing')} />
            </motion.div>
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
              {state === 'preview' ? 'Complete' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
