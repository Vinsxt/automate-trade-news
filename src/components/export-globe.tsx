"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import type { mountGlobe } from "./globe-scene";

type Globe = Awaited<ReturnType<typeof mountGlobe>>;

export function ExportGlobe() {
  const mount = useRef<HTMLDivElement>(null);
  const globe = useRef<Globe | null>(null);
  const scenePaused = useRef(false);
  const syncScene = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let visible = false;
    let loading = false;
    let unavailable = false;

    const sync = async () => {
      if (disposed) return;
      const active = visible && !document.hidden && !motion.matches && !scenePaused.current;
      if (globe.current) {
        globe.current.setRunning(active && !unavailable);
        return;
      }
      if (!active || loading || unavailable) return;
      loading = true;
      try {
        const { mountGlobe } = await import("./globe-scene");
        if (disposed) return;
        const instance = await mountGlobe(host, () => {
          unavailable = true;
          if (!disposed) setReady(false);
        });
        if (disposed) {
          instance.dispose();
          return;
        }
        globe.current = instance;
        setReady(!unavailable);
        void sync();
      } catch {
        // The poster remains visible on browsers without WebGL or the texture.
        unavailable = true;
      }
    };
    syncScene.current = () => { void sync(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      void sync();
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      disposed = true;
      syncScene.current = null;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      globe.current?.dispose();
      globe.current = null;
    };
  }, []);

  return <>
    <div aria-hidden="true" className="landing-field pointer-events-none fixed inset-0" />
    <div className={`landing-poster pointer-events-none absolute motion-safe:transition-opacity motion-safe:duration-500 ${ready ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
      <Image src="/trade/globe-emerald-poster.webp" alt="" fill fetchPriority="high" sizes="(min-width: 900px) 50vw, 85vw" className="object-contain" />
    </div>
    <div ref={mount} aria-hidden="true" data-testid="globe-scene"
      className={`pointer-events-none fixed inset-0 motion-safe:transition-opacity motion-safe:duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
    {ready && <Button type="button" variant="outline" size="icon"
      className="fixed bottom-4 right-4 z-20 border-control text-brand-strong shadow-sm motion-reduce:hidden sm:bottom-6 sm:right-6"
      aria-label={paused ? "Resume scene motion" : "Pause scene motion"}
      onClick={() => {
        scenePaused.current = !scenePaused.current;
        setPaused(scenePaused.current);
        syncScene.current?.();
      }}>
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </Button>}
  </>;
}
