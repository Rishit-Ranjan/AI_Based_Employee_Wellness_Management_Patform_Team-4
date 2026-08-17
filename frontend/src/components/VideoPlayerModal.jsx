import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { reportUnavailableVideo } from '../services/api';

export default function VideoPlayerModal({ videoUrls, initialVideoIndex = 0, onClose, category, riskLabel }) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [currentUrl, setCurrentUrl] = useState(videoUrls[initialVideoIndex]);
  const [hasError, setHasError] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  // Update currentUrl when initialVideoIndex or videoUrls change
  useEffect(() => {
    setCurrentVideoIndex(initialVideoIndex);
    setCurrentUrl(videoUrls[initialVideoIndex]);
    setHasError(false); // Reset error state when new video list/index is provided
  }, [videoUrls, initialVideoIndex]);

  // Handle YouTube iframe errors and attempt fallback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === window && event.data === 'youtubeError') {
        // Report the current problematic video to the backend
        reportUnavailableVideo(currentUrl).catch(err => console.error("Failed to report video:", err));

        // Try the next video in the list
        const nextIndex = currentVideoIndex + 1;
        if (nextIndex < videoUrls.length) {
          setIsLoadingNext(true);
          setHasError(false); // Clear error message while trying next video
          setCurrentVideoIndex(nextIndex);
          setCurrentUrl(videoUrls[nextIndex]);
          // Give a small delay before hiding loading to ensure iframe re-renders
          setTimeout(() => setIsLoadingNext(false), 500);
        } else {
          // No more alternative videos
          setHasError(true);
          setIsLoadingNext(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUrl]);
  
  if (!currentUrl) {
    return null; // Should not happen if videoUrls is properly populated
  }

  // Handle both 'watch?v=' and 'embed/' URL formats to extract video ID
  const videoId = currentUrl.includes('embed/')
    ? currentUrl.split('/embed/')[1]?.split('?')[0]
    : currentUrl.split('v=')[1]?.split('&')[0];
    
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

        {(hasError || isLoadingNext) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center text-white p-4">
              {isLoadingNext ? (
                <>
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="font-semibold">Loading next video...</p>
                  <p className="text-sm text-slate-400 mt-1">Attempting alternative {currentVideoIndex + 1} of {videoUrls.length}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Video unavailable</p>
                  <p className="text-sm text-slate-400 mt-1">No alternative videos found. Please try again later.</p>
                </>
              )}
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
