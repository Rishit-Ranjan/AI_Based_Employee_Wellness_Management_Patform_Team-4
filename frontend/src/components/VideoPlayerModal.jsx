import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { reportUnavailableVideo } from '../services/api';

export default function VideoPlayerModal({ videoUrl, onClose, category, riskLabel }) {
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const [hasError, setHasError] = useState(false);

  // The frontend video availability check was unreliable and causing loops.
  // This has been removed. We now trust the backend to provide a working URL.
  // If a video is truly unavailable, the YouTube iframe will display its own
  // error, which is a more stable and acceptable user experience.

  // NEW: Report broken videos to the backend when the iframe fails.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === window && event.data === 'youtubeError') {
        setHasError(true);
        reportUnavailableVideo(currentUrl).catch(err => console.error("Failed to report video:", err));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUrl]);
  
  if (!currentUrl) return null;
  // Extract YouTube video ID from URL
  const videoId = currentUrl.split('v=')[1]?.split('&')[0];
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden aspect-video relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center text-white p-4">
              <p className="font-semibold">Video unavailable</p>
              <p className="text-sm text-slate-400 mt-1">This video could not be loaded. An alternative will be suggested next time.</p>
            </div>
          </div>
        )}

        <iframe
          className="w-full h-full"
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onError={() => window.postMessage('youtubeError', '*')}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
