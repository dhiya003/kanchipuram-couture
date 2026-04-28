import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function ExportingView() {
  return (
    <div className="text-center space-y-12 p-6">
      <div className="relative w-48 h-48 mx-auto">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-t-2 border-r-2 border-saree-gold/30"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border-b-2 border-l-2 border-saree-maroon/20"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-saree-maroon animate-spin" />
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] uppercase tracking-[0.3em] font-bold mt-4 text-saree-gold"
          >
            Weaving Silk
          </motion.div>
        </div>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        <h3 className="text-2xl display-text text-saree-ink italic">Perfecting the Motion</h3>
        <p className="text-sm text-gray-500 serif-text leading-relaxed">
          Rendering cinematic frames and synchronizing them with your chosen melody. 
          This will take just a moment of patience.
        </p>
        
        <div className="w-full h-1 bg-saree-gold/10 rounded-full overflow-hidden mt-8">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "easeInOut" }}
            className="h-full bg-saree-maroon"
          />
        </div>
      </div>
    </div>
  );
}
