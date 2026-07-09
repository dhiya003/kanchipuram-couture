import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Wand2, X, Download, RefreshCw, Crown, Sparkles, ChevronLeft, Image as ImageIcon, Check } from 'lucide-react';
import { Photo } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import DriveBrowserModal from './DriveBrowserModal';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import { getOrCreateCoutureFolder, uploadFileToDrive } from '../lib/drive';

interface PoseStudioProps {
  onBack: () => void;
}

// Target Pose Description based on the user's "Signature Pose" image
const SIGNATURE_PROMPT_REQUIREMENTS = `
RECREATION RULES:
Recreate the uploaded saree ONLY in the provided "signature folded display pose" style while STRICTLY preserving every original saree attribute with zero modification.

SIGNATURE POSE GEOMETRY (CRITICAL LAYOUT):
1. STARTING POINT: A neatly folded square bundle of the saree is positioned in the TOP-LEFT of the frame.
2. THE DIAGONAL FLOW: From this Top-Left bundle, a series of 5-6 uniform pleats cascade downwards towards the BOTTOM-RIGHT.
3. VERTICAL PLEATS: Each individual pleat in the cascade must be perfectly VERTICAL. They are arranged in a "stepped" or "tiered" diagonal line.
4. BORDER PLACEMENT: The silk gold zari border MUST be visible at the bottom edge of EVERY SINGLE PLEAT. These border segments should be horizontal and appear as a repeating pattern at the base of the cascade.
5. PALLU DISPLAY: The decorative Pallu section is displayed partially behind the pleats, visible in the background to the right.

COMPOSITION & STYLE:
- VIEWPOINT: High-angle professional catalog shot (Top-down angled view).
- BACKGROUND: Clean, sterile white studio background.
- LIGHTING: Soft, natural studio lighting that emphasizes the silk sheen and zari luster.
- DEPTH: Natural fabric shadows between pleats to show thickness and luxury weight.

ABSOLUTE PRESERVATION RULES (NON-NEGOTIABLE):
Preserve EXACTLY:
- Original saree colors (Tone and saturation)
- Border design
- Zari work
- Motifs and Motif placement
- Pallu design
- Weaving pattern
- Fabric texture
- Silk sheen
- Thread density
- Fold behavior
- Fabric proportions

PROHIBITED ELEMENTS (NEGATIVE PROMPT):
- NO mannequins, NO humans, NO hands.
- NO hangers, NO pins, NO clips, NO elastic bands.
- NO props, NO furniture, NO floors.
- NO other saree poses (e.g., draped on a person or laid flat without pleats).
`;

