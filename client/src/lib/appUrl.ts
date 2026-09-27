const base = import.meta.env.BASE_URL || "/";

export const appBasePath = base === "/" ? "" : base.replace(/\/$/, "");

export function appUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalized === "/" ? "/" : normalized}`;
}
