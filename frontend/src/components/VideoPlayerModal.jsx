import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { fetchAlternativeVideo } from '../services/api';

const MAX_FALLBACK_ATTEMPTS = 3; // Define the maximum number of retry attempts

export default function VideoPlayerModal({ videoUrl, onClose, category, riskLabel }) {
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCountRef = useRef(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);

  const handleFallback = useCallback(async () => {
    if (retryCountRef.current >= MAX_FALLBACK_ATTEMPTS) {
      setError('This video is unavailable. No alternative videos were found after multiple attempts.');
      setMaxAttemptsReached(true);
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    setError(null);
    retryCountRef.current += 1;

    try {
      const result = await fetchAlternativeVideo(category, currentUrl, riskLabel || 'Low');

      if (result?.alternativeUrl) {
        setCurrentUrl(result.alternativeUrl);
      } else {
        setError('This video is unavailable. Could not find an alternative.');
        setMaxAttemptsReached(true);
      }
    } catch (err) {
      console.error('Video fallback failed:', err);
      setError('Failed to load alternative video. Please try again later.');
      setMaxAttemptsReached(true);
    } finally {
      setIsRetrying(false);
    }
  }, [category, currentUrl, riskLabel]);

  useEffect(() => {
    const checkVideoAvailability = async (url) => {
      if (!url) return;

      setIsLoading(true);
      setIsRetrying(false);
      setError(null);

      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (!response.ok) {
          throw new Error('Video unavailable');
        }
        setIsLoading(false);
        retryCountRef.current = 0; // Reset counter on success
        setMaxAttemptsReached(false);
      } catch (e) {
        console.warn(`Video at ${url} seems unavailable. Triggering fallback.`);
        handleFallback();
      }
    };

    checkVideoAvailability(currentUrl);
  }, [currentUrl, handleFallback]);
  
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

        {/* Loading/Retrying overlay */}
        {(isLoading || isRetrying) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white p-6">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-300">{isRetrying ? 'Finding alternative video...' : 'Loading video...'}</p>
            </div>
          </div>
        )}

        {/* Error state with retry button */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white p-6">
              <div className="text-red-400 text-5xl mb-3">⚠</div>
              <p className="text-sm text-slate-300 mb-4">{error}</p>
              {!maxAttemptsReached && ( // Only show button if max attempts not reached
                <button
                onClick={handleFallback}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try another video
              </button>
              )}
            </div>
          </div>
        )}

        {/* Video iframe - hidden when error/retrying */}
        <iframe
          className={`w-full h-full ${error || isLoading || isRetrying ? 'hidden' : ''}`}
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          ></iframe>
      </div>
    </div>
  );
}
