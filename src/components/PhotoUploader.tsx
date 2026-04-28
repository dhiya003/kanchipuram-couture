import { useState, useCallback } from 'react';
import { Upload, X, Grid, MoveHorizontal, PenTool } from 'lucide-react';
import { Photo } from '../types';
import { motion, Reorder } from 'motion/react';

interface PhotoUploaderProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  brandName?: string;
  onBrandNameChange?: (name: string) => void;
  maxPhotos?: number;
}

export default function PhotoUploader({ 
  photos, 
  onPhotosChange, 
  notes = '', 
  onNotesChange = () => {}, 
  brandName = '',
  onBrandNameChange = () => {},
  maxPhotos = 20 
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newPhotos: Photo[] = Array.from(files).slice(0, maxPhotos - photos.length).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file), // Note: In a real app, you'd upload these to a server
      caption: ''
    }));

    onPhotosChange([...photos, ...newPhotos]);
  }, [photos, onPhotosChange, maxPhotos]);

  const removePhoto = (id: string) => {
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h3 className="text-3xl display-text font-medium text-saree-maroon">Curation of Craft</h3>
        <p className="text-sm text-gray-500 italic">Select up to {maxPhotos} photos of the masterpiece. Drag to reorder the story.</p>
      </div>

      <div 
        className={`relative group border-2 border-dashed rounded-3xl p-12 transition-all text-center ${
          isDragging ? 'border-saree-gold bg-saree-gold/5' : 'border-saree-gold/20'
        } ${photos.length >= maxPhotos ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-saree-gold/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }}
        onClick={() => document.getElementById('photo-input')?.click()}
      >
        <input 
          id="photo-input"
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleFileChange(e.target.files)}
          disabled={photos.length >= maxPhotos}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-saree-gold/10 text-saree-gold">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-900 serif-text">
              {photos.length >= maxPhotos ? 'Limit reached' : 'Drop your captures here'}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {photos.length} / {maxPhotos} images selected
            </p>
          </div>
        </div>
      </div>

      <Reorder.Group 
        axis="x" 
        values={photos} 
        onReorder={onPhotosChange}
        className="flex flex-wrap gap-4 justify-center"
      >
        {photos.map((photo) => (
          <Reorder.Item 
            key={photo.id} 
            value={photo}
            className="relative w-24 h-32 md:w-32 md:h-44 rounded-xl overflow-hidden shadow-lg cursor-grab active:cursor-grabbing group"
          >
            <img 
              src={photo.url} 
              alt="Silk Saree Detail" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-start justify-end p-1">
              <button 
                onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                className="p-1 rounded-full bg-white/80 text-saree-maroon hover:bg-white shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1 bg-black/50 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <MoveHorizontal className="w-3 h-3 text-white" />
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {photos.length > 0 && photos.length < 5 && (
        <p className="text-center text-xs text-amber-600 italic">
          Try adding at least 5 photos for a truly cinematic experience.
        </p>
      )}

      {/* Brand Identity */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-4 pt-8 border-t border-saree-gold/10"
      >
        <div className="flex items-center gap-3 text-saree-maroon">
          <Upload className="w-5 h-5 rotate-180" />
          <h4 className="display-text text-xl font-medium">Brand Identity</h4>
        </div>
        <div className="relative group">
          <input
            type="text"
            value={brandName}
            onChange={(e) => onBrandNameChange(e.target.value)}
            placeholder="Store Name or Your Signature (e.g. SAREE HERITAGE)"
            className="w-full p-6 rounded-2xl bg-white border border-saree-gold/20 focus:border-saree-gold focus:ring-1 focus:ring-saree-gold outline-none serif-text text-gray-700 transition-all shadow-sm"
          />
        </div>
      </motion.div>

      {/* Creative Brief Textarea */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-4 pt-8 border-t border-saree-gold/10"
      >
        <div className="flex items-center gap-3 text-saree-maroon">
          <PenTool className="w-5 h-5" />
          <h4 className="display-text text-xl font-medium">Creative Brief</h4>
        </div>
        <div className="relative group">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Describe the mood, the collection's story, or any specific free-form text you want us to weave into the reel..."
            className="w-full min-h-[120px] p-6 rounded-2xl bg-white border border-saree-gold/20 focus:border-saree-gold focus:ring-1 focus:ring-saree-gold outline-none serif-text text-gray-700 transition-all resize-none shadow-sm"
          />
          <div className="absolute bottom-4 right-4 pointer-events-none">
            <span className="text-[10px] uppercase tracking-widest font-bold text-saree-gold/40">Premium Input</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
          Our AI will analyze your notes and select choice fragments for the cinematic overlays.
        </p>
      </motion.div>
    </div>
  );
}
