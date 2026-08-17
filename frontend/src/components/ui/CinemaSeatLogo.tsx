interface CinemaSeatLogoProps {
  /** Icon size in px (square). Default: 28 */
  size?: number;
  /** Primary brand colour. Default: #7c3aed */
  color?: string;
}

/**
 * CinemaSeatLogoMark — Sleek Geometric Cinema Chair Silhouette
 *
 * Design Concept: "Modern VIP Cinema Seat"
 *
 * A clean, modern 2D vector silhouette of a luxury cinema seat:
 *   • Ergonomic Headrest (Top Pill)
 *   • Contour Backrest & Cushion (Center Block)
 *   • Sleek Armrest Pillars (Left & Right)
 *   • Base Support Pedestal (Bottom)
 *
 * Multi-tone palette: Primary Violet (#7c3aed) + Highlight Lavender (#c084fc).
 * Crisp legibility at 16px, 28px, or 512px.
 */
export function CinemaSeatLogoMark({
  size = 28,
  color = '#7c3aed',
}: CinemaSeatLogoProps) {
  const gradientId = 'cinemaSeatChairGradient';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      {/* ── 1. Ergonomic Headrest ── */}
      <rect
        x="10"
        y="3.5"
        width="12"
        height="4.5"
        rx="2.25"
        fill="#c084fc"
      />

      {/* ── 2. Contour Backrest Cushion ── */}
      <rect
        x="8.5"
        y="9"
        width="15"
        height="9.5"
        rx="2.5"
        fill={`url(#${gradientId})`}
      />

      {/* ── 3. Plush Seat Cushion Base ── */}
      <rect
        x="6.5"
        y="19.5"
        width="19"
        height="4"
        rx="2"
        fill="#c084fc"
      />

      {/* ── 4. Left Armrest Pillar ── */}
      <rect
        x="4"
        y="13.5"
        width="3.5"
        height="9.5"
        rx="1.75"
        fill={color}
      />

      {/* ── 5. Right Armrest Pillar ── */}
      <rect
        x="24.5"
        y="13.5"
        width="3.5"
        height="9.5"
        rx="1.75"
        fill={color}
      />

      {/* ── 6. Base Pedestal Support ── */}
      <rect
        x="11"
        y="24.5"
        width="10"
        height="3.5"
        rx="1.75"
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * CinemaSeatLogo — Main Brand Export
 */
export function CinemaSeatLogo({
  size = 28,
  color = '#7c3aed',
}: CinemaSeatLogoProps) {
  return <CinemaSeatLogoMark size={size} color={color} />;
}
