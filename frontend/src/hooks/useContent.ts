import { useEffect, useState } from 'react';
import { getArchitecture, getComponents, getLatency, getOptimizations, getVoidtune } from '../api';
import type { Architecture, LatencyData, OptimizationGroup, PCComponent, VoidtuneInfo } from '../types';

interface Content {
  components: PCComponent[];
  architecture: Architecture | null;
  voidtune: VoidtuneInfo | null;
  optimizations: OptimizationGroup[];
  latency: LatencyData | null;
}

/**
 * Loads every content endpoint once at startup.
 *
 * All of it together is a few tens of KB and the whole experience needs it, so
 * one parallel fetch on mount beats per-scene loading states. `error` is
 * surfaced rather than swallowed: if the backend is down the UI says so
 * instead of rendering an empty museum.
 */
export function useContent() {
  const [content, setContent] = useState<Content>({
    components: [],
    architecture: null,
    voidtune: null,
    optimizations: [],
    latency: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getComponents(), getArchitecture(), getVoidtune(), getOptimizations(), getLatency()])
      .then(([components, architecture, voidtune, optimizations, latency]) => {
        if (cancelled) return;
        setContent({ components, architecture, voidtune, optimizations, latency });
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load content');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...content, loading, error };
}
