import { useEffect, useRef, useState } from 'react';

/**
 * Scroll position as normalised progress.
 *
 * Returns both a ref and a state value on purpose:
 *  - `ref` updates every scroll event and is what the 3D scene reads inside
 *    useFrame. No React render is involved, so scrolling never triggers a
 *    reconcile of the scene graph.
 *  - `chapterIndex` state changes only when the active chapter changes, which
 *    is the only thing the DOM overlay actually needs to re-render for.
 *
 * `smoothed` is eased toward the raw value each frame by the consumer, so a
 * trackpad's jumpy deltas do not translate into jumpy camera motion.
 */
export function useScrollProgress(chapterBounds: { from: number; to: number }[]) {
  const progress = useRef(0);
  const [chapterIndex, setChapterIndex] = useState(0);

  useEffect(() => {
    const read = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress.current = Math.min(1, Math.max(0, value));

      const index = chapterBounds.findIndex(
        (bound) => progress.current >= bound.from && progress.current < bound.to,
      );
      const resolved = index === -1 ? chapterBounds.length - 1 : index;
      setChapterIndex((current) => (current === resolved ? current : resolved));
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [chapterBounds]);

  return { progress, chapterIndex };
}
