import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, Song, TextConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RefreshCcw, Share2, Download, Copy, Check, Instagram, PenSquare, Loader2, Sparkles, Type as TypeIcon, Palette, Move, AlignLeft, AlignCenter, AlignRight, Sliders, ExternalLink } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import { getOrCreateCoutureFolder, uploadFileToDrive } from '../lib/drive';

interface ReelPreviewProps {
  photos: Photo[];
  song?: Song;
  storyTexts: string[];
  storyConfigs?: TextConfig[];
  transitionType?: number | 'auto';
  onTransitionChange?: (type: number | 'auto') => void;
  onExport?: () => void;
  onTextChange?: (texts: string[]) => void;
  onConfigsChange?: (configs: TextConfig[]) => void;
  aesthetic?: string;
  onAestheticChange?: (aesthetic: string) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  instagramCaption?: string;
  onInstagramCaptionChange?: (caption: string) => void;
  brandName?: string;
  showWatermark?: boolean;
  onBack?: () => void;
  onRestart?: () => void;
  isExporting?: boolean;
  exportProgress?: number;
  videoUrl?: string | null;
  driveEnabled?: boolean;
  instagramEnabled?: boolean;
}

const TRANSITION_VARIANTS = [
  { 
    name: "Golden Glimmer", 
    initial: { opacity: 0, scale: 1.1, filter: 'brightness(2) contrast(1.2)' }, 
    animate: { opacity: 1, scale: 1, filter: 'brightness(1) contrast(1)' }, 
    exit: { opacity: 0, scale: 0.9, filter: 'brightness(3) contrast(0.8) blur(10px)' } 
  },
  { 
    name: "Silk Reveal", 
    initial: { x: '100%', opacity: 0, skewX: -10 }, 
    animate: { x: 0, opacity: 1, skewX: 0 }, 
    exit: { x: '-10%', opacity: 0.5, scale: 0.95 } 
  },
  { 
    name: "Temple Bloom", 
    initial: { opacity: 0, scale: 1.05, filter: 'blur(30px) brightness(1.5)' }, 
    animate: { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)' }, 
    exit: { opacity: 0, scale: 0.95, filter: 'blur(30px) brightness(1.5)' } 
  },
  { 
    name: "Diagonal Wipe", 
    initial: { clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)', opacity: 0 }, 
    animate: { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', opacity: 1 }, 
    exit: { opacity: 0, transition: { duration: 0.5 } } 
  },
  { 
    name: "Macro Focus", 
    initial: { scale: 2, opacity: 0, filter: 'blur(10px)' }, 
    animate: { scale: 1, opacity: 1, filter: 'blur(0px)' }, 
    exit: { scale: 0.5, opacity: 0, filter: 'blur(20px)' } 
  },
  { 
    name: "Classic Fade", 
    initial: { opacity: 0 }, 
    animate: { opacity: 1 }, 
    exit: { opacity: 0 } 
  }
];

const TEXT_STYLES = [
  { container: "bottom-24 inset-x-6 text-center max-w-[90%] mx-auto", label: "Bottom Center", align: 'center' as const },
  { container: "bottom-24 left-10 text-left max-w-[80%]", label: "Bottom Left", align: 'left' as const },
  { container: "top-24 left-10 text-left max-w-[80%]", label: "Top Left", align: 'left' as const },
  { container: "top-24 right-10 text-right max-w-[80%] ml-auto", label: "Top Right", align: 'right' as const },
  { container: "bottom-36 inset-x-6 text-center max-w-[90%] mx-auto", label: "Middle Lower", align: 'center' as const },
  { container: "top-44 inset-x-6 text-center max-w-[90%] mx-auto", label: "Middle Upper", align: 'center' as const },
  { container: "bottom-44 right-10 text-right ml-auto max-w-[80%]", label: "Mid Right", align: 'right' as const },
  { container: "bottom-1/4 left-12 text-left max-w-[80%]", label: "Side Lower", align: 'left' as const }
];

const FONTS = [
  { id: 'serif', name: 'Classic Serif', class: 'serif-text italic' },
  { id: 'sans', name: 'Modern Sans', class: 'font-sans font-bold uppercase tracking-tighter' },
  { id: 'script', name: 'Elegant Script', class: 'display-text' },
  { id: 'display', name: 'Royal Display', class: 'display-text uppercase tracking-widest' }
];

const COLORS = [
  { id: 'white', name: 'Pearl White', hex: '#FFFFFF' },
  { id: 'gold', name: 'Temple Gold', hex: '#D4AF37' },
  { id: 'maroon', name: 'Kumkum', hex: '#722F37' },
  { id: 'cream', name: 'Silk Cream', hex: '#FFFDD0' }
];

export const COLOR_GRADES = [
  { id: 'none', name: 'Natural', filter: 'none' },
  { id: 'royal', name: 'Royal Heirloom', filter: 'contrast(1.1) saturate(1.1) sepia(0.1) brightness(0.95)' },
  { id: 'temple', name: 'Temple Gold', filter: 'contrast(1.05) saturate(1.3) hue-rotate(-5deg) brightness(1.05)' },
  { id: 'midnight', name: 'Midnight Berry', filter: 'contrast(1.2) saturate(1.4) hue-rotate(10deg) brightness(0.8)' },
  { id: 'vintage', name: 'Vintage Silk', filter: 'contrast(0.9) saturate(0.8) sepia(0.3) brightness(1.1)' },
  { id: 'emerald', name: 'Emerald Heritage', filter: 'contrast(1.15) saturate(1.2) hue-rotate(-20deg) brightness(0.9)' }
];

export default function ReelPreview({ 
  photos, 
  song, 
  storyTexts = [], 
  storyConfigs = [],
  transitionType = 'auto', 
  onTransitionChange, 
  onExport, 
  onTextChange,
  onConfigsChange,
  aesthetic = 'vintage_cinema',
  onAestheticChange,
  filter = 'none',
  onFilterChange,
  instagramCaption = '',
  onInstagramCaptionChange,
  brandName = 'SAREE HERITAGE',
  showWatermark = true,
  isExporting = false,
  exportProgress = 0,
  videoUrl = null,
  driveEnabled = false,
  instagramEnabled = false,
}: ReelPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'visuals' | 'typography' | 'grading'>('visuals');
  
  // Google Drive state
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSaveSuccess, setDriveSaveSuccess] = useState(false);
  const [driveSaveError, setDriveSaveError] = useState<string | null>(null);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [copiedDriveLink, setCopiedDriveLink] = useState(false);

  // Instagram direct post state
  const [isPostingToInstagram, setIsPostingToInstagram] = useState(false);
  const [instagramPostSuccess, setInstagramPostSuccess] = useState(false);
  const [instagramPostError, setInstagramPostError] = useState<string | null>(null);
  const [instagramPermalink, setInstagramPermalink] = useState<string | null>(null);
  const [showInstagramAuthModal, setShowInstagramAuthModal] = useState(false);

  // Connection settings
  const [instaAccessToken, setInstaAccessToken] = useState(() => {
    return localStorage.getItem('nivra_instagram_access_token') || '';
  });
  const [instaAccountId, setInstaAccountId] = useState(() => {
    return localStorage.getItem('nivra_instagram_account_id') || '';
  });
  const [instaUsername, setInstaUsername] = useState(() => {
    return localStorage.getItem('nivra_instagram_username') || '';
  });
  const [instaName, setInstaName] = useState(() => {
    return localStorage.getItem('nivra_instagram_name') || '';
  });
  const [instaProfilePic, setInstaProfilePic] = useState(() => {
    return localStorage.getItem('nivra_instagram_profile_pic') || '';
  });

  const [authAccounts, setAuthAccounts] = useState<any[]>([]);
  const [isAuthenticatingInsta, setIsAuthenticatingInsta] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDriveFileUrl(null);
    setInstagramPostSuccess(false);
    setInstagramPostError(null);
    setInstagramPermalink(null);
  }, [videoUrl]);

  useEffect(() => {
    localStorage.setItem('nivra_instagram_access_token', instaAccessToken);
    localStorage.setItem('nivra_instagram_account_id', instaAccountId);
    localStorage.setItem('nivra_instagram_username', instaUsername);
    localStorage.setItem('nivra_instagram_name', instaName);
    localStorage.setItem('nivra_instagram_profile_pic', instaProfilePic);
  }, [instaAccessToken, instaAccountId, instaUsername, instaName, instaProfilePic]);

  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
        setIsAuthenticatingInsta(false);
        const accounts = event.data.accounts || [];
        if (accounts.length > 0) {
          setAuthAccounts(accounts);
          // Auto-select the first account
          const first = accounts[0];
          setInstaAccessToken(first.accessToken || event.data.accessToken || '');
          setInstaAccountId(first.instagramId || '');
          setInstaUsername(first.username || '');
          setInstaName(first.name || '');
          setInstaProfilePic(first.profilePicture || '');
        } else {
          setInstagramPostError("Facebook authorization succeeded, but no linked Instagram Business or Creator accounts were found. Make sure your Instagram Account is linked to a Facebook Page.");
        }
      } else if (event.data?.type === 'INSTAGRAM_AUTH_ERROR') {
        setIsAuthenticatingInsta(false);
        setInstagramPostError(event.data.error || "Facebook Login failed.");
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  const handleDriveExport = async () => {
    if (!videoUrl) return;

    setIsSavingToDrive(true);
    setDriveSaveSuccess(false);
    setDriveSaveError(null);

    try {
      let token = getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
        } else {
          throw new Error("Google Authentication is required to upload to Drive.");
        }
      }

      // Fetch the generated video blob
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      let uploadBlob = blob;

      // Since browser-native MediaRecorder is WebM, transcode it server-side to high-compat standard H.264 MP4
      console.log("Transcoding source video to H.264 MP4 for maximum Google Drive compatibility...");
      
      const transcodeRes = await fetch("/api/transcode", {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "video/webm",
        },
        body: blob,
      });

      if (!transcodeRes.ok) {
        throw new Error(`MP4 Transcoder returned error status ${transcodeRes.status}`);
      }

      uploadBlob = await transcodeRes.blob();
      console.log("Server-side H.264 MP4 transcoding succeeded!");

      const folderId = await getOrCreateCoutureFolder(token, 'Kanchipuram Couture');
      const filename = `Kanchipuram_Saree_Reel_${Date.now()}.mp4`;
      const fileData = await uploadFileToDrive(token, uploadBlob, filename, folderId);

      const driveUrl = `https://drive.google.com/file/d/${fileData.id}/view?usp=drivesdk`;
      setDriveFileUrl(driveUrl);
      setDriveSaveSuccess(true);
      setTimeout(() => setDriveSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Drive upload failed:", err);
      setDriveSaveError(err.message || "Failed to save video to Google Drive.");
      setTimeout(() => setDriveSaveError(null), 5000);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleInstagramPost = async () => {
    if (!videoUrl) return;

    // Validate credentials
    if (!instaAccessToken || !instaAccountId) {
      setShowInstagramAuthModal(true);
      return;
    }

    setIsPostingToInstagram(true);
    setInstagramPostSuccess(false);
    setInstagramPostError(null);
    setInstagramPermalink(null);

    try {
      console.log("Preparing video binary for Instagram Direct publishing...");
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      console.log("Uploading video binary to public server cache...");
      const prepResponse = await fetch("/api/instagram/prepare", {
        method: "POST",
        headers: {
          "Content-Type": videoBlob.type || "video/mp4",
        },
        body: videoBlob,
      });

      if (!prepResponse.ok) {
        throw new Error("Failed to cache video on publishing server. Check network connection.");
      }

      const prepData = await prepResponse.json();
      const videoId = prepData.id;

      console.log("Initiating server-side direct Instagram publishing process...");
      const publishRes = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accessToken: instaAccessToken,
          instagramId: instaAccountId,
          videoId: videoId,
          caption: instagramCaption || "Luxury Heritage Couture. Created using Kanchipuram Couture. #kanchipuram #saree #reels #luxury"
        })
      });

      if (!publishRes.ok) {
        const errData = await publishRes.json();
        throw new Error(errData.error || "Direct publishing to Instagram failed.");
      }

      const publishData = await publishRes.json();
      if (publishData.success) {
        setInstagramPostSuccess(true);
        setInstagramPermalink(publishData.permalink);
        console.log("Direct Instagram post succeeded! Post URL:", publishData.permalink);
      } else {
        throw new Error("Instagram published with no success indication.");
      }
    } catch (err: any) {
      console.error("Direct Instagram publishing failed:", err);
      setInstagramPostError(err.message || "Failed to post video to Instagram directly.");
    } finally {
      setIsPostingToInstagram(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsAuthenticatingInsta(true);
    setInstagramPostError(null);
    try {
      const response = await fetch("/api/instagram/auth-url");
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Direct login API endpoint returned error.");
      }
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        'instagram_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!authWindow) {
        alert("Popups are blocked. Please enable popups to authenticate with Facebook/Instagram.");
        setIsAuthenticatingInsta(false);
      }
    } catch (err: any) {
      setIsAuthenticatingInsta(false);
      setInstagramPostError(err.message || "Could not launch Facebook Login pop-up.");
    }
  };

  // Initialize configs if empty
  useEffect(() => {
    if (storyConfigs && storyConfigs.length === 0 && storyTexts && storyTexts.length > 0) {
      const initialConfigs: TextConfig[] = storyTexts.map((_, i) => ({
        font: 'serif',
        color: '#FFFFFF',
        container: TEXT_STYLES[i % TEXT_STYLES.length].container,
        align: TEXT_STYLES[i % TEXT_STYLES.length].align
      }));
      onConfigsChange?.(initialConfigs);
    }
  }, [storyTexts?.length || 0]);

  const currentConfig = useMemo(() => {
    return storyConfigs[currentIndex] || {
      font: 'serif' as const,
      color: '#FFFFFF',
      container: TEXT_STYLES[currentIndex % TEXT_STYLES.length].container,
      align: TEXT_STYLES[currentIndex % TEXT_STYLES.length].align
    };
  }, [currentIndex, storyConfigs]);

  const updateCurrentConfig = (updates: Partial<TextConfig>) => {
    const newConfigs = [...storyConfigs];
    newConfigs[currentIndex] = { ...currentConfig, ...updates };
    onConfigsChange?.(newConfigs);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(instagramCaption);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = instagramCaption;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + prefix + selection + suffix + after;
    onInstagramCaptionChange?.(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      }
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    // Escape HTML first
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Simple markdown parsing for bold (*) and italic (_)
    // We use a safe approach by splitting and rendering as React elements if we want to be safe, 
    // but a string replacement with dangerouslySetInnerHTML is often what's requested for "visual rendering" 
    // in these simple mock-ups. However, I'll do it safely with a component.
    return text.split(/(\*.*?\*|_.*?_)/g).map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const seoHookThreshold = 125;
  const isHookValid = (instagramCaption?.length || 0) > 20 && (instagramCaption?.length || 0) <= seoHookThreshold;
  const captionLength = instagramCaption?.length || 0;

  // Cycle duration per photo in ms
  const PHOTO_DURATION = 4000;

  // Ensure we show all story texts if they exist
  const displayPhotos = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    
    // The master length is at least enough to cover all story texts
    const storyTextsLength = storyTexts?.length || 0;
    const targetLength = Math.max(photos.length, storyTextsLength, 4);
    
    const result: Photo[] = [];
    for (let i = 0; i < targetLength; i++) {
      result.push(photos[i % photos.length]);
    }
    return result;
  }, [photos, storyTexts?.length]);

  const AESTHETICS = [
    { id: 'vintage_cinema', name: 'Vintage Cinema' },
    { id: 'royal_palace', name: 'Royal Palace' },
    { id: 'temple_aura', name: 'Temple Aura' },
    { id: 'modern_chic', name: 'Modern Chic' }
  ];

  const currentVariant = useMemo(() => {
    const variantsLength = TRANSITION_VARIANTS.length || 1;
    if (transitionType === 'auto') {
      return TRANSITION_VARIANTS[currentIndex % variantsLength];
    }
    return TRANSITION_VARIANTS[Number(transitionType) % variantsLength];
  }, [currentIndex, transitionType]);

  const currentStyle = (TEXT_STYLES && TEXT_STYLES.length > 0) ? TEXT_STYLES[currentIndex % TEXT_STYLES.length] : null;

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
      // 1. Always stop current audio if it exists
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Clear source
        audioRef.current = null;
      }

      if (song?.url) {
        const newAudio = new Audio();
        newAudio.crossOrigin = "anonymous";
        
        // Wait for connection/loading to verify source
        const checkAudio = new Promise<boolean>((resolve) => {
          newAudio.oncanplay = () => resolve(true);
          newAudio.onerror = () => resolve(false);
          // Don't wait forever
          setTimeout(() => resolve(false), 2000);
        });

        newAudio.src = song.url;
        newAudio.loop = true;
        newAudio.preload = 'auto';
        
        const isSupported = await checkAudio;
        if (!isSupported) {
          console.warn("Audio source not supported or failed to load:", song.url);
          if (isCancelled) return;
          audioRef.current = null;
          return;
        }

        if (song.startOffset) {
          newAudio.currentTime = song.startOffset;
        }
        
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
        audioRef.current.src = "";
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

    if (isPlaying && displayPhotos && displayPhotos.length > 0) {
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
  }, [isPlaying, displayPhotos?.length]);

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
    if (!storyTexts || storyTexts.length === 0) return "";
    return storyTexts[currentIndex % storyTexts.length];
  }, [currentIndex, storyTexts]);

  const handleDownload = async () => {
    if (!videoUrl) return;

    if (Capacitor.isNativePlatform()) {
      try {
        console.log("Native download/share triggered for:", videoUrl);
        // Fetch the blob from the URL
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        
        // Convert to Base64 using FileReader (most reliable)
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1]);
          };
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.readAsDataURL(blob);
        });

        const fileName = `kanchipuram_couture_${new Date().getTime()}.mp4`;
        
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Kanchipuram Couture Reel',
          text: 'My latest bridal reel creation',
          url: savedFile.uri,
          dialogTitle: 'Save or Share Reel'
        });
      } catch (err: any) {
        console.error("Mobile share fail:", err);
        alert("Mobile save failed. Try long-pressing the video preview instead.");
      }
      return;
    }

    // Regular web download
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `kanchipuram_couture_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!photos || photos.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-8">
      <div className="text-center space-y-2">
        <h3 className="text-3xl display-text font-medium text-saree-maroon">Cinematic Soul</h3>
        <p className="text-sm text-gray-500 italic uppercase tracking-widest">
          Previewing with: {song?.title || 'No music selected'}
        </p>
      </div>

      {/* Reel Canvas - 9:16 Aspect Ratio */}
      <div className={`relative aspect-[9/16] w-full max-w-[340px] rounded-[48px] overflow-hidden shadow-2xl border-[6px] border-saree-ink bg-black group transition-all duration-700 aesthetic-${aesthetic.replace('_', '-')}`}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${displayPhotos[currentIndex].id}-${currentIndex}`}
            initial={currentVariant.initial}
            animate={{
              ...currentVariant.animate,
              scale: currentIndex % 2 === 0 ? [1, 1.15] : [1.15, 1], // Improved Ken Burns
            }}
            exit={currentVariant.exit}
            transition={{ 
              opacity: { duration: 1, ease: "easeInOut" },
              scale: { duration: 4.2, ease: "linear" },
              filter: { duration: 1 },
              x: { duration: 1, ease: [0.4, 0, 0.2, 1] },
              y: { duration: 1, ease: [0.4, 0, 0.2, 1] } 
            }}
            className={`absolute inset-0 photo-container luxury-vignette ${(aesthetic === 'royal_palace' || aesthetic === 'temple_aura') ? 'aesthetic-bloom' : ''}`}
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
                style={{ filter: COLOR_GRADES.find(g => g.id === filter)?.filter || 'none' }}
                className="w-full h-full object-cover scale-110 transition-[filter] duration-700" // Slight overscan to prevent edges showing during shake
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute px-6 ${currentConfig.container}`}
            >
              <div className="relative group cursor-text" onClick={handleEditClick}>
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={currentText}
                    onChange={handleTextUpdate}
                    onBlur={() => setIsEditing(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                    style={{ color: currentConfig.color }}
                    className={`w-full bg-black/50 text-2xl md:text-3xl border-b border-white/20 outline-none px-2 py-1 rounded-sm ${FONTS.find(f => f.id === currentConfig.font)?.class || 'serif-text italic'}`}
                  />
                ) : (
                  <h2 
                    style={{ color: currentConfig.color, textAlign: currentConfig.align }}
                    className={`text-2xl md:text-3xl drop-shadow-2xl leading-tight overflow-hidden ${FONTS.find(f => f.id === currentConfig.font)?.class || 'italic display-text font-medium'}`}
                  >
                    {(currentText || "").split(' ').map((word, wordIndex, wordsArr) => {
                      const wordStartGlobalIndex = wordsArr
                        .slice(0, wordIndex)
                        .reduce((sum, w) => sum + (w?.length || 0) + 1, 0);

                      return (
                        <span key={`${currentIndex}-${wordIndex}`} className="inline-block whitespace-nowrap overflow-hidden">
                          {word.split('').map((char, charIndex) => (
                            <motion.span
                              key={`${currentIndex}-${wordIndex}-${charIndex}`}
                              initial={{ opacity: 0, y: 30, rotateX: 90, scale: 0.9, filter: 'blur(8px)' }}
                              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: 'blur(0px)' }}
                              transition={{ 
                                delay: 0.6 + ((wordStartGlobalIndex + charIndex) * 0.04), 
                                duration: 0.8,
                                ease: [0.22, 1, 0.36, 1]
                              }}
                              className="inline-block"
                            >
                              {char}
                            </motion.span>
                          ))}
                          {wordIndex < wordsArr.length - 1 && (
                            <span className="inline-block">&nbsp;</span>
                          )}
                        </span>
                      );
                    })}
                  </h2>
                )}
                {!isEditing && (
                  <div className="absolute -top-6 -right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-saree-maroon/80 text-white p-1 rounded text-[8px] uppercase tracking-tighter shadow-lg">
                    Click to Edit
                  </div>
                )}
              </div>
              
              <motion.div 
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.4 }}
                transition={{ delay: 1.4, duration: 1.2, ease: "circOut" }}
                style={{ backgroundColor: currentConfig.color }}
                className={`mt-4 h-[1px] w-12 origin-left ${currentConfig.container.includes('center') ? 'mx-auto origin-center' : ''}`} 
              />
              
              {showWatermark && (
                <motion.p
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 1.8, duration: 1 }}
                  style={{ color: currentConfig.color }}
                  className={`mt-6 text-[8px] tracking-[0.4em] font-bold opacity-60 uppercase ${currentConfig.container.includes('center') ? 'text-center' : ''}`}
                >
                  {brandName}
                </motion.p>
              )}
            </motion.div>
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
        <div className="flex border-b border-gray-100 mb-2">
          {[
            { id: 'visuals', label: 'Visuals', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'grading', label: 'Exotic Grades', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'typography', label: 'Typography', icon: <TypeIcon className="w-3.5 h-3.5" /> },
            { id: 'text', label: 'Caption', icon: <Instagram className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-widest font-bold transition-all border-b-2 ${
                activeTab === tab.id ? 'border-saree-maroon text-saree-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'visuals' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
                        ? 'bg-saree-gold text-white border-saree-gold shadow-md'
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
                Stitch Style (Transition)
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => onTransitionChange?.('auto')}
                  className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all ${
                    transitionType === 'auto'
                      ? 'bg-saree-maroon text-white border-saree-maroon shadow-md'
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
                        ? 'bg-saree-maroon text-white border-saree-maroon shadow-md'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-saree-gold/30'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'grading' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 text-center">
                Signature Silk Grades
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_GRADES.map((grade) => (
                  <button
                    key={grade.id}
                    onClick={() => onFilterChange?.(grade.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                      filter === grade.id
                        ? 'bg-saree-maroon text-white border-saree-maroon shadow-lg scale-[1.02]'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-saree-gold/30'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl border border-white/20 overflow-hidden shadow-inner flex items-center justify-center bg-stone-100"
                      style={{ filter: grade.filter }}
                    >
                      <img src={photos[0]?.url} alt="" className="w-full h-full object-cover scale-150" />
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-center leading-tight">
                      {grade.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-gray-400 italic text-center">
              Curated tones designed to amplify the richness of high-end Kanchipuram silk.
            </p>
          </motion.div>
        )}

        {activeTab === 'typography' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
               <h4 className="text-xs font-bold uppercase tracking-widest text-saree-maroon">Typography Studio</h4>
               <span className="text-[10px] text-gray-400 italic">Slide {currentIndex + 1} of {displayPhotos.length}</span>
            </div>

            {/* Font Picker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <TypeIcon className="w-3 h-3" />
                Font Style
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => updateCurrentConfig({ font: f.id as any })}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      currentConfig.font === f.id 
                        ? 'border-saree-gold bg-saree-gold/5 text-saree-ink shadow-sm' 
                        : 'border-gray-100 text-gray-400 hover:border-saree-gold/30'
                    } ${f.class}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <Palette className="w-3 h-3" />
                Text Color
              </div>
              <div className="flex gap-4 p-1">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => updateCurrentConfig({ color: c.hex })}
                    className={`w-10 h-10 rounded-full border-2 transition-all relative ${
                      currentConfig.color === c.hex ? 'border-saree-maroon scale-110 shadow-lg' : 'border-gray-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {currentConfig.color === c.hex && <Check className={`w-4 h-4 absolute inset-0 m-auto ${c.id === 'white' || c.id === 'cream' ? 'text-saree-maroon' : 'text-white'}`} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Picker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <Move className="w-3 h-3" />
                Placement
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TEXT_STYLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => updateCurrentConfig({ container: s.container, align: s.align })}
                    className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                      currentConfig.container === s.container 
                        ? 'border-saree-gold bg-saree-gold/10 text-saree-gold shadow-sm' 
                        : 'border-gray-100 text-gray-300 hover:border-saree-gold/30'
                    }`}
                    title={s.label}
                  >
                    {s.align === 'left' ? <AlignLeft className="w-4 h-4" /> : s.align === 'right' ? <AlignRight className="w-4 h-4" /> : <AlignCenter className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="text-[9px] text-gray-400 italic text-center pt-2">
              Changes applied only to the current visible slide.
            </p>
          </motion.div>
        )}

        <div className="flex flex-col gap-4 w-full">
          <div className="flex gap-4">
            {!isExporting && (
              <button 
                onClick={restartReel}
                className="p-5 rounded-2xl bg-white border border-saree-gold/20 text-saree-gold hover:bg-saree-gold hover:text-white transition-all shadow-md group flex items-center justify-center"
                title="Restart Masterpiece"
              >
                <RefreshCcw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
              </button>
            )}
            
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {isExporting ? (
                  <motion.div
                    key="progress-bar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full py-2 space-y-3"
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-saree-gold animate-spin" />
                        <span className="text-[10px] text-saree-maroon font-bold uppercase tracking-[0.2em]">Curation in Progress</span>
                      </div>
                      <span className="text-[10px] text-saree-maroon font-mono font-bold">{Math.round(exportProgress)}%</span>
                    </div>
                    <div className="h-4 w-full bg-stone-100 rounded-full border border-stone-200 overflow-hidden relative shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgress}%` }}
                        className="h-full bg-gradient-to-r from-saree-maroon to-saree-gold relative transition-all duration-300 ease-out"
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-progress-stripe" />
                      </motion.div>
                    </div>
                    <p className="text-[9px] text-gray-400 italic text-center animate-pulse">Wait a moment while we curate your masterpiece...</p>
                  </motion.div>
                ) : (
                  <motion.button 
                    key="curate-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onExport}
                    disabled={photos.length === 0}
                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 group relative overflow-hidden ${
                      photos.length > 0
                        ? 'bg-saree-maroon text-white hover:bg-saree-maroon/90 shadow-saree-maroon/20' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Curate Masterpiece
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {driveSaveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold text-center">
              {driveSaveError}
            </div>
          )}

          {videoUrl && !isExporting ? (
            <div className="space-y-4 w-full">
              <div className={`${driveEnabled ? 'grid grid-cols-2' : 'flex'} gap-4 w-full`}>
                <button 
                  onClick={handleDownload}
                  className={`py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 group bg-saree-gold text-stone-950 hover:bg-saree-gold/90 shadow-saree-gold/20 ${driveEnabled ? '' : 'w-full'}`}
                >
                  {Capacitor.isNativePlatform() ? <Share2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                  {Capacitor.isNativePlatform() ? 'Save/Share' : 'Download'}
                </button>
                
                {driveEnabled && (
                  <button 
                    onClick={handleDriveExport}
                    disabled={isSavingToDrive}
                    className="py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 group bg-stone-900 border border-saree-gold/30 text-saree-gold hover:bg-stone-950 disabled:opacity-55"
                  >
                    {isSavingToDrive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : driveSaveSuccess ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <svg className="w-5 h-5 fill-current text-saree-gold" viewBox="0 0 24 24">
                        <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
                      </svg>
                    )}
                    {driveSaveSuccess ? 'Saved!' : 'Save Drive'}
                  </button>
                )}
              </div>

              {driveEnabled && driveFileUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-saree-gold/5 border border-saree-gold/20 flex flex-col gap-3 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-saree-gold font-bold text-xs uppercase tracking-widest">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
                    </svg>
                    Google Drive Link Ready
                  </div>
                  <p className="text-stone-500 text-[11px] leading-relaxed">
                    Your luxury heritage MP4 video has been uploaded. View or share it directly from Google Drive:
                  </p>
                  <div className="flex gap-2 w-full mt-1">
                    <a 
                      href={driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-saree-maroon text-white font-bold text-xs uppercase tracking-widest hover:bg-saree-ink transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Video
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(driveFileUrl);
                        setCopiedDriveLink(true);
                        setTimeout(() => setCopiedDriveLink(false), 3000);
                      }}
                      className="px-4 py-3 rounded-xl bg-stone-900 border border-saree-gold/20 text-saree-gold font-bold text-xs uppercase tracking-widest hover:bg-stone-950 transition-all flex items-center justify-center gap-2 min-w-[120px]"
                    >
                      {copiedDriveLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {instagramEnabled && (
                <div className="pt-2">
                  <button 
                    onClick={handleInstagramPost}
                    disabled={isPostingToInstagram}
                    className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 group bg-stone-900 text-saree-gold hover:bg-stone-950 shadow-saree-gold/10 border border-saree-gold/30 disabled:opacity-50"
                  >
                    {isPostingToInstagram ? (
                      <Loader2 className="w-5 h-5 animate-spin text-saree-gold" />
                    ) : instagramPostSuccess ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Instagram className="w-5 h-5 text-saree-gold group-hover:scale-110 transition-transform" />
                    )}
                    {isPostingToInstagram ? 'Publishing Reel...' : instagramPostSuccess ? 'Published to Instagram!' : 'Post to Instagram'}
                  </button>
                </div>
              )}

              {instagramEnabled && (instagramPostSuccess || instagramPostError) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border text-center flex flex-col gap-3 ${instagramPostSuccess ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                >
                  <div className={`flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest ${instagramPostSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    {instagramPostSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-saree-gold" />}
                    {instagramPostSuccess ? 'Instagram Live!' : 'Direct Posting Info'}
                  </div>
                  <p className="text-stone-500 text-[11px] leading-relaxed">
                    {instagramPostSuccess 
                      ? 'Your luxurious heritage reel has been successfully posted to your Instagram feed! Watch it live:' 
                      : instagramPostError}
                  </p>
                  {instagramPostSuccess && instagramPermalink && (
                    <div className="flex gap-2 w-full mt-1">
                      <a 
                        href={instagramPermalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl bg-saree-maroon text-white font-bold text-xs uppercase tracking-widest hover:bg-saree-ink transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Live Reel
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setShowInstagramAuthModal(true)}
                    className="text-[10px] text-saree-gold hover:underline font-bold uppercase tracking-wider mt-1"
                  >
                    Manage Instagram Credentials
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <button 
              disabled={true}
              className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-xl bg-stone-100 text-stone-400 cursor-not-allowed border-dashed border-2 border-stone-200"
            >
              <Download className="w-5 h-5" />
              Download Reel
            </button>
          )}
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
          className="w-full mt-8 p-6 rounded-3xl bg-white border border-saree-gold/10 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-saree-maroon">
              <Instagram className="w-5 h-5" />
              <h4 className="display-text text-xl font-medium">Instagram Conversion Machine</h4>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditingCaption(!isEditingCaption)}
                className={`p-2.5 rounded-full transition-all ${isEditingCaption ? 'bg-saree-maroon text-white shadow-md' : 'hover:bg-saree-gold/10 text-saree-gold'}`}
                title={isEditingCaption ? "Finish Editing" : "Edit Caption"}
              >
                {isEditingCaption ? <Check className="w-5 h-5" /> : <PenSquare className="w-5 h-5" />}
              </button>
              
              <button
                onClick={handleCopyCaption}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-saree-maroon text-white rounded-full text-xs font-bold uppercase tracking-[0.15em] hover:bg-saree-ink transition-all shadow-lg active:scale-95 group"
              >
                {isCopying ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Copy to Instagram
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Character Counters */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-colors ${isHookValid ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
              <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-1">SEO Hook (Lines 1-2)</span>
              <div className="flex items-end gap-1">
                <span className={`text-lg font-bold font-mono ${captionLength > seoHookThreshold ? 'text-orange-500' : 'text-saree-maroon'}`}>
                  {Math.min(captionLength, seoHookThreshold)}
                </span>
                <span className="text-[10px] text-gray-400 mb-1">/ {seoHookThreshold}</span>
              </div>
            </div>
            
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-1">Total Length</span>
              <div className="flex items-end gap-1">
                <span className="text-lg font-bold font-mono text-saree-maroon">{captionLength}</span>
                <span className="text-[10px] text-gray-400 mb-1">/ 2200</span>
              </div>
            </div>
          </div>

          <div className="relative group">
            {isEditingCaption && (
              <div className="absolute -top-14 left-0 right-0 flex items-center gap-2 p-2 bg-white border border-saree-gold/20 rounded-2xl shadow-lg z-20 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => insertFormatting('*')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-saree-gold/10 rounded-lg text-xs font-bold text-saree-maroon transition-colors whitespace-nowrap"
                  title="Make selection bold"
                >
                  <span className="bg-gray-100 px-1 rounded uppercase text-[8px] mr-1">Bold</span>
                  *text*
                </button>
                <button 
                  onClick={() => insertFormatting('_')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-saree-gold/10 rounded-lg text-xs font-italic italic text-saree-maroon transition-colors whitespace-nowrap"
                  title="Make selection italic"
                >
                  <span className="bg-gray-100 px-1 rounded uppercase text-[8px] mr-1 not-italic">Italic</span>
                  _text_
                </button>
                <div className="h-4 w-[1px] bg-gray-200 mx-1 flex-shrink-0" />
                <button 
                  onClick={() => insertFormatting('\n\n')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-saree-gold/10 rounded-lg text-xs text-saree-gold transition-colors whitespace-nowrap"
                  title="Insert a line break"
                >
                  ¶ New Line
                </button>
                <div className="h-4 w-[1px] bg-gray-200 mx-1 flex-shrink-0" />
                <span className="text-[8px] text-gray-400 uppercase tracking-tighter flex-shrink-0 pr-2">Nivra Tools</span>
              </div>
            )}

            {isEditingCaption ? (
              <textarea
                ref={textareaRef}
                value={instagramCaption}
                onChange={(e) => onInstagramCaptionChange?.(e.target.value)}
                className="w-full min-h-[300px] p-5 text-sm font-sans leading-relaxed text-gray-700 bg-white border border-saree-gold/20 rounded-2xl focus:ring-2 focus:ring-saree-gold/20 focus:border-saree-gold outline-none resize-none shadow-inner"
                placeholder="Compose your high-conversion caption..."
              />
            ) : (
              <div className="w-full min-h-[150px] p-5 text-sm font-sans leading-relaxed text-gray-700 whitespace-pre-wrap bg-saree-gold/5 rounded-2xl border border-saree-gold/10 relative overflow-hidden">
                {/* Visual feedback for the SEO Hook threshold */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-saree-gold/20" />
                <div className="relative">
                  {renderMarkdown(instagramCaption.substring(0, seoHookThreshold))}
                  <span className="opacity-30">{renderMarkdown(instagramCaption.substring(seoHookThreshold))}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg flex-1">
              <span className={`w-2 h-2 rounded-full ${isHookValid ? 'bg-green-500 animate-pulse' : 'bg-orange-400 animate-bounce'}`} />
              {isHookValid ? 'Hook Impact: High' : 'Optimize first 125 chars'}
            </div>
            <p className="text-[8px] italic normal-case text-gray-300">
              * Instagram filters most text after 125 characters. Focus on the hook!
            </p>
          </div>
        </motion.div>
      )}

      {showInstagramAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-saree-gold/20 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 bg-stone-900 border-b border-saree-gold/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-saree-gold" />
                <h3 className="display-text text-lg font-medium text-white tracking-wide">Instagram Connection Setup</h3>
              </div>
              <button 
                onClick={() => setShowInstagramAuthModal(false)}
                className="text-stone-400 hover:text-white transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              {instaAccountId && instaUsername ? (
                <div className="p-4 bg-saree-gold/5 border border-saree-gold/20 rounded-2xl flex items-center gap-4">
                  {instaProfilePic ? (
                    <img 
                      src={instaProfilePic} 
                      alt={instaUsername} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-saree-gold/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-saree-maroon/25 text-saree-maroon flex items-center justify-center font-bold text-lg uppercase">
                      {instaUsername[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-saree-ink truncate">{instaName || 'Connected Account'}</p>
                    <p className="text-xs text-stone-500 truncate">@{instaUsername}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">ID: {instaAccountId}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setInstaAccessToken('');
                      setInstaAccountId('');
                      setInstaUsername('');
                      setInstaName('');
                      setInstaProfilePic('');
                      setAuthAccounts([]);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-saree-gold/10 text-saree-gold rounded-full flex items-center justify-center mx-auto">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-saree-ink">Connect Your Instagram Professional Account</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                    To post directly, link your Instagram Business/Creator Account to a Facebook Page, then click Connect.
                  </p>
                  <button 
                    onClick={handleFacebookLogin}
                    disabled={isAuthenticatingInsta}
                    className="px-6 py-3 bg-saree-maroon hover:bg-saree-ink text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-55"
                  >
                    {isAuthenticatingInsta ? <Loader2 className="w-4 h-4 animate-spin text-saree-gold" /> : <Instagram className="w-4 h-4" />}
                    {isAuthenticatingInsta ? 'Connecting...' : 'Connect with Facebook'}
                  </button>
                </div>
              )}

              {/* If we have multiple accounts discovered during login, show selection */}
              {authAccounts.length > 1 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-saree-ink">Select Instagram Account:</p>
                  <div className="space-y-2">
                    {authAccounts.map((acc) => (
                      <button
                        key={acc.instagramId}
                        onClick={() => {
                          setInstaAccessToken(acc.accessToken || instaAccessToken);
                          setInstaAccountId(acc.instagramId);
                          setInstaUsername(acc.username);
                          setInstaName(acc.name);
                          setInstaProfilePic(acc.profilePicture);
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          instaAccountId === acc.instagramId 
                            ? 'border-saree-gold bg-saree-gold/5 shadow-sm' 
                            : 'border-gray-100 hover:border-saree-gold/30'
                        }`}
                      >
                        {acc.profilePicture ? (
                          <img 
                            src={acc.profilePicture} 
                            alt={acc.username} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold uppercase text-xs">
                            {acc.username[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate text-stone-800">{acc.name}</p>
                          <p className="text-[10px] text-stone-500">@{acc.username}</p>
                        </div>
                        {instaAccountId === acc.instagramId && (
                          <Check className="w-4 h-4 text-saree-gold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Config Section */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  — Or Configure Manually (For Testing & Tokens) —
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-stone-600 mb-1">
                      Instagram Business Account ID
                    </label>
                    <input 
                      type="text" 
                      value={instaAccountId}
                      onChange={(e) => {
                        setInstaAccountId(e.target.value);
                        if (!e.target.value) {
                          setInstaUsername('');
                        } else if (!instaUsername) {
                          setInstaUsername('manual_account');
                        }
                      }}
                      placeholder="e.g. 17841405367890123"
                      className="w-full p-3 text-xs border border-gray-200 rounded-xl outline-none focus:border-saree-gold focus:ring-1 focus:ring-saree-gold/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-stone-600 mb-1">
                      Meta Access Token
                    </label>
                    <input 
                      type="password" 
                      value={instaAccessToken}
                      onChange={(e) => setInstaAccessToken(e.target.value)}
                      placeholder="EAAQD... (Page or User Access Token)"
                      className="w-full p-3 text-xs border border-gray-200 rounded-xl outline-none focus:border-saree-gold focus:ring-1 focus:ring-saree-gold/20 font-mono"
                    />
                  </div>
                  {instaAccountId && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-stone-600 mb-1">
                        Display Username (Optional)
                      </label>
                      <input 
                        type="text" 
                        value={instaUsername}
                        onChange={(e) => setInstaUsername(e.target.value)}
                        placeholder="e.g. luxury_kanchipuram_sarees"
                        className="w-full p-3 text-xs border border-gray-200 rounded-xl outline-none focus:border-saree-gold focus:ring-1 focus:ring-saree-gold/20"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-stone-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowInstagramAuthModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 font-bold text-xs uppercase tracking-widest text-stone-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
