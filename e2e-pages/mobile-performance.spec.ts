import { expect, test } from "@playwright/test";

test("catalog search responds on a narrow viewport with throttled CPU", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  try {
    await page.goto("./mapa");
    await expect(page.getByText(/21\.486 empresas do arquivo/)).toBeVisible({ timeout: 60_000 });
    const search = page.getByRole("textbox", { name: "Buscar destino no mapa" });
    const start = Date.now();
    await search.fill("42.115.689/0001-40");
    await expect(page.getByRole("status").filter({ hasText: /1 destino\(s\) na lista/ })).toBeVisible();
    const responseMs = Date.now() - start;
    console.log(JSON.stringify({ viewport: 320, cpuSlowdown: 4, catalogQueryResponseMs: responseMs }));
    // A responsiveness guard, not a claim about FPS on physical devices.
    expect(responseMs).toBeLessThan(2500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.getByRole("link", { name: "Ir até aqui" }).first()).toBeVisible();
  } finally {
    await cpu.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cpu.detach();
  }
});


test("planner modes respond without fetching a closed location catalog", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const catalogRequests: string[] = [];
  page.on("request", request => {
    if (/\/part-\d+-[^/]+\.js(?:\?|$)/.test(request.url())) catalogRequests.push(request.url());
  });
  try {
    await page.goto("./planejar");
    await expect(page.getByRole("heading", { name: "Planejar rota", exact: true })).toBeVisible();
    const samples: Array<{ mode: string; responseMs: number }> = [];
    for (const mode of ["A pé", "Bicicleta", "Transporte", "Carro"]) {
      const button = page.getByRole("button", { name: mode, exact: true });
      const start = Date.now();
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      samples.push({ mode, responseMs: Date.now() - start });
    }
    await page.getByText("Preferências da viagem", { exact: true }).click();
    for (const mode of ["Offline", "Economia", "Condução", "Inteligente"]) {
      const button = page.getByRole("button", { name: mode, exact: true });
      const start = Date.now();
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      samples.push({ mode, responseMs: Date.now() - start });
    }
    console.log(JSON.stringify({ viewport: 320, cpuSlowdown: 4, modeTransitions: samples }));
    for (const sample of samples) expect(sample.responseMs).toBeLessThan(1500);
    expect(catalogRequests).toEqual([]);
    // Prove the request observer detects the chunks when the selector is opened.
    await page.getByText("Escolher destino no catálogo", { exact: true }).click();
    await page.getByRole("button", { name: "Escolher destino no catálogo local", exact: true }).click();
    await page.getByRole("textbox", { name: "Buscar destino local" }).fill("42.115.689/0001-40");
    await expect(page.getByRole("button", { name: /Selecionar AMAG/ })).toBeVisible({ timeout: 60_000 });
    expect(catalogRequests.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  } finally {
    await cpu.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cpu.detach();
  }
});
