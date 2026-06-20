import React from 'react';

/**
 * Generates style properties containing the background image and layout custom variables
 * to support responsive focal points and zooming.
 */
export function getResponsiveImageStyle(imagesConfig: any, slotKey: string, fallbackUrl: string) {
  // Extract URL - handle both string slot and object slot formats for safety
  const urlVal = imagesConfig?.[slotKey];
  const url = typeof urlVal === 'string' ? urlVal : (urlVal?.url || fallbackUrl);

  const posX = imagesConfig?.[`${slotKey}_x`] ?? 50;
  const posY = imagesConfig?.[`${slotKey}_y`] ?? 50;
  const scale = imagesConfig?.[`${slotKey}_scale`] ?? 100;
  
  const posXMobile = imagesConfig?.[`${slotKey}_xm`] ?? 50;
  const posYMobile = imagesConfig?.[`${slotKey}_ym`] ?? 50;
  const scaleMobile = imagesConfig?.[`${slotKey}_scalem`] ?? 100;

  return {
    backgroundImage: `url('${url}')`,
    '--desktop-pos': `${posX}% ${posY}%`,
    '--desktop-scale': scale / 100,
    '--mobile-pos': `${posXMobile}% ${posYMobile}%`,
    '--mobile-scale': scaleMobile / 100,
  } as React.CSSProperties;
}

/**
 * Generates the responsive custom properties for direct image tags (e.g. Next.js <Image />)
 */
export function getResponsiveImgStyle(imagesConfig: any, slotKey: string) {
  const posX = imagesConfig?.[`${slotKey}_x`] ?? 50;
  const posY = imagesConfig?.[`${slotKey}_y`] ?? 50;
  const scale = imagesConfig?.[`${slotKey}_scale`] ?? 100;
  
  const posXMobile = imagesConfig?.[`${slotKey}_xm`] ?? 50;
  const posYMobile = imagesConfig?.[`${slotKey}_ym`] ?? 50;
  const scaleMobile = imagesConfig?.[`${slotKey}_scalem`] ?? 100;

  return {
    '--desktop-pos': `${posX}% ${posY}%`,
    '--desktop-scale': scale / 100,
    '--mobile-pos': `${posXMobile}% ${posYMobile}%`,
    '--mobile-scale': scaleMobile / 100,
  } as React.CSSProperties;
}
