// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapTileImage from "./MapTileImage";

afterEach(cleanup);

describe("memoized map tile images", () => {
  const props = {
    tileKey: "13:1200:4000",
    url: "https://tile.openstreetmap.org/13/1200/4000.png",
    left: 256,
    top: 512,
    prefetch: false,
  };

  it("uses a memoized component so unchanged tiles can skip camera-frame renders", () => {
    expect((MapTileImage as unknown as { $$typeof: symbol }).$$typeof)
      .toBe(Symbol.for("react.memo"));
  });

  it("preserves privacy, decode behavior, image position and error/load reporting", () => {
    const onTileError = vi.fn();
    const onTileLoad = vi.fn();
    const { container, rerender } = render(
      <MapTileImage {...props} onTileError={onTileError} onTileLoad={onTileLoad} />,
    );
    const tile = container.querySelector("img")!;
    expect(tile.src).toBe(props.url);
    expect(tile.alt).toBe("");
    expect(tile.getAttribute("referrerpolicy")).toBe("origin");
    expect(tile.getAttribute("decoding")).toBe("async");
    expect(tile.getAttribute("loading")).toBe("eager");
    expect(tile.draggable).toBe(false);
    expect(tile.style.left).toBe("256px");
    expect(tile.style.top).toBe("512px");
    fireEvent.error(tile);
    fireEvent.load(tile);
    expect(onTileError).toHaveBeenCalledExactlyOnceWith(props.tileKey);
    expect(onTileLoad).toHaveBeenCalledExactlyOnceWith(props.tileKey);

    rerender(
      <MapTileImage {...props} left={512} prefetch onTileError={onTileError} onTileLoad={onTileLoad} />,
    );
    expect(container.querySelector("img")).toBe(tile);
    expect(tile.style.left).toBe("512px");
    expect(tile.getAttribute("loading")).toBe("lazy");
  });
});
