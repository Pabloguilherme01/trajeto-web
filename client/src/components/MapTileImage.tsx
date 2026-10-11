import React, { memo } from "react";

/**
 * Tiles on the same grid do not change when the camera pans within it.
 * Memoizing the image prevents repeated React DOM work and event handler
 * replacement on every touch/pointer frame, especially on slower phones.
 */
function MapTileImage({
  tileKey,
  url,
  left,
  top,
  prefetch,
  onTileError,
  onTileLoad,
}: {
  tileKey: string;
  url: string;
  left: number;
  top: number;
  prefetch: boolean;
  onTileError: (key: string) => void;
  onTileLoad: (key: string) => void;
}) {
  return (
    <img
      src={url}
      referrerPolicy="origin"
      decoding="async"
      loading={prefetch ? "lazy" : "eager"}
      alt=""
      onError={() => onTileError(tileKey)}
      onLoad={() => onTileLoad(tileKey)}
      draggable={false}
      className="absolute size-64 max-w-none"
      style={{ left, top }}
    />
  );
}

export default memo(MapTileImage);
