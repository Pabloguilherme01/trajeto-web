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
