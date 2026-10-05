import { expect, it } from "vitest";
import { routePublicService } from "./routePublicService";
import { PUBLIC_SERVICES } from "./publicServices";

it("matches public service destinations while preserving the source and closure guidance", () => {
  expect(routePublicService("HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho, GO")?.id).toBe("heal");
  expect(routePublicService("Hospital Municipal Bom Jesus, Águas Lindas de Goiás, GO")?.guidance).toContain("desativada temporariamente");
  for (const service of PUBLIC_SERVICES.filter(item => item.mapQuery)) {
    expect(routePublicService(service.mapQuery!)?.id).toBe(service.id);
  }
});

it("does not attach a service to an unknown destination or raw GPS coordinates", () => {
  expect(routePublicService("Farmácia próxima ao HEAL")).toBeNull();
  expect(routePublicService("-15.74637, -48.27584")).toBeNull();
  expect(routePublicService("")).toBeNull();
});
