import { describe, expect, it } from "vitest";
import { getMobilityContext } from "./mobilityContext";

describe("getMobilityContext", () => {
  const base = {
    online: true,
    hasDestination: true,
    hasVehicle: true,
    hasLastTrip: true,
    offlineRoutes: [{ savedAt: new Date().toISOString() }],
  };

  it("prioriza repetir a última viagem quando ela existe", () => {
    expect(getMobilityContext(base)).toMatchObject({
      state: "route_ready",
      primaryAction: "repeat_trip",
    });
  });

  it("usa rota offline como ação principal quando está sem conexão", () => {
    expect(getMobilityContext({ ...base, online: false })).toMatchObject({
      state: "offline",
      primaryAction: "continue_offline_route",
    });
  });

  it("não promete navegação offline sem uma rota salva", () => {
    expect(getMobilityContext({ ...base, online: false, hasLastTrip: false, hasVehicle: false, offlineRoutes: [] })).toMatchObject({
      state: "idle",
      primaryAction: "plan_trip",
    });
  });

  it("identifica configuração incompleta", () => {
    expect(getMobilityContext({ ...base, hasDestination: false })).toMatchObject({
      state: "preparing",
      primaryAction: "setup_destination",
    });
  });
});
