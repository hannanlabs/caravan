'use client';

import Image from 'next/image';

/** The Caravan brand mark — the camel-caravan photo, clipped to a rounded square. */
export function BrandMark({ size = 30, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Image src="/caravan.webp" alt="Caravan" width={size} height={size} priority={priority} />
    </span>
  );
}
