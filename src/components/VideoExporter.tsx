import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Loader2, Music, AlertCircle, Share2, RefreshCcw, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface Photo {
  id: string;
  url: string;
  color: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
}

interface VideoExporterProps {
  photos: Photo[];
  texts: string[];
  song: Song | null;
  aesthetic: string;
  brandName: string;
  showWatermark: boolean;
  transitionType: 'auto' | number;
  onReady?: (url: string) => void;
  onComplete: () => void;
  headless?: boolean;
  onProgress?: (progress: number) => void;
}

const WIDTH = 720;
const HEIGHT = 1280;
const FPS = 30;
const PHOTO_DURATION = 4;

const TEXT_STYLES_DATA = [
  { label: "THE COLLECTION", align: 'center', y: HEIGHT - 240 },
  { label: "HERITAGE", align: 'left', x: 80, y: HEIGHT - 240 },
  { label: "SIGNATURE", align: 'left', x: 80, y: 260 },
  { label: "TIMELESS SILK", align: 'center', y: HEIGHT - 340 },
  { label: "ETHEREAL", align: 'center', y: 460 },
  { label: "CRAFTMANSHIP", align: 'right', x: WIDTH - 80, y: HEIGHT - 440 },
  { label: "ARTISTRY", align: 'center', y: HEIGHT / 3 + 60 },
  { label: "BRIDE'S CHOICE", align: 'left', x: 100, y: HEIGHT * 0.75 + 10 }
];

