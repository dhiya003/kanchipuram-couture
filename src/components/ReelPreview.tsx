import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, Song } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RefreshCcw, Share2, Download, Copy, Check, Instagram, PenSquare } from 'lucide-react';

interface ReelPreviewProps {
  photos: Photo[];
  song?: Song;
  storyTexts: string[];
  transitionType?: number | 'auto';
  onTransitionChange?: (type: number | 'auto') => void;
  onExport?: () => void;
  onTextChange?: (texts: string[]) => void;
  aesthetic?: string;
  onAestheticChange?: (aesthetic: string) => void;
  instagramCaption?: string;
  onInstagramCaptionChange?: (caption: string) => void;
  brandName?: string;
  showWatermark?: boolean;
}

const TRANSITION_VARIANTS = [
  { name: "Cinematic Zoom", initial: { scale: 1.2, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 } },
  { name: "Classic Fade", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  { name: "Slide Left", initial: { x: '100%', opacity: 0, filter: 'blur(20px)' }, animate: { x: 0, opacity: 1, filter: 'blur(0px)' }, exit: { x: '-100%', opacity: 0, filter: 'blur(20px)' } },
  { name: "Slide Up", initial: { y: '100%', opacity: 0, filter: 'blur(20px)' }, animate: { y: 0, opacity: 1, filter: 'blur(0px)' }, exit: { y: '-100%', opacity: 0, filter: 'blur(20px)' } },
  { name: "Dreamy Blur", initial: { filter: 'blur(30px)', opacity: 0, scale: 1.1 }, animate: { filter: 'blur(0px)', opacity: 1, scale: 1 }, exit: { filter: 'blur(30px)', opacity: 0, scale: 0.9 } },
  { name: "Artistic Tilt", initial: { rotate: 5, scale: 1.3, opacity: 0 }, animate: { rotate: 0, scale: 1, opacity: 1 }, exit: { rotate: -5, scale: 0.9, opacity: 0 } },
  { name: "Slide Right", initial: { x: '-100%', opacity: 0, filter: 'blur(20px)' }, animate: { x: 0, opacity: 1, filter: 'blur(0px)' }, exit: { x: '100%', opacity: 0, filter: 'blur(20px)' } },
  { name: "Slide Down", initial: { y: '-100%', opacity: 0, filter: 'blur(20px)' }, animate: { y: 0, opacity: 1, filter: 'blur(0px)' }, exit: { y: '100%', opacity: 0, filter: 'blur(20px)' } },
  { name: "Diagonal", initial: { x: '50%', y: '50%', opacity: 0, filter: 'blur(8px)' }, animate: { x: 0, y: 0, opacity: 1, filter: 'blur(0px)' }, exit: { x: '-50%', y: '-50%', opacity: 0, filter: 'blur(8px)' } }
];

const TEXT_STYLES = [
  { container: "bottom-20 inset-x-0 text-center", label: "THE COLLECTION" },
  { container: "bottom-20 left-8 text-left max-w-[80%]", label: "HERITAGE" },
  { container: "top-20 left-8 text-left max-w-[80%]", label: "SIGNATURE" },
  { container: "bottom-32 inset-x-0 text-center", label: "TIMELESS SILK" },
  { container: "top-40 inset-x-0 text-center", label: "ETHEREAL" },
  { container: "bottom-40 right-8 text-right max-w-[80%]", label: "CRAFTMANSHIP" },
  { container: "top-1/3 inset-x-12 text-center", label: "ARTISTRY" },
  { container: "bottom-1/4 left-10 text-left", label: "BRIDE'S CHOICE" }
];

export default function ReelPreview({ 
  photos, 
  song, 
  storyTexts, 
  transitionType = 'auto', 
  onTransitionChange, 
  onExport, 
  onTextChange,
  aesthetic = 'vintage_cinema',
  onAestheticChange,
  instagramCaption = '',
  onInstagramCaptionChange,
  brandName = 'SAREE HERITAGE',
  showWatermark = true
}: ReelPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(instagramCaption);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  // Cycle duration per photo in ms
  const PHOTO_DURATION = 3000;

  // Ensure minimum 10 seconds (roughly 4 segments of 3s each)
  const displayPhotos = useMemo(() => {
    if (photos.length === 0) return [];
    if (photos.length === 1) return [photos[0], photos[0], photos[0], photos[0]];
    if (photos.length === 2) return [photos[0], photos[1], photos[0], photos[1]];
    if (photos.length === 3) return [photos[0], photos[1], photos[2], photos[0]];
    return photos;
  }, [photos]);

  const AESTHETICS = [
    { id: 'vintage_cinema', name: 'Vintage Cinema' },
    { id: 'royal_palace', name: 'Royal Palace' },
    { id: 'temple_aura', name: 'Temple Aura' },
    { id: 'modern_chic', name: 'Modern Chic' }
  ];

  const currentVariant = useMemo(() => {
    if (transitionType === 'auto') {
      return TRANSITION_VARIANTS[currentIndex % TRANSITION_VARIANTS.length];
    }
    return TRANSITION_VARIANTS[transitionType % TRANSITION_VARIANTS.length];
  }, [currentIndex, transitionType]);

  const currentStyle = TEXT_STYLES[currentIndex % TEXT_STYLES.length];

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTexts = [...storyTexts];
    newTexts[currentIndex] = e.target.value;
    onTextChange?.(newTexts);
  };

  useEffect(() => {
    let isCancelled = false;

    const setupAudio = async () => {
      if (song?.url) {
        // Clean up previous audio immediately to avoid overlaps
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const newAudio = new Audio(song.url);
        newAudio.loop = true;
        newAudio.preload = 'auto'; // Force extra buffering info
        
        if (song.startOffset) {
          newAudio.currentTime = song.startOffset;
        }
        
        newAudio.onerror = (e) => {
          console.error("Audio failed to load:", song.url, e);
          // Optional: set a UI state for audio error
        };

        if (isCancelled) return;
        audioRef.current = newAudio;
        
        if (isPlaying) {
          try {
            await newAudio.play();
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error("Reel audio failed to start:", err);
            }
          }
        }
      }
    };

    setupAudio();

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [song]);

  useEffect(() => {
    const managePlayback = async () => {
      const audio = audioRef.current;
      if (audio) {
        if (isPlaying) {
          try {
            await audio.play();
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error("Reel audio play failed:", err);
            }
          }
        } else {
          audio.pause();
        }
      }
    };
    
    managePlayback();
  }, [isPlaying]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    if (isPlaying && displayPhotos.length > 0) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayPhotos.length);
        setProgress(0);
      }, PHOTO_DURATION);

      progressTimer = setInterval(() => {
        setProgress((prev) => Math.min(prev + (100 / (PHOTO_DURATION / 100)), 100));
      }, 100);
    }

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, [isPlaying, displayPhotos.length]);

  const restartReel = () => {
    setCurrentIndex(0);
    setProgress(0);
    if (audioRef.current && song?.startOffset) {
      audioRef.current.currentTime = song.startOffset;
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (!isPlaying) setIsPlaying(true);
  };

  const currentText = useMemo(() => {
    return storyTexts[currentIndex % storyTexts.length];
  }, [currentIndex, storyTexts]);

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-8">
      <div className="text-center space-y-2">
        <h3 className="text-3xl display-text font-medium text-saree-maroon">Cinematic Soul</h3>
        <p className="text-sm text-gray-500 italic uppercase tracking-widest">
          Previewing with: {song?.title || 'No music selected'}
        </p>
      </div>

      {/* Reel Canvas - 9:16 Aspect Ratio */}
      <div className={`relative aspect-[9/16] w-full max-w-[340px] rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-saree-ink bg-black group transition-all duration-500 aesthetic-${aesthetic.replace('_', '-')}`}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${displayPhotos[currentIndex].id}-${currentIndex}`}
            initial={currentVariant.initial}
            animate={{
              ...currentVariant.animate,
              scale: currentIndex % 2 === 0 ? [1, 1.12] : [1.12, 1], // Continuous zoom
            }}
            exit={currentVariant.exit}
            transition={{ 
              opacity: { duration: 0.8 },
              scale: { duration: 3, ease: "linear" },
              filter: { duration: 0.8 },
              x: { duration: 0.8 },
              y: { duration: 0.8 } 
            }}
            className={`absolute inset-0 photo-container ${(aesthetic === 'royal_palace' || aesthetic === 'temple_aura') ? 'aesthetic-bloom' : ''}`}
          >
            <motion.div
              className="w-full h-full"
              animate={currentVariant.name.includes('Zoom') ? {
                x: [0, -0.5, 0.5, -0.3, 0],
                y: [0, 0.4, -0.4, 0.2, 0],
                rotate: [0, 0.05, -0.05, 0]
              } : {}}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <img 
                src={displayPhotos[currentIndex].url} 
                alt="Reel Slide" 
                className="w-full h-full object-cover scale-110" // Slight overscan to prevent edges showing during shake
              />
            </motion.div>
            
            {/* Lens Flare - Only on Zoom transitions or every few slides */}
            {(currentVariant.name.includes("Zoom") || currentIndex % 3 === 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: -20, y: -20 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.5, 4, 6], x: [0, 20, 40], y: [0, 10, 20] }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="lens-flare-overlay z-40"
              />
            )}

            {/* Elegant Atmosphere Overlays */}
            <div className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/70 to-transparent ${aesthetic === 'modern_chic' ? 'hidden' : ''}`} />
            <div className={`absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#100c08]/90 to-transparent ${aesthetic === 'modern_chic' ? 'hidden' : ''}`} />
            <div className="absolute inset-0 bg-saree-gold/5 mix-blend-overlay" />
            <div className={`absolute inset-0 pointer-events-none film-grain ${aesthetic === 'modern_chic' ? 'hidden' : ''}`} />
            
            {/* Luxury Glint / Light Flare */}
            <div className="luxury-shimmer" />
            
            {/* Cinematic Light Leak */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden opacity-40 ${(aesthetic === 'modern_chic' || aesthetic === 'royal_palace') ? 'hidden' : ''}`}>
              <div className="absolute -inset-[100%] light-leak animate-light-leak" />
            </div>
            
            {/* Storyline Text Overlay */}
            <div className={`absolute px-6 ${currentStyle.container}`}>
              <motion.p 
                initial={{ letterSpacing: '0.1em', opacity: 0, y: 10 }}
                animate={{ letterSpacing: '0.3em', opacity: 0.8, y: 0 }}
                transition={{ delay: 0.4, duration: 1 }}
                className="text-saree-gold text-[10px] uppercase font-bold mb-2"
              >
                {currentStyle.label}
              </motion.p>
              
              <div className="relative group cursor-text" onClick={handleEditClick}>
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={currentText}
                    onChange={handleTextUpdate}
                    onBlur={() => setIsEditing(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                    className={`w-full bg-black/40 text-white text-2xl md:text-3xl border-b border-saree-gold/50 outline-none px-2 py-1 ${aesthetic === 'modern_chic' ? 'font-sans' : 'italic display-text'}`}
                  />
                ) : (
                  <h2 className={`text-2xl md:text-3xl text-white drop-shadow-xl leading-tight overflow-hidden ${aesthetic === 'modern_chic' ? 'font-sans font-bold uppercase tracking-tight' : 'italic display-text'}`}>
                    {currentText.split('').map((char, index) => (
                      <motion.span
                        key={`${displayPhotos[currentIndex].id}-${currentIndex}-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ 
                          delay: 0.6 + (index * 0.05), 
                          duration: 0.1,
                          ease: "linear"
                        }}
                        className="inline-block whitespace-pre"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </h2>
                )}
                {!isEditing && (
                  <div className="absolute -top-6 -right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-saree-maroon/80 text-white p-1 rounded text-[8px] uppercase tracking-tighter">
                    Click to Edit
                  </div>
                )}
              </div>
              
              <motion.div 
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.4 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className={`mt-4 h-[1px] w-12 bg-saree-gold origin-left ${currentStyle.container.includes('center') ? 'mx-auto origin-center' : ''}`} 
              />
              
              {showWatermark && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className={`mt-6 text-[8px] tracking-[0.4em] font-bold text-saree-gold/80 uppercase ${currentStyle.container.includes('center') ? 'text-center' : ''}`}
                >
                  {brandName}
                </motion.p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bars */}
        <div className="absolute top-4 inset-x-4 flex gap-1 z-50">
          {displayPhotos.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ 
                  width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="p-4 rounded-full bg-black/40 backdrop-blur-md">
            {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white pl-1" />}
          </div>
        </div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 z-40 outline-none"
        />
      </div>

      {/* Control Panel */}
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 text-center">
            AI Aesthetic
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            {AESTHETICS.map((a) => (
              <button
                key={a.id}
                onClick={() => onAestheticChange?.(a.id)}
                className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all ${
                  aesthetic === a.id
                    ? 'bg-saree-gold text-white border-saree-gold'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-saree-gold/30'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 text-center">
            Stitch Style
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => onTransitionChange?.('auto')}
              className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all ${
                transitionType === 'auto'
                  ? 'bg-saree-maroon text-white border-saree-maroon'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-saree-gold/30'
              }`}
            >
              Cinematic Mix
            </button>
            {TRANSITION_VARIANTS.map((v, i) => (
              <button
                key={i}
                onClick={() => onTransitionChange?.(i)}
                className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all ${
                  transitionType === i
                    ? 'bg-saree-maroon text-white border-saree-maroon'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-saree-gold/30'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={restartReel}
            className="p-4 rounded-full bg-white border border-saree-gold/20 text-saree-gold hover:bg-saree-gold hover:text-white transition-all shadow-md group"
            title="Restart"
          >
            <RefreshCcw className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
          </button>
          
          <button 
            onClick={onExport}
            className={`px-8 py-4 rounded-full flex items-center gap-2 font-medium transition-all shadow-lg active:scale-95 ${
              photos.length > 0 ? 'bg-saree-maroon text-white hover:bg-saree-maroon/90 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-5 h-5" />
            Export Reel
          </button>

          <button 
            className="p-4 rounded-full bg-white border border-saree-gold/20 text-saree-gold hover:bg-saree-gold hover:text-white transition-all shadow-md"
            title="Share"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 uppercase tracking-[0.2em] font-sans">
        Generated with Kanchipuram AI Engine
      </div>

      {/* Instagram High-Conversion Caption Section */}
      {instagramCaption && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-8 p-6 rounded-3xl bg-white border border-saree-gold/10 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-saree-maroon">
              <Instagram className="w-5 h-5" />
              <h4 className="display-text text-xl font-medium">Nivra High-Conversion Caption</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingCaption(!isEditingCaption)}
                className="p-2 rounded-full hover:bg-saree-gold/10 text-saree-gold transition-colors"
                title="Edit Caption"
              >
                <PenSquare className="w-5 h-5" />
              </button>
              <button
                onClick={handleCopyCaption}
                className="flex items-center gap-2 px-4 py-2 bg-saree-gold text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-saree-maroon transition-all shadow-md active:scale-95"
              >
                {isCopying ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Text
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative group">
            {isEditingCaption ? (
              <textarea
                value={instagramCaption}
                onChange={(e) => onInstagramCaptionChange?.(e.target.value)}
                className="w-full min-h-[300px] p-4 text-sm font-sans leading-relaxed text-gray-700 bg-gray-50 border border-saree-gold/20 rounded-xl focus:ring-1 focus:ring-saree-gold outline-none resize-none"
              />
            ) : (
              <div className="w-full min-h-[100px] p-4 text-sm font-sans leading-relaxed text-gray-700 whitespace-pre-wrap bg-saree-gold/5 rounded-xl border border-saree-gold/5">
                {instagramCaption}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] bg-gray-50 p-3 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Optimized for Search & Conversion
          </div>
        </motion.div>
      )}
    </div>
  );
}
