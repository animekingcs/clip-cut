// components/VideoPreview.jsx
"use client";

import { useRef, useState, useEffect } from "react";

export default function VideoPreview({ videoUrl, words }) {
  const videoRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !words || words.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const active = words.find(
        (w) => currentTime >= w.start && currentTime <= w.end
      );
      setCurrentWord(active ? active.word : "");
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [words]);

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full h-auto aspect-video object-cover"
      />

      {currentWord && (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none px-4">
          <span className="bg-slate-950/80 backdrop-blur-md text-amber-400 font-extrabold text-2xl md:text-4xl px-4 py-2 rounded-xl border border-amber-400/30 uppercase tracking-wider animate-bounce shadow-lg">
            {currentWord}
          </span>
        </div>
      )}
    </div>
  );
}