export default function PoseStudio({ onBack }: PoseStudioProps) {
  const [sourceImages, setSourceImages] = useState<Photo[]>([]);
  const [results, setResults] = useState<{ sourceId: string, url: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [status, setStatus] = useState('');

  // Google Drive state
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [uploadingToDriveId, setUploadingToDriveId] = useState<string | null>(null);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const handleDriveImport = (drivePhotos: Photo[]) => {
    setSourceImages(prev => [...prev, ...drivePhotos]);
    setResults([]); // Clear results on new import
  };

  const exportToDrive = async (sourceId: string, dataUrl: string, idx: number) => {
    setUploadingToDriveId(sourceId);
    setDriveUploadSuccess(null);
    setDriveError(null);

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

      // Convert image base64 URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Resolve or create folder
      const folderId = await getOrCreateCoutureFolder(token, 'Kanchipuram Couture');

      // Upload
      const filename = `Signature_Saree_Pose_${idx + 1}.png`;
      await uploadFileToDrive(token, blob, filename, folderId);

      setDriveUploadSuccess(sourceId);
      setTimeout(() => setDriveUploadSuccess(null), 3000);
    } catch (err: any) {
      console.error("Upload to Drive failed:", err);
      setDriveError(err.message || "Failed to save file to Google Drive.");
      setTimeout(() => setDriveError(null), 5000);
    } finally {
      setUploadingToDriveId(null);
    }
  };

  const getAI = () => {
    let apiKey = '';
    try {
      apiKey = (typeof process !== 'undefined' ? (process.env?.GEMINI_API_KEY || '') : '') || 
               ((import.meta as any).env?.VITE_GEMINI_API_KEY || '');
    } catch (e) {
      console.warn("Error accessing environment variables", e);
    }
    return new GoogleGenAI({ apiKey });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newPhotos: Photo[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file)
    }));
    
    setSourceImages(prev => [...prev, ...newPhotos]);
    setResults([]); // Clear previous results when new images are added
  };

  const removeSourceImage = (id: string) => {
    setSourceImages(prev => {
      const filtered = prev.filter(p => p.id !== id);
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return filtered;
    });
  };

  const runSignatureBatch = async () => {
    if (sourceImages.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    const ai = getAI();
    
    const newResults: { sourceId: string, url: string }[] = [];

    for (let i = 0; i < sourceImages.length; i++) {
      setCurrentProcessingIndex(i);
      const source = sourceImages[i];
      setStatus(`Analyzing Saree ${i + 1} DNA...`);

      try {
        // 1. Analyze the source saree
        const sourceResponse = await fetch(source.url);
        const sourceBlob = await sourceResponse.blob();
        const base64Source = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(sourceBlob);
        });

        const analysisPrompt = `HYPER-DETAILED TECHNICAL EXTRACTION: Analyze the attached saree for a 1:1 identical reproduction.
        MANDATORY DATA POINTS:
        - BASE COLOR: Identify the exact primary shade (e.g., Kanchipuram silk maroon, peacock blue).
        - MOTIF DNA: Shape, scale, count, and alignment of small motifs (Buttas).
        - BORDER ANATOMY: Detailed zari pattern of the border (Peacocks, Mayilkan, Rudraksham).
        - ZARI QUALITY: Is it gold, silver, or antique zari?
        - FABRIC SOUL: Grain, sheen, and weave density.
        
        OUTPUT FORMAT: Provide a structured summary of these details.`;

        const analysisResult = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{
            parts: [
              { inlineData: { data: base64Source, mimeType: sourceBlob.type } },
              { text: analysisPrompt }
            ]
          }]
        });

        const sareeIdentity = analysisResult.text;
        setStatus(`Rendering Saree ${i + 1} Signature Pose...`);

        // 2. Generate
        const generationPrompt = `MAINTAIN 1:1 IDENTITY - RECONFIGURE POSE ONLY:

REFERENCE SAREE IDENTITY (THESE DETAILS MUST NOT CHANGE):
${sareeIdentity}

${SIGNATURE_PROMPT_REQUIREMENTS}

COMMAND: Generate the image of the SAME saree described above, but re-arranged into the COMPOSITIONAL LAYOUT defined in the "SIGNATURE POSE GEOMETRY" section. Do not modify the saree itself.`;

        const generationResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64Source, mimeType: sourceBlob.type } },
              { text: generationPrompt }
            ]
          },
          config: {
            imageConfig: {
              aspectRatio: "3:4"
            }
          }
        });

        let generatedBase64 = '';
        if (generationResponse.candidates && generationResponse.candidates[0].content.parts) {
          for (const part of generationResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              generatedBase64 = part.inlineData.data;
              break;
            }
          }
        }

        if (generatedBase64) {
          const resultUrl = `data:image/png;base64,${generatedBase64}`;
          newResults.push({ sourceId: source.id, url: resultUrl });
          setResults([...newResults]); // Update UI progressively
        }

      } catch (error) {
        console.error(`Saree ${i + 1} transformation failed:`, error);
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);
    setStatus('Ready');
  };

  const downloadAll = () => {
    results.forEach((res, index) => {
      const link = document.createElement('a');
      link.href = res.url;
      link.download = `Signature_Pose_${index + 1}.png`;
      link.click();
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-saree-gold/10 text-saree-gold transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl display-text font-medium text-saree-maroon">Pose Studio</h2>
          <p className="text-xs uppercase tracking-[0.3em] text-saree-gold font-bold">Batch Signature Transformation</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
        {/* Source Section */}
        <div className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-saree-ink">
              <ImageIcon className="w-5 h-5 text-saree-gold" />
              <h4 className="serif-text text-xl">Saree Collection</h4>
            </div>
            <span className="text-[10px] bg-saree-gold/10 text-saree-gold px-2 py-1 rounded-full font-bold">
              {sourceImages.length} IMAGES
            </span>
          </div>

          {driveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
              {driveError}
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sourceImages.map((img) => (
              <div key={img.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                <img src={img.url} alt="Saree" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeSourceImage(img.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {currentProcessingIndex === sourceImages.indexOf(img) && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {results.find(r => r.sourceId === img.id) && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-1 shadow-lg">
                      <Sparkles className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <button 
              type="button"
              onClick={() => document.getElementById('pose-input')?.click()}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-saree-gold/50 hover:bg-saree-gold/5 transition-all group p-4 text-center"
            >
              <Upload className="w-6 h-6 text-gray-300 group-hover:text-saree-gold" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Local Upload</span>
            </button>

            <button 
              type="button"
              onClick={() => setIsDriveOpen(true)}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 hover:border-saree-gold hover:bg-saree-gold/5 transition-all group p-4 text-center"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-saree-gold fill-current" viewBox="0 0 24 24">
                <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
              </svg>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-saree-gold">Import Drive</span>
            </button>
          </div>

          <input 
            id="pose-input"
            type="file" 
            accept="image/*" 
            multiple
            className="hidden" 
            onChange={handleFileChange}
          />

          <button
            onClick={runSignatureBatch}
            disabled={sourceImages.length === 0 || isProcessing}
            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg ${
              sourceImages.length === 0 || isProcessing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-saree-ink text-saree-paper hover:bg-saree-maroon active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Running Signature...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 text-saree-gold" />
                RUN SIGNATURE
              </>
            )}
          </button>
          
          {isProcessing && (
            <p className="text-[10px] text-center text-saree-gold font-bold animate-pulse">
              {status}
            </p>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-saree-ink">
              <Crown className="w-5 h-5 text-saree-gold" />
              <h4 className="serif-text text-xl">Signature Renditions</h4>
            </div>
            {results.length > 0 && (
              <button 
                onClick={downloadAll}
                className="flex items-center gap-2 text-[10px] font-bold text-saree-maroon uppercase tracking-widest hover:underline"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout transition">
              {results.map((res, idx) => (
                <motion.div
                  key={res.sourceId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="aspect-[3/4] rounded-2xl bg-white border border-gray-100 overflow-hidden relative shadow-md"
                >
                  <img src={res.url} alt="Result" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button 
                      onClick={() => exportToDrive(res.sourceId, res.url, idx)}
                      disabled={uploadingToDriveId === res.sourceId}
                      className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-saree-gold shadow-lg hover:bg-white flex items-center justify-center transition-all disabled:opacity-55"
                      title="Save to Google Drive"
                    >
                      {uploadingToDriveId === res.sourceId ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-saree-gold" />
                      ) : driveUploadSuccess === res.sourceId ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <svg className="w-4 h-4 fill-current text-saree-gold animate-pulse" viewBox="0 0 24 24">
                          <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = res.url;
                        link.download = `Signature_Saree_${idx + 1}.png`;
                        link.click();
                      }}
                      className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-saree-maroon shadow-lg hover:bg-white flex items-center justify-center"
                      title="Download to Local"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white uppercase tracking-widest font-bold">
                      Masterpiece 0{idx + 1}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isProcessing && (
                <motion.div 
                  className="aspect-[3/4] rounded-2xl bg-stone-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center"
                >
                  <RefreshCw className="w-8 h-8 text-saree-gold/30 animate-spin mb-4" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Processing Saree {results.length + 1}...</p>
                </motion.div>
              )}

              {results.length === 0 && !isProcessing && (
                <div className="col-span-2 aspect-[3/4] rounded-3xl bg-stone-50 border border-gray-100 flex flex-col items-center justify-center p-12 text-center opacity-40">
                  <div className="w-20 h-20 rounded-full border border-dashed border-gray-300 flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="serif-text text-gray-400 italic">
                    Ready to transform your collection into signature masterpieces.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DriveBrowserModal 
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        onImportPhotos={handleDriveImport}
        maxSelectable={50}
        currentPhotosCount={sourceImages.length}
      />
    </div>
  );
}
