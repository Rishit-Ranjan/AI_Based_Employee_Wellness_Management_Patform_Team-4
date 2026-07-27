import React, { useState, useCallback, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { fetchAlternativeVideo } from '../services/api';

export default function VideoPlayerModal({ videoUrl, onClose, category, riskLabel }) {
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const fallbackAttempted = useRef(false);
  const iframeRef = useRef(null);

  if (!currentUrl) return null;

  // Extract YouTube video ID from URL
  const videoId = currentUrl.split('v=')[1]?.split('&')[0];
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;

  const handleFallback = useCallback(async () => {
    if (fallbackAttempted.current || !category) {
      // If fallback already attempted or no category info, just show error
      setError('This video is unavailable. No alternative videos found.');
      return;
    }

    setIsRetrying(true);
    fallbackAttempted.current = true;
    setError(null);

    try {
      const result = await fetchAlternativeVideo(
        category,
        currentUrl,
        riskLabel || 'Low'
      );

      if (result?.alternativeUrl) {
        setCurrentUrl(result.alternativeUrl);
        setIsRetrying(false);
        setError(null);
      } else {
        setError('This video is unavailable. Could not find an alternative.');
        setIsRetrying(false);
      }
    } catch (err) {
      console.error('Video fallback failed:', err);
      setError('Failed to load alternative video. Please try again later.');
      setIsRetrying(false);
    }
  }, [category, currentUrl, riskLabel]);

  const handleIframeError = useCallback(() => {
    if (isRetrying || fallbackAttempted.current) return;
    handleFallback();
  }, [handleFallback, isRetrying]);

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

        {/* Loading overlay */}
        {isRetrying && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-300">Finding alternative video...</p>
            </div>
          </div>
        )}

        {/* Error state with retry button */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white p-6">
              <div className="text-red-400 text-5xl mb-3">⚠</div>
              <p className="text-sm text-slate-300 mb-4">{error}</p>
              <button
                onClick={handleFallback}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try another video
              </button>
            </div>
          </div>
        )}

        {/* Video iframe - hidden when error/retrying */}
        <iframe
          ref={iframeRef}
          className={`w-full h-full ${error || isRetrying ? 'hidden' : ''}`}
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={handleIframeError}
        ></iframe>
      </div>
    </div>
  );
}

