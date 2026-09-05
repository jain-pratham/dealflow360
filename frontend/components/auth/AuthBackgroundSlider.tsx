"use client";

import { useEffect, useState } from "react";

interface AuthBackgroundSliderProps {
  images?: string[];
  intervalMs?: number;
  overlayClassName?: string;
  showIndicators?: boolean;
}

const DEFAULT_IMAGES = [
  "/auth-bg/bg-1.jpg",
  "/auth-bg/bg-2.jpg",
  "/auth-bg/bg-3.jpg",
];

export default function AuthBackgroundSlider({
  images = DEFAULT_IMAGES,
  intervalMs = 6500,
  overlayClassName,
  showIndicators = true,
}: AuthBackgroundSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {images.map((src, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`w-full h-full bg-cover bg-center transition-transform duration-[9000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
              style={{ backgroundImage: `url(${src})` }}
            />
          </div>
        );
      })}

      <div
        className={
          overlayClassName ||
          "absolute inset-0 bg-gradient-to-br from-slate-950/75 via-slate-900/60 to-slate-950/80 backdrop-blur-[1px]"
        }
      />

      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-auto">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? "w-7 bg-white shadow-sm"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
