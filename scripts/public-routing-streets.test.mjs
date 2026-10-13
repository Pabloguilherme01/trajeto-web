import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const roadSource = stripTypeScriptTypes(await readFile(new URL('../client/src/lib/offlineRoadRouting.ts',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
const roadUrl = dataModule('const appUrl = path => path;\n' + roadSource);
const road = await import(roadUrl);
const publicSource = stripTypeScriptTypes(await readFile(new URL('../client/src/lib/publicRouting.ts',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replaceAll('import.meta.env','({MODE:"test"})');
const routing = await import(dataModule(`import { calculateOfflineRoadRoute } from '${roadUrl}';
const requestOptionalMapboxRoute = async () => null;
const isAmbiguousAtlasStreet = () => false;
` + publicSource));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; road.resetOfflineRoadRoutingForTests(); routing.resetPublicRoutingTestState(); });

const pack = {schema:1,roads:[
  {id:1,kind:'residential',name:'Rua A',nodeIds:[1,2,3],permissions:{driving:'both',walking:'both',cycling:'both'},points:[[-15.75,-48.28],[-15.75,-48.279],[-15.75,-48.278]]},
  {id:2,kind:'residential',name:'Rua B',nodeIds:[3,4,5],permissions:{driving:'both',walking:'both',cycling:'both'},points:[[-15.75,-48.278],[-15.751,-48.278],[-15.752,-48.278]]}
]};
function installPack() {
  globalThis.fetch = async url => {
    if (String(url).includes('aguas-lindas-offline-map.json')) return {ok:true,json:async()=>pack};
    throw new Error('Provider unavailable');
  };
}
test('private GPS route follows local streets without sending origin to a provider', async () => {
  installPack();
  const route = await routing.calculatePrivateLocationRoute('-15.750012,-48.280012','-15.752,-48.278');
  assert.equal(route.source,'offline-road');
  assert.deepEqual(route.origin,{lat:-15.75,lng:-48.28});
  assert.deepEqual(route.steps.filter(step=>step.name).map(step=>step.name),['Rua A','Rua B']);
});
test('public routing failure recovers on the local road network', async () => {
  installPack();
  const route = await routing.calculatePublicRoute('-15.75,-48.28','-15.752,-48.278');
  assert.equal(route.source,'offline-road');
  assert.ok(route.steps.some(step=>step.maneuver === 'turn-right'));
});
test('walking uses the walking graph rather than falling back to a straight line', async () => {
  installPack();
  const route = await routing.calculatePublicRoute('-15.75,-48.28','-15.752,-48.278','walking');
  assert.equal(route.source,'offline-road');
  assert.equal(route.mode,'walking');
});

test('bundled city network produces a route through named streets near Avenida Segunda', async () => {
  const city = JSON.parse(await readFile(new URL('../client/public/data/aguas-lindas-offline-map.json',import.meta.url),'utf8'));
  globalThis.fetch = async url => {
    assert.ok(String(url).includes('aguas-lindas-offline-map.json'));
    return {ok:true,json:async()=>city};
  };
  const route = await road.calculateOfflineRoadRoute({lat:-15.731,lng:-48.276},{lat:-15.733,lng:-48.274},'driving');
  assert.ok(route,'published network must connect local streets');
  assert.ok(route.points.length > 2);
  assert.ok(route.steps.some(step=>step.name && step.name !== 'via local mapeada'));
  assert.ok(route.distanceMeters > 100);
});
