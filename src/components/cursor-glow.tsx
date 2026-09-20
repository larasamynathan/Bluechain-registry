import { useEffect, useRef } from "react";

/**
 * A soft radial-gradient spotlight that trails the mouse cursor,
 * giving the whole app a subtle "light" feel. Pure CSS-variable driven —
 * no re-renders on mouse move. Automatically disabled on touch devices
 * and for users who prefer reduced motion.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    function onMove(e: PointerEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!el?.classList.contains("is-active")) el?.classList.add("is-active");
      if (!raf) {
        raf = requestAnimationFrame(apply);
      }
    }

    function apply() {
      raf = 0;
      if (!el) return;
      el.style.setProperty("--x", `${targetX}px`);
      el.style.setProperty("--y", `${targetY}px`);
    }

    function onLeave() {
      el?.classList.remove("is-active");
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}