const VideoExporter: React.FC<VideoExporterProps> = ({ 
  photos, 
  texts, 
  song, 
  aesthetic, 
  brandName, 
  showWatermark,
  transitionType,
  onReady,
  onComplete,
  headless = false,
  onProgress
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'processing' | 'finalizing' | 'done' | 'error'>('loading');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [extension, setExtension] = useState('webm');

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    console.log("VideoExporter mounted. Starting processExport.");
    let isCancelled = false;
    let audioCtx: AudioContext | null = null;
    let combinedStream: MediaStream | null = null;
    let audio: HTMLAudioElement | null = null;
    let animationFrameId: number = 0;

    const processExport = async () => {
      try {
        setStatus('loading');
        console.log("Process Export Started with:", { 
          photosCount: photos.length, 
          hasSong: !!song, 
          aesthetic, 
          transitionType 
        });
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error("Canvas ref is null!");
          setStatus('error');
          return;
        }
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          console.error("Could not get 2d context!");
          setStatus('error');
          return;
        }

        if (!window.MediaRecorder) {
          console.error("MediaRecorder not supported in this browser!");
          setStatus('error');
          return;
        }

        console.log("Assets loading started...");
        // Load images
        const images = await Promise.all(photos.map(p => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.error(`Failed to load image: ${p.url}`);
              reject();
            };
            img.src = p.url;
          });
        })).catch(err => {
          console.error("One or more images failed to load.");
          throw new Error("IMAGE_LOAD_FAILED");
        });

        if (isCancelled) return;

        let displayImages = images;
        let displayTexts = texts;
        if (images.length === 1) {
          displayImages = [images[0], images[0], images[0], images[0]];
          displayTexts = [texts[0] || '', texts[0] || '', texts[0] || '', texts[0] || ''];
        } else if (images.length === 2) {
          displayImages = [images[0], images[1], images[0], images[1]];
          displayTexts = [texts[0] || '', texts[1] || '', texts[0] || '', texts[1] || ''];
        }

        const totalDuration = displayImages.length * PHOTO_DURATION;
        const totalFrames = Math.ceil(totalDuration * FPS);
        
        // Setup Media Stream and Recorder
        audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = song?.url || '';
        
        const stream = canvas.captureStream(FPS);

        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioCtx.createMediaStreamDestination();
          
          let audioTrackMatched = false;
          
          // Handle audio errors and loading gracefully
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
               console.warn("Audio load timed out for recorder, proceeding with silent loop if needed.");
               resolve();
            }, 6000);

            audio.oncanplay = () => {
              clearTimeout(timeout);
              try {
                if (audioCtx && audioCtx.state !== 'closed') {
                  const source = audioCtx.createMediaElementSource(audio);
                  source.connect(dest);
                  source.connect(audioCtx.destination);
                  audioTrackMatched = true;
                }
              } catch (e) {
                console.warn("Could not connect audio source to recorder:", e);
              }
              resolve();
            };

            audio.onerror = () => {
              clearTimeout(timeout);
              console.warn("Audio failed to load for recorder, continuing silently.");
              resolve();
            };
            
            if (!song?.url) resolve();
            audio.load();
          });
          
          if (isCancelled) return;

          const audioTracks = audioTrackMatched ? dest.stream.getAudioTracks() : [];
          combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...audioTracks
          ]);
        } catch (audioErr) {
          console.warn("Audio recording setup failed, falling back to video only:", audioErr);
          combinedStream = new MediaStream([...stream.getVideoTracks()]);
        }

        const mimeTypes = [
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ];
        const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        
        console.log(`Using MIME type: ${mimeType}`);
        const recorder = new MediaRecorder(combinedStream, { 
          mimeType, 
          videoBitsPerSecond: 6000000 
        });
        recorderRef.current = recorder;
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = (e) => {
          console.error("MediaRecorder error:", e);
          setStatus('error');
        };
        recorder.onstop = () => {
          console.log("Recorder stopped. Chunks collected:", chunks.length);
          if (isCancelled) {
            chunks.length = 0;
            return;
          }

          try {
            const blob = new Blob(chunks, { type: mimeType });
            videoBlobRef.current = blob;
            chunks.length = 0; 
            
            if (blob.size === 0) {
              console.error("Recorded blob is empty.");
              setStatus('error');
              return;
            }

            console.log(`Final Blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
            const url = URL.createObjectURL(blob);
            const videoExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
            setExtension(videoExt);
            setVideoUrl(url);
            setStatus('done');
            // Reset progress so parent is correctly notified
            if (onProgress) onProgress(100);
            if (onReady) onReady(url);
            
            // If headless, we're done immediately after readiness is signaled
            if (headless) {
              onComplete();
            }
          } catch (err) {
            console.error("Finalization failed:", err);
            setStatus('error');
            if (headless) onComplete();
          }
        };

        // Gradients
        const gradTop = ctx.createLinearGradient(0, 0, 0, 400);
        gradTop.addColorStop(0, 'rgba(0,0,0,0.7)');
        gradTop.addColorStop(1, 'rgba(0,0,0,0)');
        const gradBot = ctx.createLinearGradient(0, HEIGHT - 500, 0, HEIGHT);
        gradBot.addColorStop(0, 'rgba(0,0,0,0)');
        gradBot.addColorStop(1, 'rgba(0,0,0,0.8)');

        // Start playback and recording
        try {
          if (audio) await audio.play();
        } catch (playError) {
          console.warn("Autoplay blocked or audio error.", playError);
        }
        
        if (isCancelled) {
          if (audio) audio.pause();
          return;
        }

        // Start recording with timeslice
        recorder.start(200);
        setStatus('processing');

        let currentFrame = 0;
        
        const renderLoop = () => {
          if (isCancelled) return;

          if (currentFrame >= totalFrames) {
            console.log("Rendering complete, waiting for stabilizer...");
            if (recorder.state !== 'inactive') {
              // Add a small delay to ensure the encoder catches the last frames
              setTimeout(() => {
                if (recorder.state !== 'inactive') recorder.stop();
              }, 800);
            }
            return;
          }

          const elapsed = currentFrame / FPS;
          const currentProgress = (elapsed / totalDuration) * 100;
          setProgress(currentProgress);
          if (onProgress) onProgress(currentProgress);

          const photoIndex = Math.floor(elapsed / PHOTO_DURATION);
          const photoElapsed = elapsed % PHOTO_DURATION;
          const currentImg = displayImages[photoIndex % displayImages.length];
          const nextImg = displayImages[(photoIndex + 1) % displayImages.length];

          ctx.fillStyle = '#100c08';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          
          const zoomSpeed = 0.12;
          const isZoomIn = photoIndex % 2 === 0;
          const zoom = isZoomIn ? 1.0 + (zoomSpeed * (photoElapsed / PHOTO_DURATION)) : (1.0 + zoomSpeed) - (zoomSpeed * (photoElapsed / PHOTO_DURATION));
          
          const panProgress = (photoElapsed / PHOTO_DURATION);
          const panX = isZoomIn ? panProgress * 15 - 7.5 : (1 - panProgress) * 15 - 7.5;
          const panY = isZoomIn ? (1 - panProgress) * 8 - 4 : panProgress * 8 - 4;

          ctx.save();
          if (photoElapsed > PHOTO_DURATION - 0.8) {
            ctx.globalAlpha = 1 - (photoElapsed - (PHOTO_DURATION - 0.8)) / 0.8;
          }
          drawCoverImage(ctx, currentImg, zoom, panX, panY);
          ctx.restore();

          if (photoElapsed > PHOTO_DURATION - 0.8) {
            const alpha = (photoElapsed - (PHOTO_DURATION - 0.8)) / 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;
            drawCoverImage(ctx, nextImg, isZoomIn ? (1.0 + zoomSpeed) : 1.0, isZoomIn ? 7.5 : -7.5, isZoomIn ? -4 : 4);
            ctx.restore();
          }

          ctx.fillStyle = gradTop; ctx.fillRect(0, 0, WIDTH, 400);
          ctx.fillStyle = gradBot; ctx.fillRect(0, HEIGHT - 500, WIDTH, 500);

          const currentText = displayTexts[photoIndex % displayTexts.length];
          const style = TEXT_STYLES_DATA[photoIndex % TEXT_STYLES_DATA.length];
          const maxWidth = WIDTH - 160;
          
          ctx.font = aesthetic === 'modern_chic' ? '700 50px sans-serif' : 'italic 50px serif';
          const lines = wrapText(ctx, currentText, maxWidth);
          const lineHeight = 60;
          const totalTextHeight = lines.length * lineHeight;
          
          const totalChars = currentText.length;
          const textStartTime = 0.3;
          const textDuration = 1.5;
          const charsToShow = Math.floor(Math.max(0, Math.min(1, (photoElapsed - textStartTime) / textDuration)) * totalChars);
          
          ctx.fillStyle = '#D4AF37'; 
          ctx.textAlign = style.align as CanvasTextAlign;
          ctx.font = 'bold 20px sans-serif'; 
          ctx.letterSpacing = '8px';
          
          const labelY = style.y - (lines.length > 1 ? (totalTextHeight / 2 + 40) : 60);
          ctx.fillText(style.label, (style.x || WIDTH / 2), labelY);
          
          ctx.font = aesthetic === 'modern_chic' ? '700 50px sans-serif' : 'italic 50px serif';
          ctx.letterSpacing = 'normal';
          
          let charCounter = 0;
          lines.forEach((line, index) => {
            const lineY = style.y + (index * lineHeight) - (lines.length > 1 ? (totalTextHeight / 2 - lineHeight / 2) : 0);
            
            if (charCounter < charsToShow) {
              const lineChars = Math.min(line.length, charsToShow - charCounter);
              ctx.fillText(line.substring(0, lineChars), (style.x || WIDTH / 2), lineY);
            }
            charCounter += line.length + 1;
          });

          if (showWatermark) {
            ctx.font = 'bold 16px sans-serif'; 
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'center'; 
            ctx.fillText(brandName.toUpperCase(), WIDTH / 2, HEIGHT - 80);
          }

          currentFrame++;
          animationFrameId = requestAnimationFrame(renderLoop);
        };

        animationFrameId = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.error("Export process failed:", e);
        if (!isCancelled) setStatus('error');
      }
    };

    processExport();

    return () => {
      console.log("Cleaning up VideoExporter resources...");
      isCancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      // Stop audio
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }

      // Close AudioContext
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(console.error);
      }

      // Stop all tracks
      if (combinedStream) {
        combinedStream.getTracks().forEach(t => t.stop());
      }

      // Stop recorder
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch (e) {
          console.warn("Recorder stop failed during cleanup:", e);
        }
      }

      // Revoke any created URLs if status is not 'done'
      // We keep it if 'done' so the manual download button works, 
      // but App.tsx will eventually clear it.
    };
  }, []);

  function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number, offsetX: number = 0, offsetY: number = 0) {
    const imgRatio = img.width / img.height;
    const canvasRatio = WIDTH / HEIGHT;
    let dw, dh, ox, oy;
    if (imgRatio > canvasRatio) { dh = HEIGHT; dw = HEIGHT * imgRatio; ox = (WIDTH - dw) / 2; oy = 0; }
    else { dw = WIDTH; dh = WIDTH / imgRatio; ox = 0; oy = (HEIGHT - dh) / 2; }
    const sw = dw * scale; const sh = dh * scale;
    const sx = ox - (sw - dw) / 2 + offsetX; const sy = oy - (sh - dh) / 2 + offsetY;
    ctx.drawImage(img, sx, sy, sw, sh);
  }

  const handleSaveMobile = async (targetUrl: string) => {
    try {
      setStatus('finalizing');
      console.log("Mobile save process started. Native?:", Capacitor.isNativePlatform());

      let blob = videoBlobRef.current;
      
      if (!blob) {
        console.log("Blob ref empty, attempting fetch from URL:", targetUrl);
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
        blob = await response.blob();
      }
      
      console.log("Blob size for save:", blob.size);
      
      // Use FileReader for the most reliable Base64 conversion on mobile
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });

      const fileName = `kanchipuram_couture_${new Date().getTime()}.${extension}`;
      console.log("Saving file to Cache directory:", fileName);
      
      // Save to Cache directory - this is accessible for Sharing
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      console.log("File successfully saved at:", savedFile.uri);

      // Share the file
      await Share.share({
        title: 'Kanchipuram Couture Reel',
        text: 'My latest bridal reel creation',
        url: savedFile.uri,
        dialogTitle: 'Save or Share Reel'
      });
      
      setStatus('done');
    } catch (err: any) {
      console.error("Mobile save sequence failed:", err);
      // Fallback: If share fails, just try to open it in a new window as a last resort
      try {
        alert("Preparing manual download fallback...");
        window.open(targetUrl, '_blank');
      } catch (e) {}
      setStatus('error');
    }
  };

  const handleDownload = (targetUrl: string, targetExt: string) => {
    if (!targetUrl) return;

    if (Capacitor.isNativePlatform()) {
      handleSaveMobile(targetUrl);
      return;
    }

    try {
      const a = document.createElement('a');
      a.href = targetUrl;
      const timestamp = new Date().getTime();
      a.download = `nivra_reel_${timestamp}.${targetExt}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 500);
      console.log("Download triggered.");
    } catch (err) {
      console.error("Download fail:", err);
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className={headless ? "hidden" : "fixed inset-0 z-[200] flex items-center justify-center p-6 bg-stone-950/90 backdrop-blur-xl"}>
      <div className={headless ? "hidden" : "flex flex-col items-center justify-center p-8 space-y-8 max-w-lg w-full text-center bg-stone-900/40 rounded-3xl border border-stone-800 shadow-2xl relative overflow-hidden backdrop-blur-md"}>
        {/* Progress bar at bottom */}
        {status !== 'done' && (
          <div 
            className="absolute bottom-0 left-0 h-1.5 bg-saree-gold transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
        )}
        
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="fixed -left-[9999px] pointer-events-none opacity-0" />
        
        <div className="w-full flex flex-col items-center space-y-6">
          <div className="w-40 h-40 rounded-full border-4 border-saree-gold/20 flex items-center justify-center relative">
            {status === 'error' ? (
              <AlertCircle className="w-16 h-16 text-red-500" />
            ) : status === 'done' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle2 className="w-16 h-16 text-saree-gold" />
              </motion.div>
            ) : (
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-saree-gold animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-saree-gold">
                  {Math.round(progress)}%
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl display-text text-white">
              {status === 'loading' && 'Preparing Assets...'}
              {status === 'processing' && 'Rendering Reel...'}
              {status === 'finalizing' && 'Finalizing...'}
              {status === 'done' && 'Masterpiece Ready!'}
              {status === 'error' && 'Failed to Export'}
            </h3>
            <p className="text-stone-400 text-sm italic serif-text max-w-xs mx-auto">
              {status === 'processing' && 'Meticulously crafting every frame with heritage techniques.'}
              {status === 'done' && 'Your heritage reel is ready to shine.'}
              {status === 'error' && 'Something went wrong during the curation process.'}
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {status === 'done' && videoUrl && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="aspect-[9/16] w-full max-w-[240px] mx-auto rounded-3xl overflow-hidden border-2 border-saree-gold/30 shadow-2xl bg-stone-950 ring-4 ring-saree-gold/10 relative">
                  <video 
                    src={videoUrl} 
                    controls 
                    playsInline
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                  />
                </div>
                
                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDownload(videoUrl, extension)}
                    className="w-full py-5 bg-saree-gold text-stone-950 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-saree-gold/20"
                  >
                    {Capacitor.isNativePlatform() ? <Share2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                    {Capacitor.isNativePlatform() ? 'Save / Share Reel' : 'Download Masterpiece'}
                  </motion.button>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[11px] text-stone-400 font-medium uppercase tracking-[0.2em] mb-2">Reel Generated Successfully</p>
                    <p className="text-[10px] text-stone-500 italic">
                      {Capacitor.isNativePlatform() 
                        ? 'Click the button above to "Save Video" to your gallery. If that fails, long-press the video above and select "Download Video".'
                        : 'The download was triggered automatically. If it didn\'t start, please click the button above.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => window.location.reload()}
                className="w-full py-5 bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 border border-white/20"
              >
                <RefreshCcw className="w-6 h-6" /> Restart App
              </motion.button>
            )}
            
            <button 
              onClick={() => onComplete()} 
              className={`w-full py-4 text-stone-500 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors border-stone-800 ${status === 'done' ? 'mt-4 border-t pt-8' : ''}`}
            >
              {status === 'done' ? 'Start Next Masterpiece' : 'Cancel Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoExporter;
