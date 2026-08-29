import { useState } from 'react';
import { SkipForward, X } from 'lucide-react';

const getYouTubeVideoId = (url) => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (parsedUrl.pathname.includes('/embed/')) {
      return parsedUrl.pathname.split('/embed/')[1]?.split('/')[0] || null;
    }

    return parsedUrl.searchParams.get('v');
  } catch {
    if (url.includes('embed/')) {
      return url.split('/embed/')[1]?.split('?')[0] || null;
    }

    return url.split('v=')[1]?.split('&')[0] || null;
  }
};

export default function VideoPlayerModal({ videoUrls = [], initialVideoIndex = 0, onClose }) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const currentUrl = videoUrls[currentVideoIndex];
  const videoId = getYouTubeVideoId(currentUrl);
  const hasNextVideo = currentVideoIndex + 1 < videoUrls.length;

  const handleNextVideo = () => {
    if (hasNextVideo) {
      setCurrentVideoIndex((index) => index + 1);
    }
  };

  if (!currentUrl) {
    return null;
  }

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dedicated header bar: keeps the close button clear of YouTube's own player controls */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white/80 tracking-wide">
            Video Recommendations
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video player"
            title="Close video player"
            className="inline-flex items-center justify-center rounded-lg bg-white/10 p-2 text-white hover:bg-red-500/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-video">
          {!videoId && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <div className="text-center text-white p-4">
                <p className="font-semibold">Video unavailable</p>
                <p className="text-sm text-slate-400 mt-1">No playable video URL was found.</p>
                {hasNextVideo && (
                  <button
                    type="button"
                    onClick={handleNextVideo}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                    Try next video
                  </button>
                )}
              </div>
            </div>
          )}

          <iframe
            key={videoId}
            className="w-full h-full"
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            referrerPolicy="origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-slate-950 px-4 py-3">
          {hasNextVideo && (
            <button
              type="button"
              onClick={handleNextVideo}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Play next video
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
