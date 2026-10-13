/** Keep reference markers near the screen without discarding important map pins.
 *
 * All ordinary/route/GPS markers stay in the input, even if offscreen. Only
 * supplemental references outside the buffered viewport are removed from
 * decluttering, clustering and DOM rendering. The 160px buffer exceeds both
 * the 44px declutter radius and the 64px cluster cell, preventing popping
 * along the edge on small phones.
 *
 * Coordinates remain in memory in the input; nothing is persisted or shared.
 */
export function cullOffscreenMapReferences<T>(
  items: readonly T[],
  project: (item: T) => { x: number; y: number },
  isReference: (item: T) => boolean,
  isSelected: (item: T) => boolean,
  viewport: { width: number; height: number },
  pan: { x: number; y: number },
  padding = 160,
): T[] {
  // Avoid changing semantics for a viewport that has not yet been measured.
  if (!(viewport.width > 0 && viewport.height > 0)) return items.slice();
  return items.filter(item => {
    if (!isReference(item) || isSelected(item)) return true;
    const { x, y } = project(item);
    const screenX = x + pan.x;
    const screenY = y + pan.y;
    return Number.isFinite(screenX) && Number.isFinite(screenY) &&
      screenX >= -padding && screenX <= viewport.width + padding &&
      screenY >= -padding && screenY <= viewport.height + padding;
  });
}
