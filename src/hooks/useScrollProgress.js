import { useEffect, useState } from "react";

// Tracks scroll progress from 0 to 1 across `range` viewport-heights of
// scrolling, so callers can drive scroll-linked animations without wiring
// up their own rAF/listener boilerplate.
export default function useScrollProgress(range = 1) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = null;

    const update = () => {
      raf = null;
      const max = window.innerHeight * range;
      const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      setProgress(next);
    };

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [range]);

  return progress;
}
