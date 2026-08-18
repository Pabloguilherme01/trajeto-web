const tokenRetryDelaysMs = [300, 600, 1200] as const;

type TokenPage = { status: string };

export async function requestGoogleNextPage<T extends TokenPage>(request: () => Promise<T>, wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))) {
  let response = await request();
  for (const delay of tokenRetryDelaysMs) {
    if (response.status !== "INVALID_REQUEST") return response;
    await wait(delay);
    response = await request();
  }
  return response;
}

export { tokenRetryDelaysMs };
