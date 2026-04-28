import React, { useEffect, useRef, useState } from 'react';
import { Photo, Song } from '../types';
import { motion } from 'motion/react';
import { Sparkles, Loader2, Download, CheckCircle2, Film } from 'lucide-react';

interface VideoExporterProps {
  photos: Photo[];
  song?: Song;
  texts: string[];
  transitionType?: number | 'auto';
  onComplete: () => void;
  aesthetic?: string;
  brandName?: string;
  showWatermark?: boolean;
}

export default function VideoExporter({ photos, song, texts, transitionType = 'auto', onComplete, aesthetic = 'vintage_cinema', brandName = 'SAREE HERITAGE', showWatermark = true }: VideoExporterProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'recording' | 'finalizing' | 'done'>('loading');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [extension, setExtension] = useState('webm');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const PHOTO_DURATION = 3; // seconds
  const FPS = 30;
  const WIDTH = 1080; // Upgraded from 720
  const HEIGHT = 1920; // Upgraded from 1280

  useEffect(() => {
    if (status === 'loading') {
      startExport();
    }
  }, [status]);

  async function startExport() {
    if (!canvasRef.current || photos.length === 0) return;

    setStatus('recording');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 1. Prepare Audio
    let audioStream: MediaStream | null = null;
    if (song?.url) {
      try {
        const audio = new Audio(song.url);
        audio.crossOrigin = "anonymous";
        // We use AudioContext to capture the stream reliably
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Ensure context is running (browsers block auto-play audio context)
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaElementSource(audio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        // source.connect(audioCtx.destination); // Play locally if needed, but we just need it for destination
        
        audioStream = destination.stream;
        
        if (song.startOffset) {
          audio.currentTime = song.startOffset;
        }
        audioRef.current = audio;
        
        // Wait for audio to be ready
        await new Promise((resolve) => {
          audio.oncanplaythrough = resolve;
          audio.load();
        });

        audio.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Video export audio playback failed", e);
          }
        });
      } catch (e) {
        console.error("Audio capture failed", e);
      }
    }

    // 2. Prepare Recorder
    const canvasStream = canvas.captureStream(FPS);
    const tracks = [...canvasStream.getVideoTracks()];
    if (audioStream) {
      tracks.push(...audioStream.getAudioTracks());
    }
    const combinedStream = new MediaStream(tracks);

    // Try multiple mime types for better compatibility
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMimeType = '';
    let selectedExt = 'webm';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        selectedExt = type.includes('mp4') ? 'mp4' : 'webm';
        break;
      }
    }
    setExtension(selectedExt);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 12000000 // 12Mbps for premium fidelity
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('done');
      
      // Stop audio if it was playing for export
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.remove();
        audioRef.current = null;
      }
    };

    recorderRef.current = recorder;
    recorder.start();

    // 3. Render Loop
    const images: HTMLImageElement[] = await Promise.all(
      photos.map(p => new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = p.url;
        img.onload = () => resolve(img);
      }))
    );

    // Ensure minimum 10 seconds (roughly 4 segments of 3s each)
    let displayImages = images;
    let displayTexts = texts;
    
    if (images.length === 1) {
      displayImages = [images[0], images[0], images[0], images[0]];
      displayTexts = [texts[0] || '', texts[0] || '', texts[0] || '', texts[0] || ''];
    } else if (images.length === 2) {
      displayImages = [images[0], images[1], images[0], images[1]];
      displayTexts = [texts[0] || '', texts[1] || '', texts[0] || '', texts[1] || ''];
    } else if (images.length === 3) {
      displayImages = [images[0], images[1], images[2], images[0]];
      displayTexts = [texts[0] || '', texts[1] || '', texts[2] || '', texts[0] || ''];
    }

    const totalDuration = displayImages.length * PHOTO_DURATION;
    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const currentProgress = (elapsed / totalDuration) * 100;
      setProgress(currentProgress);

      if (elapsed >= totalDuration) {
        recorder.stop();
        setStatus('finalizing');
        return;
      }

      const photoIndex = Math.floor(elapsed / PHOTO_DURATION);
      const photoElapsed = elapsed % PHOTO_DURATION;
      const currentImg = displayImages[photoIndex];
      const nextImg = displayImages[(photoIndex + 1) % displayImages.length];
      
      // Transition type logic
      const activeTransition = transitionType === 'auto' ? (photoIndex % 9) : (transitionType % 9);

      // Clear
      ctx.fillStyle = '#100c08'; // Rich charcoal
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw current photo with dynamic Ken Burns
      const movement = (photoIndex % 2 === 0) ? 1.0 : 1.1;
      const zoom = movement + (photoIndex % 2 === 0 ? 0.1 : -0.1) * (photoElapsed / PHOTO_DURATION);
      
      ctx.save();

      // Subtle camera shake for zoom transitions
      if (activeTransition === 0 || activeTransition === 4) {
        const shakeX = Math.sin(elapsed * 10) * 4;
        const shakeY = Math.cos(elapsed * 8) * 3;
        ctx.translate(shakeX, shakeY);
      }

      // Handle exit transition for current photo
      if (photoElapsed > PHOTO_DURATION - 1) {
        const exitAlpha = 1 - (photoElapsed - (PHOTO_DURATION - 1));
        const blurValue = (1 - exitAlpha) * 20;
        
        if (activeTransition === 2) { // Slide Left Out
          const offset = (1 - exitAlpha) * WIDTH;
          ctx.translate(-offset, 0);
          ctx.filter = `blur(${blurValue}px)`;
        } else if (activeTransition === 3) { // Slide Down Out
          const offset = (1 - exitAlpha) * HEIGHT;
          ctx.translate(0, offset);
          ctx.filter = `blur(${blurValue}px)`;
        } else if (activeTransition === 6) { // Slide Right Out
          const offset = (1 - exitAlpha) * WIDTH;
          ctx.translate(offset, 0);
          ctx.filter = `blur(${blurValue}px)`;
        } else if (activeTransition === 7) { // Slide Up Out
          const offset = (1 - exitAlpha) * HEIGHT;
          ctx.translate(0, -offset);
          ctx.filter = `blur(${blurValue}px)`;
        } else if (activeTransition === 1 || activeTransition === 0) { // Classic Fade or cinematic zoom fade
          ctx.globalAlpha = exitAlpha;
        }
      }
      drawCoverImage(ctx, currentImg, zoom * 1.02); // 2% overscan for shake safety
      ctx.filter = 'none'; // Reset filter after drawing current image

      // Draw Light Glint Shimmer (Branded Luxury Feel)
      ctx.save();
      const shimmerOffset = (photoElapsed / PHOTO_DURATION * 3 - 1) * WIDTH;
      const shimmerGrad = ctx.createLinearGradient(shimmerOffset, 0, shimmerOffset + 400, HEIGHT);
      shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
      shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimmerGrad;
      ctx.globalCompositeOperation = 'overlay';
      ctx.translate(WIDTH/2, HEIGHT/2);
      ctx.rotate(0.2);
      ctx.translate(-WIDTH/2, -HEIGHT/2);
      ctx.fillRect(-WIDTH, 0, WIDTH * 3, HEIGHT);
      ctx.restore();

      ctx.restore();

      // Transition handling for incoming photo
      if (photoElapsed > PHOTO_DURATION - 1) {
        const alpha = photoElapsed - (PHOTO_DURATION - 1);
        const blurValue = (1 - alpha) * 20;
        ctx.save();
        if (activeTransition === 0) { // Cinematic Zoom
          ctx.globalAlpha = alpha;
          const scale = (0.9 + alpha * 0.1) * 1.02;
          drawCoverImage(ctx, nextImg, scale);
        } else if (activeTransition === 1) { // Classic Fade
          ctx.globalAlpha = alpha;
          drawCoverImage(ctx, nextImg, 1.02);
        } else if (activeTransition === 2) { // Slide Left In
          const offset = (1 - alpha) * WIDTH;
          ctx.translate(offset, 0);
          ctx.filter = `blur(${blurValue}px)`;
          drawCoverImage(ctx, nextImg, 1.02);
        } else if (activeTransition === 3) { // Slide Down In
          const offset = (1 - alpha) * HEIGHT;
          ctx.translate(0, -offset);
          ctx.filter = `blur(${blurValue}px)`;
          drawCoverImage(ctx, nextImg, 1.02);
        } else if (activeTransition === 4) { // Soft Zoom In (renamed from index 3)
          ctx.globalAlpha = alpha;
          const scale = (0.9 + alpha * 0.1) * 1.02;
          drawCoverImage(ctx, nextImg, scale);
        } else if (activeTransition === 5) { // Rotate In
          ctx.globalAlpha = alpha;
          const rotation = (1 - alpha) * 0.1;
          const scale = (0.9 + alpha * 0.1) * 1.02;
          ctx.translate(WIDTH/2, HEIGHT/2);
          ctx.rotate(rotation);
          ctx.translate(-WIDTH/2, -HEIGHT/2);
          drawCoverImage(ctx, nextImg, scale);
        } else if (activeTransition === 6) { // Slide Right In
          const offset = (1 - alpha) * WIDTH;
          ctx.translate(-offset, 0);
          ctx.filter = `blur(${blurValue}px)`;
          drawCoverImage(ctx, nextImg, 1.02);
        } else if (activeTransition === 7) { // Slide Up In
          const offset = (1 - alpha) * HEIGHT;
          ctx.translate(0, offset);
          ctx.filter = `blur(${blurValue}px)`;
          drawCoverImage(ctx, nextImg, 1.02);
        } else { // Diagonal In (index 8)
          const offsetX = (1 - alpha) * WIDTH * 0.5;
          const offsetY = (1 - alpha) * HEIGHT * 0.5;
          ctx.translate(offsetX, offsetY);
          ctx.globalAlpha = alpha;
          ctx.filter = `blur(${(1-alpha)*8}px)`;
          drawCoverImage(ctx, nextImg, 1.02);
        }
        ctx.restore();
        ctx.globalAlpha = 1.0;
      }

      // Draw Overlays (Cinematic Grade)
      const gradTop = ctx.createLinearGradient(0, 0, 0, 400);
      gradTop.addColorStop(0, aesthetic === 'modern_chic' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.8)');
      gradTop.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradTop;
      ctx.fillRect(0, 0, WIDTH, 400);

      const gradBot = ctx.createLinearGradient(0, HEIGHT - 500, 0, HEIGHT);
      gradBot.addColorStop(0, 'rgba(0,0,0,0)');
      gradBot.addColorStop(1, aesthetic === 'modern_chic' ? 'rgba(16,12,8,0.2)' : 'rgba(16,12,8,0.9)');
      ctx.fillStyle = gradBot;
      ctx.fillRect(0, HEIGHT - 500, WIDTH, 500);

      // Artistic Noise/Grain simulation
      if (aesthetic !== 'modern_chic') {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for(let i=0; i<100; i++) {
          ctx.fillRect(Math.random()*WIDTH, Math.random()*HEIGHT, 2, 2);
        }
      }

      // Cinematic Light Leak simulation
      if (aesthetic === 'vintage_cinema' || aesthetic === 'temple_aura') {
        const leakTime = elapsed / totalDuration;
        const leakX = WIDTH * (0.5 + Math.cos(leakTime * 2) * 0.5);
        const leakY = HEIGHT * (0.5 + Math.sin(leakTime * 3) * 0.5);
        const leakGrad = ctx.createRadialGradient(leakX, leakY, 0, leakX, leakY, WIDTH * 1.5);
        leakGrad.addColorStop(0, 'rgba(255, 100, 50, 0.15)');
        leakGrad.addColorStop(0.5, 'rgba(255, 200, 100, 0.05)');
        leakGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = leakGrad;
        ctx.globalCompositeOperation = 'color-dodge';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.globalCompositeOperation = 'source-over';
      }

      // Special Aesthetic Overlays
      if (aesthetic === 'royal_palace') {
        const goldGrad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, WIDTH);
        goldGrad.addColorStop(0, 'transparent');
        goldGrad.addColorStop(1, 'rgba(212, 175, 55, 0.15)');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else if (aesthetic === 'temple_aura') {
        const divineGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT/2);
        divineGrad.addColorStop(0, 'rgba(255, 200, 100, 0.12)');
        divineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divineGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 150;
        ctx.strokeRect(0, 0, WIDTH, HEIGHT);
      } else if (aesthetic === 'modern_chic') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 40;
        ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);
      }

      // Draw Text with Typewriter Effect
      const currentText = displayTexts[photoIndex % displayTexts.length];
      const charsToShow = Math.floor(Math.min(1, (photoElapsed - 0.6) / (currentText.length * 0.05 + 0.1)) * currentText.length);
      const textToDraw = currentText.substring(0, Math.max(0, charsToShow));
      
      const TEXT_STYLES_DATA = [
        { label: "THE COLLECTION", align: 'center', y: HEIGHT - 360 },
        { label: "HERITAGE", align: 'left', x: 120, y: HEIGHT - 360 },
        { label: "SIGNATURE", align: 'left', x: 120, y: 390 },
        { label: "TIMELESS SILK", align: 'center', y: HEIGHT - 510 },
        { label: "ETHEREAL", align: 'center', y: 690 },
        { label: "CRAFTMANSHIP", align: 'right', x: WIDTH - 120, y: HEIGHT - 660 },
        { label: "ARTISTRY", align: 'center', y: HEIGHT / 3 + 90 },
        { label: "BRIDE'S CHOICE", align: 'left', x: 150, y: HEIGHT * 0.75 + 15 }
      ];

      const style = TEXT_STYLES_DATA[photoIndex % TEXT_STYLES_DATA.length];
      
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#D4AF37'; // saree-gold
      ctx.textAlign = style.align as CanvasTextAlign;
      
      // Secondary text (Sub-label)
      ctx.font = 'bold 30px sans-serif';
      ctx.letterSpacing = '15px';
      
      let textX = style.x || WIDTH / 2;
      let textY = style.y;

      // Draw Sub-label
      ctx.fillText(style.label, textX, textY - 90);

      // Draw Main Text
      if (aesthetic === 'modern_chic') {
        ctx.font = '700 80px sans-serif';
        ctx.fillText(textToDraw.toUpperCase(), textX, textY);
      } else {
        ctx.font = 'italic 80px serif';
        ctx.fillText(textToDraw, textX, textY);
      }

      // Draw Brand Watermark
      if (showWatermark) {
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(brandName.toUpperCase(), WIDTH / 2, HEIGHT - 120);
        ctx.letterSpacing = '12px';
      }

      // Draw elegant accent line
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (style.align === 'center') {
        ctx.moveTo(textX - 90, textY + 60);
        ctx.lineTo(textX + 90, textY + 60);
      } else if (style.align === 'left') {
        ctx.moveTo(textX, textY + 60);
        ctx.lineTo(textX + 180, textY + 60);
      } else {
        ctx.moveTo(textX - 180, textY + 60);
        ctx.lineTo(textX, textY + 60);
      }
      ctx.stroke();

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number) {
    const imgRatio = img.width / img.height;
    const canvasRatio = WIDTH / HEIGHT;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      drawHeight = HEIGHT;
      drawWidth = HEIGHT * imgRatio;
      offsetX = (WIDTH - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = WIDTH;
      drawHeight = WIDTH / imgRatio;
      offsetX = 0;
      offsetY = (HEIGHT - drawHeight) / 2;
    }

    // Apply scale for Ken Burns effect
    const sw = drawWidth * scale;
    const sh = drawHeight * scale;
    const soX = offsetX - (sw - drawWidth) / 2;
    const soY = offsetY - (sh - drawHeight) / 2;

    ctx.drawImage(img, soX, soY, sw, sh);
  }

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `kanchipuram-reel-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8 max-w-lg mx-auto text-center min-h-[60vh]">
      <canvas 
        ref={canvasRef} 
        width={WIDTH} 
        height={HEIGHT} 
        className="hidden" // Hidden from view, just for recording
      />

      <div className="relative">
        <div className="w-32 h-32 rounded-full border-4 border-saree-gold/20 flex items-center justify-center">
          {status === 'done' ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <CheckCircle2 className="w-16 h-16 text-saree-gold" />
            </motion.div>
          ) : (
            <Loader2 className="w-12 h-12 text-saree-gold animate-spin" />
          )}
        </div>
        {status !== 'done' && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Film className="w-6 h-6 text-saree-maroon" />
          </motion.div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-3xl display-text font-medium text-saree-maroon lowercase">
          {status === 'recording' ? 'Crafting your masterpiece...' : 
           status === 'finalizing' ? 'Finalizing textures...' : 
           'Heirloom Ready'}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          {status === 'recording' ? 'Weaving your photos and music into a cinematic narrative.' : 
           status === 'done' ? 'Your premium silk reel is ready for your collection.' :
           'Preparing the digital loom...'}
        </p>
      </div>

      <div className="w-full bg-saree-gold/10 h-2 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-saree-maroon"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {status === 'done' && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <button 
            onClick={downloadVideo}
            className="px-12 py-5 rounded-full bg-saree-maroon text-white font-bold shadow-2xl hover:bg-saree-maroon/90 active:scale-95 transition-all flex items-center gap-3 text-lg"
          >
            <Download className="w-6 h-6" />
            Download Movie
          </button>
          <button 
            onClick={onComplete}
            className="text-saree-gold font-bold uppercase tracking-widest text-xs hover:underline"
          >
            Back to Studio
          </button>
        </motion.div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
        <Sparkles className="w-3 h-3 text-saree-gold" />
        High fidelity render engine active
      </div>
    </div>
  );
}
