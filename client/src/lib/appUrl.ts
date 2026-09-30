const base = import.meta.env.BASE_URL || "/";

export const appBasePath = base === "/" ? "" : base.replace(/\/$/, "");

export function appUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalized === "/" ? "/" : normalized}`;
}

// Wouter já adiciona a base; normalize evita duplicação quando os callers usam appUrl().
export function normalizeRouterTarget(target: string, basePath = appBasePath) {
  if (
    basePath &&
    (
      target === basePath + basePath ||
      target.startsWith(basePath + basePath + "/") ||
      target.startsWith(basePath + basePath + "?")
    )
  ) {
    return target.slice(basePath.length);
  }
  return target;
}
