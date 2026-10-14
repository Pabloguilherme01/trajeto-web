import { expect, test } from "@playwright/test";

for (const width of [320, 1360]) test(`Pages: neighbourhood names, search and focus work offline at ${width}px`, async ({page,context}) => {
  await page.setViewportSize({width,height:900});
  await page.goto("mapa");
  const panel=page.getByRole("region",{name:"Bairros e setores do mapa"});
  await expect(panel).toBeVisible();
  await panel.getByText("Encontrar bairro ou setor",{exact:true}).click();
  const results=panel.getByRole("list",{name:"Bairros e setores disponíveis"}).getByRole("listitem");
  await expect(results).toHaveCount(12);
  await panel.getByRole("button",{name:"Mostrar todos os bairros"}).click();
  await expect(results).toHaveCount(100);
  // Closing the disclosure must release all hidden buttons/input from the DOM,
  // then restore the same expanded directory when the user reopens it.
  await panel.locator("[data-neighborhood-search] summary").click();
  await expect(panel.getByRole("list",{name:"Bairros e setores disponíveis"})).toHaveCount(0);
  await expect(panel.getByRole("searchbox",{name:"Buscar bairro no mapa"})).toHaveCount(0);
  await panel.locator("[data-neighborhood-search] summary").click();
  await expect(results).toHaveCount(100);
  await panel.getByRole("searchbox",{name:"Buscar bairro no mapa"}).fill("Jd. América 02");
  await expect(panel.getByRole("button",{name:"Ver bairro Jardim América II no mapa",exact:true})).toBeVisible();
  await expect(panel.getByRole("button",{name:"Ver bairro Jardim América I no mapa",exact:true})).toHaveCount(0);
  await panel.getByRole("searchbox",{name:"Buscar bairro no mapa"}).fill("jardim brasilia");
  await panel.locator("[data-neighborhood-search] summary").click();
  await expect(panel.getByRole("searchbox",{name:"Buscar bairro no mapa"})).toHaveCount(0);
  await panel.locator("[data-neighborhood-search] summary").click();
  await expect(panel.getByRole("searchbox",{name:"Buscar bairro no mapa"})).toHaveValue("jardim brasilia");
  await panel.getByRole("button",{name:"Ver bairro Jardim Brasília no mapa",exact:true}).click();
  await expect(page.locator('[data-map-neighborhood="bairro-jardim-brasilia"]')).toBeVisible();
  // An unopened directory should not mount dozens of hidden buttons.
  await expect(panel.getByRole("list",{name:"Bairros visíveis nesta área"})).toHaveCount(0);
  await panel.locator("[data-neighborhood-viewport] summary").click();
  await expect(panel.getByRole("button",{name:"Centralizar bairro Jardim Brasília",exact:true})).toBeVisible();
  await panel.getByRole("button",{name:"Centralizar bairro Jardim Brasília",exact:true}).click();
  await expect(page.locator('[data-map-neighborhood="bairro-jardim-brasilia"]')).toBeVisible();
  await panel.locator("[data-neighborhood-viewport] summary").click();
  await expect(panel.getByRole("list",{name:"Bairros visíveis nesta área"})).toHaveCount(0);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  const localPanel=page.getByRole("region",{name:"Bairros e setores do mapa"});
  await expect(localPanel).toBeVisible();
  await localPanel.getByText("Encontrar bairro ou setor",{exact:true}).click();
  await localPanel.getByRole("searchbox",{name:"Buscar bairro no mapa"}).fill("jardim brasilia");
  await localPanel.getByRole("button",{name:"Ver bairro Jardim Brasília no mapa",exact:true}).click();
  await expect(page.locator('[data-map-neighborhood="bairro-jardim-brasilia"]')).toBeVisible();
  await localPanel.getByRole("button",{name:"Ocultar nomes dos bairros",exact:true}).click();
  await expect(page.getByRole("group",{name:"Nomes dos bairros no mapa"})).toHaveCount(0);
  await localPanel.getByRole("button",{name:"Mostrar nomes dos bairros",exact:true}).click();
  await expect(page.getByRole("group",{name:"Nomes dos bairros no mapa"})).toBeVisible();
  await localPanel.getByRole("searchbox",{name:"Buscar bairro no mapa"}).fill("Royal Parque");
  await expect(localPanel.getByText("Localização ainda não confirmada",{exact:true})).toBeVisible();
  await localPanel.locator("[data-neighborhood-viewport] summary").click();
  await expect(localPanel.getByRole("button",{name:"Centralizar bairro Royal Parque",exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
