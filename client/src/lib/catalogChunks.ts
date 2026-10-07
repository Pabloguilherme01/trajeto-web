/** Keep catalog loading bounded and give input/paint a turn between parts. */
export async function loadCatalogChunks<T>(
  loaders: Array<() => Promise<unknown>>,
  normalize: (chunk: unknown) => T[],
  key: (item: T) => string,
  yieldToUi: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 0)),
) {
  const unique = new Map<string, T>();
  for (let offset = 0; offset < loaders.length; offset += 2) {
    const chunks = await Promise.all(loaders.slice(offset, offset + 2).map(load => load()));
    for (const chunk of chunks) {
      for (const item of normalize(chunk)) unique.set(key(item), item);
      await yieldToUi();
    }
  }
  return [...unique.values()];
}
