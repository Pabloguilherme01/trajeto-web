type Point = { x: number; y: number };

/** Keep SVG translations near the viewport, below browser layout limits. */
export function offlineSvgTransform(camera: Point & { scale: number }, origin: Point, width: number, height: number, pan: Point) {
  return `translate(${width / 2 + pan.x - (camera.x - origin.x) * camera.scale} ${height / 2 + pan.y - (camera.y - origin.y) * camera.scale}) scale(${camera.scale})`;
}

export function offlineSvgPath(points: readonly Point[], origin: Point) {
  return points.map((point, index) => `${index ? "L" : "M"}${(point.x - origin.x).toFixed(8)} ${(point.y - origin.y).toFixed(8)}`).join(" ");
}
