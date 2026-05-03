import React, { useState, useRef, useEffect } from 'react';
import { Search, Music, CheckCircle2, Play, Pause, Scissors } from 'lucide-react';
import { Song } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const SOUTHERN_CLASSICS: Song[] = [
  { id: '1', title: 'Kannathil Muthamittal', artist: 'A.R. Rahman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Tamil Cinema Classic', album: 'Kannathil Muthamittal' },
  { id: '2', title: 'Rowdy Baby', artist: 'Dhanush & Dhee', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Tamil Dance', album: 'Maari 2' },
  { id: '11', title: 'Mental Manadhil', artist: 'A.R. Rahman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', genre: 'Tamil Pop', album: 'O Kadhal Kanmani' },
  { id: '12', title: 'Aalaporaan Thamizhan', artist: 'A.R. Rahman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Tamil Anthem', album: 'Mersal' },
  { id: '4', title: 'Kanda Vara Sollunga', artist: 'Santhosh Narayanan', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Tamil Folk', album: 'Karnan' },
  { id: '5', title: 'Malare', artist: 'Vijay Yesudas', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', genre: 'Romantic Melody', album: 'Premam' },
  { id: '6', title: 'Verithanam', artist: 'A.R. Rahman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Tamil Mass', album: 'Bigil' },
  { id: '7', title: 'Enjoy Enjaami', artist: 'Dhee ft. Arivu', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', genre: 'Tamil Global', album: 'Independent' },
  { id: '8', title: 'Vaseegara', artist: 'Bombay Jayashri', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', genre: 'Evergreen Melody', album: 'Minnale' },
  { id: '13', title: 'Munbe Vaa', artist: 'Shreya Ghoshal', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Soulful Melody', album: 'Sillunu Oru Kaadhal' },
  { id: '14', title: 'Malargale', artist: 'Hariharan & K.S. Chithra', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Classic Romantic', album: 'Love Birds' },
  { id: '15', title: 'Unakkul Naane', artist: 'Madhushree', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Dreamy Pop', album: 'Pachaikili Muthucharam' },
  { id: '16', title: 'Vennilave', artist: 'Hariharan', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', genre: 'Evergreen Classic', album: 'Minsara Kanavu' },
  { id: '17', title: 'Ennavale', artist: 'Unni Menon', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', genre: 'Pure Melody', album: 'Kadhalan' },
  { id: '18', title: 'Kaathalae Kaathalae', artist: 'Chinmayi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', genre: 'Emotional Ballad', album: '96' },
  { id: '19', title: 'Visiri', artist: 'Sid Sriram', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', genre: 'Modern Melody', album: 'Enai Noki Paayum Thota' },
  { id: '20', title: 'Megham Karukatha', artist: 'Dhanush', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Feel Good', album: 'Thiruchitrambalam' },
  { id: '21', title: 'Thuli Thuli', artist: 'Haricharan', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', genre: 'Breezy Pop', album: 'Paiyaa' },
  { id: '22', title: 'Orasaadha', artist: 'Mervin Solomon', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', genre: 'Tamil Indie', album: '7up Madras Gig' },
  { id: '23', title: 'Bodhai Kaname', artist: 'Anirudh Ravichander', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', genre: 'Electronic Fusion', album: 'Oh Manapenne' },
  { id: '24', title: 'Nenjukulle', artist: 'Shakti Sree Gopalan', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', genre: 'Acoustic Folk', album: 'Kadal' },
  { id: '25', title: 'Moongil Thottam', artist: 'Abhay Jodhpurkar', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', genre: 'Pastoral Bliss', album: 'Kadal' },
  { id: '26', title: 'Adiye', artist: 'Sid Sriram', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', genre: 'Blues Rock Fusion', album: 'Kadal' },
  { id: '27', title: 'New York Nagaram', artist: 'A.R. Rahman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', genre: 'Melancholic Soul', album: 'Sillunu Oru Kaadhal' },
  { id: '28', title: 'Sundari', artist: 'S.P.B & Janaki', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', genre: 'Epic Classic', album: 'Thalapathi' },
  { id: '29', title: 'Rakkamma', artist: 'S.P.B', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Folk Mass', album: 'Thalapathi' },
  { id: '30', title: 'Valayosai', artist: 'S.P.B & Janaki', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Playful Classic', album: 'Sathya' },
  { id: '31', title: 'Halamithi Habibo', artist: 'Anirudh', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Arabic Fusion', album: 'Beast' },
  { id: '32', title: 'Tum Tum', artist: 'Sri Vardhini', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', genre: 'Wedding Folk', album: 'Enemy' },
  { id: '33', title: 'Dippam Dappam', artist: 'Anirudh', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', genre: 'Folk Beat', album: 'KRK' },
  { id: '9', title: 'Chettinad Heritage', artist: 'Traditional', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', genre: 'Folk Heritage', album: 'Heritage Series' },
  { id: '10', title: 'Kanchipuram Kalyanam', artist: 'Nadaswaram', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', genre: 'Traditional Wedding', album: 'Temple Rhythms' },
];

interface MusicSelectorProps {
  onSelect: (song: Song) => void;
  selectedSong?: Song;
}

export default function MusicSelector({ onSelect, selectedSong }: MusicSelectorProps) {
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = SOUTHERN_CLASSICS.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  const togglePreview = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setAudioError(null);
    
    if (playingId === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      if (!song.url) {
         setPlayingId(song.id);
         setTimeout(() => setPlayingId(null), 2000);
         return;
      }

      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

// Logic moved into the checkLoad promise
        
        const checkLoad = new Promise<boolean>(async (resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
          }, 15000);

          try {
            // Attempt 1: Fetch as blob to verify access and bypass some origin issues
            console.log("Attempting fetch for:", song.url);
            const response = await fetch(song.url, { mode: 'cors' }).catch(() => null);
            
            if (response && response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              
              const audio = new Audio();
              audio.src = blobUrl;
              audio.load();
              
              audio.oncanplaythrough = () => {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  audioRef.current = audio;
                  resolve(true);
                }
              };
            } else {
              // Attempt 2: Optimistic loading for simple Audio element
              console.log("Fetch failed or no CORS, falling back to simple Audio for:", song.title);
              const audio = new Audio();
              audio.src = song.url;
              audio.load();
              
              // On mobile, sometimes oncanplay doesn't fire until play() is called or just takes time
              // but we want to be optimistic if it's a known URL
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  audioRef.current = audio;
                  resolve(true); // Optimistic success
                }
              }, 2000);
            }
          } catch (e) {
            console.error("Music fetch failure:", e);
            // Fallback to basic audio
            const audio = new Audio();
            audio.src = song.url;
            audioRef.current = audio;
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve(true);
            }
          }
        });

        const isOk = await checkLoad;
        if (!isOk) {
           setAudioError(`Could not load ${song.title}. Source might be blocked.`);
           setPlayingId(null);
           return;
        }

        const audio = audioRef.current;
        if (!audio) return;

        const startMark = (selectedSong?.id === song.id && selectedSong.startOffset) 
          ? selectedSong.startOffset 
          : 30;
          
        audio.currentTime = startMark;
        setPlayingId(song.id);

        try {
          await audio.play();
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            setAudioError(`Autoplay blocked. Click select to use this song.`);
            setPlayingId(null);
          }
          return;
        }

        const timeoutId = setTimeout(() => {
          if (audioRef.current === audio) {
            audio.pause();
            setPlayingId(null);
          }
        }, 10000);

        audio.onended = () => {
          setPlayingId(null);
          clearTimeout(timeoutId);
        };
      } catch (err) {
        setPlayingId(null);
      }
    }
  };

  const handleOffsetChange = (newOffset: number) => {
    if (selectedSong) {
      onSelect({ ...selectedSong, startOffset: newOffset });
      
      // If currently playing preview, jump to the new offset
      if (playingId === selectedSong.id && audioRef.current) {
        audioRef.current.currentTime = newOffset;
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-3xl display-text font-medium text-saree-maroon">The Sound of Silk</h3>
        <p className="text-sm text-gray-500 italic">Find the perfect melody for your bridal story</p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 bg-white border border-saree-gold/30 rounded-full focus:outline-none focus:ring-2 focus:ring-saree-gold/50 transition-all text-sm sans-text"
          placeholder="Search for South Indian melodies, artists, or genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <AnimatePresence>
        {audioError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-600 font-medium text-center uppercase tracking-wider"
          >
            {audioError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {filteredSongs.map((song) => {
            const isSelected = selectedSong?.id === song.id;
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={song.id}
                onClick={() => onSelect({ ...song, startOffset: song.startOffset || 0 })}
                className={`flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden ${
                  isSelected 
                    ? 'border-saree-gold bg-saree-gold/10 active:scale-[0.99]' 
                    : 'border-transparent bg-white hover:border-saree-gold/30 hover:shadow-sm'
                }`}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => togglePreview(e, song)}
                      className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                        playingId === song.id 
                          ? 'bg-saree-maroon text-white animate-pulse' 
                          : 'bg-saree-gold/10 text-saree-gold hover:bg-saree-gold/20'
                      }`}
                    >
                      {playingId === song.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4 className="font-medium text-gray-900 serif-text">{song.title}</h4>
                      <p className="text-[10px] text-saree-gold font-bold uppercase tracking-widest mb-0.5">{song.album}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{song.artist} • {song.genre}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-saree-gold" />
                  )}
                </div>

                {isSelected && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-4 border-t border-saree-gold/20 pt-4 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-saree-maroon">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3 h-3" />
                        Set Starting Point
                      </div>
                      <span>{Math.floor(selectedSong.startOffset || 0)}s</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="120"
                      step="1"
                      className="w-full accent-saree-gold h-1 bg-saree-gold/20 rounded-lg appearance-none cursor-pointer"
                      value={selectedSong.startOffset || 0}
                      onChange={(e) => handleOffsetChange(parseInt(e.target.value))}
                    />
                    <p className="text-[9px] text-gray-400 italic">Slide to choose where the music begins in your reel.</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="p-4 rounded-xl bg-saree-gold/5 border border-saree-gold/10 text-center">
        <p className="text-[10px] text-saree-maroon/60 uppercase tracking-widest font-bold">
          Pro-Tip: Choosing a vocal climax creates a more emotional bridal story.
        </p>
        <p className="text-[8px] text-gray-400 mt-1 italic">
          * Representative audio streams used for prototype demonstration.
        </p>
      </div>
    </div>
  );
}
