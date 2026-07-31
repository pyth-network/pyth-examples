"use client";

import type Hls from "hls.js";
import { useEffect, useRef } from "react";

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const src = "https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8";
    let mounted = true;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (!mounted || !videoRef.current || !Hls.isSupported()) {
          return;
        }

        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);
      });
    }

    return () => {
      mounted = false;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const currentVideo = videoRef.current;
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.removeAttribute("src");
        currentVideo.load();
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover z-0"
      style={{
        marginLeft: "200px",
        transform: "scale(1.2)",
        transformOrigin: "left center",
      }}
    />
  );
}
