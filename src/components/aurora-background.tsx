/** Fixed tidal contour canvas behind the app. */
export function AuroraBackground() {
  return (
    <div className="tide-canvas" aria-hidden="true">
      <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
        <path d="M-80 190C140 80 270 280 480 170s390-10 540-90 260 20 330 90" />
        <path d="M-100 235C130 120 280 330 500 215s390-8 550-88 255 30 330 100" />
        <path d="M-60 500c180-125 350 70 520-30s350-25 500-110 290 5 360 90" />
        <path d="M-30 550c180-125 350 70 520-30s350-25 500-110 290 5 360 90" />
      </svg>
    </div>
  );
}
