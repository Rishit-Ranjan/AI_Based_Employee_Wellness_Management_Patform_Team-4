import React from 'react';
import { X } from 'lucide-react';

export default function VideoPlayerModal({ videoUrl, onClose }) {
  if (!videoUrl) return null;

  // Extract YouTube video ID from URL
  const videoId = videoUrl.split('v=')[1]?.split('&')[0];
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden aspect-video relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <iframe
          className="w-full h-full"
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