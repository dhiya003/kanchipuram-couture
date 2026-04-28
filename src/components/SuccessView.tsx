import { motion } from 'motion/react';
import { CheckCircle, Share2, Instagram, RefreshCcw } from 'lucide-react';

interface SuccessViewProps {
  onRestart: () => void;
}

export default function SuccessView({ onRestart }: SuccessViewProps) {
  const handleDownload = () => {
    // In a real app, this would be the actual video blob
    const element = document.createElement('a');
    const file = new Blob(['Mock Reel Content - In a production app, the generated MP4 would be here.'], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "bridal_reel_masterpiece.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alert("In this prototype, a mock file has been downloaded. In the full version, your rendered MP4 would be ready!");
  };

  return (
    <div className="text-center space-y-8 p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="w-24 h-24 bg-saree-gold rounded-full mx-auto flex items-center justify-center text-white shadow-2xl"
      >
        <CheckCircle className="w-12 h-12" />
      </motion.div>

      <div className="space-y-4">
        <h2 className="text-4xl display-text font-medium text-saree-ink">Couture Masterpiece Ready</h2>
        <p className="text-gray-500 serif-text text-lg max-w-md mx-auto italic">
          Your bridal journey has been woven into a cinematic reel. It is now ready for the world to see.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
        <button 
          onClick={handleDownload}
          className="w-full py-4 rounded-full bg-saree-maroon text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-saree-maroon/90 transition-all shadow-xl"
        >
          <Instagram className="w-5 h-5" />
          Download & Post
        </button>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          <button className="py-4 rounded-full bg-white border border-saree-gold/30 text-saree-ink font-bold uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-2 hover:bg-saree-gold/10 transition-all">
            <Share2 className="w-3 h-3" />
            Share Link
          </button>
          <button 
            onClick={onRestart}
            className="py-4 rounded-full bg-white border border-saree-gold/30 text-saree-ink font-bold uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-2 hover:bg-saree-gold/10 transition-all"
          >
            <RefreshCcw className="w-3 h-3" />
            New Creation
          </button>
        </div>
      </div>

      <div className="pt-12">
        <p className="text-[10px] uppercase tracking-[0.4em] text-saree-gold font-bold">
          The Wedding Edition • Series 01
        </p>
      </div>
    </div>
  );
}
