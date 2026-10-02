import { expect, test } from "@playwright/test";

// Real public screens, with large text and the menu at the smallest supported width.
test("mobile directory remains readable with enlarged text and closes after choosing a destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("");
  await page.evaluate(() =>
    document.documentElement.classList.add("a11y-large")
  );
  await page.getByRole("button", { name: "Mais opções" }).click();
  const dialog = page.getByRole("dialog");
  for (const name of [
    "Buscar no Trajeto",
    "Mapa e locais",
    "Encontrar postos",
    "Ajuda e offline",
  ]) {
    const button = dialog.getByRole("button", { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await dialog.getByRole("button", { name: "Mapa e locais" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A cidade no seu caminho" })
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
});

for (const path of ["planejar", "postos", "servicos", "ajuda", "mapa"]) {
  test(`mobile ${path}: visible explanatory copy is readable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const small = await page.locator("main").evaluate(main =>
      [...main.querySelectorAll("p, label, summary")]
        .filter(element => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            element.textContent?.trim() &&
            getComputedStyle(element).visibility !== "hidden" &&
            parseFloat(getComputedStyle(element).fontSize) < 12
          );
        })
        .map(element => element.textContent?.trim().slice(0, 80))
    );
    expect(small).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(320);
  });
}
