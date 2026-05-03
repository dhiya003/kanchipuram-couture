import { motion } from 'motion/react';
import { History as HistoryIcon, Trash2, ArrowLeft, PlayCircle, Download } from 'lucide-react';
import { Reel } from '../types';

interface HistoryViewProps {
  history: Reel[];
  onBack: () => void;
  onSelectReel: (reel: Reel) => void;
  onDeleteReel: (id: string) => void;
  onDownloadReel: (reel: Reel) => void;
}

export default function HistoryView({ history, onBack, onSelectReel, onDeleteReel, onDownloadReel }: HistoryViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-saree-gold/20 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-saree-gold/10 text-saree-gold transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-3xl display-text font-medium text-saree-maroon">The Archive</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Your previously woven stories</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-saree-gold">
          <HistoryIcon className="w-5 h-5" />
          <span className="text-sm font-bold">{history.length} Reels</span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-300">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <p className="serif-text text-gray-400 italic text-lg">No stories in the archive yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((reel) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={reel.id}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-saree-gold/10"
            >
              <div className="aspect-[4/5] relative">
                {reel.photos[0] && (
                  <img 
                    src={reel.photos[0].url} 
                    alt="Reel Cover" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-saree-ink/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">
                    {new Date(reel.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h4 className="serif-text text-lg italic truncate">
                    {reel.song?.title || 'Untitled Masterpiece'}
                  </h4>
                </div>

                <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-saree-ink/40 backdrop-blur-[2px]">
                  <button 
                    onClick={() => onSelectReel(reel)}
                    className="p-4 rounded-full bg-white text-saree-maroon shadow-2xl hover:scale-110 active:scale-95 transition-all"
                    title="View Preview"
                  >
                    <PlayCircle className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={() => onDownloadReel(reel)}
                    className="p-4 rounded-full bg-saree-gold text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                    title="Download Reel"
                  >
                    <Download className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <div className="p-3 flex justify-between items-center bg-white border-t border-gray-50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {reel.photos.length} Photos • {reel.song?.genre || 'Instrumental'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onSelectReel(reel)}
                    className="p-2 text-saree-gold hover:bg-saree-gold/10 rounded-full transition-colors"
                    title="Preview"
                  >
                    <PlayCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onDownloadReel(reel)}
                    className="p-2 text-saree-gold hover:bg-saree-gold/10 rounded-full transition-colors"
                    title="Download/Export"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onDeleteReel(reel.id)}
                    className="p-2 text-gray-300 hover:text-saree-maroon rounded-full transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
