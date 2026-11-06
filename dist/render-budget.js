// Cap fullscreen/high-DPI buffers rather than letting pixel work grow without a bound.
export const RENDER_BUDGET=Object.freeze({maxPixels:2000000,maxPixelRatio:1.35});
export function viewportPixelRatio(width,height,requested=1){const area=Math.max(1,width)*Math.max(1,height);return Math.min(Math.max(.1,requested),RENDER_BUDGET.maxPixelRatio,Math.sqrt(RENDER_BUDGET.maxPixels/area));}
