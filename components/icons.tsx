'use client';

/* Caravan line-icon set — 1.6px stroke, currentColor.
   A clean, consistent set that replaces the emoji titles/affordances. */

import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
}

function Svg({ size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <span className="ic">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

// bar chart — Stats
export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <rect x={7.5} y={12} width={3} height={5} rx={0.6} />
    <rect x={13} y={8} width={3} height={9} rx={0.6} />
  </Svg>
);

// columns / treasury — Taxes
export const IconBank = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 4l9 5.5" />
    <line x1={4.5} y1={9.8} x2={4.5} y2={18} />
    <line x1={9} y1={9.8} x2={9} y2={18} />
    <line x1={15} y1={9.8} x2={15} y2={18} />
    <line x1={19.5} y1={9.8} x2={19.5} y2={18} />
    <path d="M3 18.5h18" />
  </Svg>
);

// exchange arrows — Trade
export const IconExchange = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9h13l-3.2-3.2" />
    <path d="M20 15H7l3.2 3.2" />
  </Svg>
);

// book — Education
export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A2 2 0 0 1 6 4h6v15H6a2 2 0 0 0-2 2V5.5Z" />
    <path d="M20 5.5A2 2 0 0 0 18 4h-6v15h6a2 2 0 0 1 2 2V5.5Z" />
  </Svg>
);

// heartbeat — Healthcare
export const IconPulse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h3.5l1.8-4 3 9 2.2-7 1.6 2H21" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <line x1={6} y1={6} x2={18} y2={18} />
    <line x1={18} y1={6} x2={6} y2={18} />
  </Svg>
);
export const IconX = IconClose;

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <line x1={12} y1={5} x2={12} y2={19} />
    <line x1={5} y1={12} x2={19} y2={12} />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <line x1={5} y1={12} x2={19} y2={12} />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5 10 17.5 19 6.5" />
  </Svg>
);

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Svg>
);

export const IconArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={8.5} />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.6 2.3 2.6 14.7 0 17" />
    <path d="M12 3.5c-2.6 2.3-2.6 14.7 0 17" />
  </Svg>
);

export const IconReset = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M5 3v4h4" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={9} cy={8} r={3} />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 19a5.5 5.5 0 0 0-3-4.9" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5v15l12-7.5z" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 4.5h11l-2 3.5 2 3.5H5" />
  </Svg>
);

// shield — Military
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5l7 2.6v5.3c0 4.3-2.9 7.3-7 8.6-4.1-1.3-7-4.3-7-8.6V6.1l7-2.6z" />
  </Svg>
);

// cpu / chip — Technology
export const IconCpu = (p: IconProps) => (
  <Svg {...p}>
    <rect x={6} y={6} width={12} height={12} rx={2.2} />
    <rect x={9.5} y={9.5} width={5} height={5} rx={1} />
    <line x1={9} y1={3} x2={9} y2={6} />
    <line x1={15} y1={3} x2={15} y2={6} />
    <line x1={9} y1={18} x2={9} y2={21} />
    <line x1={15} y1={18} x2={15} y2={21} />
    <line x1={3} y1={9} x2={6} y2={9} />
    <line x1={3} y1={15} x2={6} y2={15} />
    <line x1={18} y1={9} x2={21} y2={9} />
    <line x1={18} y1={15} x2={21} y2={15} />
  </Svg>
);
