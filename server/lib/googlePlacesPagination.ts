const tokenRetryDelaysMs = [600, 1200, 2400, 4000] as const;

type TokenPage = { status: string };

export function isGooglePageTokenUnavailable(status: string) {
  return status === "INVALID_REQUEST";
}

export async function requestGoogleNextPage<T extends TokenPage>(request: () => Promise<T>, wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))) {
  let response = await request();
  for (const delay of tokenRetryDelaysMs) {
    if (!isGooglePageTokenUnavailable(response.status)) return response;
    await wait(delay);
    response = await request();
  }
  return response;
}

export { tokenRetryDelaysMs };
