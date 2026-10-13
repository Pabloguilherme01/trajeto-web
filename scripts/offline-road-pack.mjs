import { writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BOUNDS = [-15.82, -48.35, -15.67, -48.2];
const MODES = ['driving', 'walking', 'cycling'];
const ROAD_KINDS = new Set(['motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','living_street','service','track','footway','pedestrian','path','cycleway','steps','bridleway']);
const ACCESS = new Set(['yes','designated','permissive']);

export function roadPermissions(tags) {
  return Object.fromEntries(MODES.map(mode => {
    const keys = mode === 'driving' ? ['motorcar','motor_vehicle','vehicle','access'] : mode === 'cycling' ? ['bicycle','vehicle','access'] : ['foot','access'];
    const kind = tags.highway;
    const disallowed = mode === 'driving' ? ['footway','pedestrian','path','cycleway','steps','bridleway'] : mode === 'cycling' ? ['motorway','motorway_link','trunk','trunk_link','steps','footway','bridleway'] : ['motorway','motorway_link','trunk','trunk_link','cycleway'];
    const access = keys.map(key=>tags[key]).find(value=>value != null);
    const onewayKeys = mode === 'walking' ? ['oneway:foot'] : mode === 'cycling' ? ['oneway:bicycle','oneway:vehicle','oneway'] : ['oneway:motorcar','oneway:motor_vehicle','oneway:vehicle','oneway'];
    // Conditional and directional access need a richer router. Exclude these
    // ways rather than interpreting a condition as unconditional permission.
    const unsupported = Object.keys(tags).some(key=>
      [...keys,...onewayKeys].some(base=>key.startsWith(base+':') && (key.endsWith(':conditional') || key.endsWith(':forward') || key.endsWith(':backward'))));
    if (!ROAD_KINDS.has(kind) || unsupported || (access != null && !ACCESS.has(access)) || (access == null && disallowed.includes(kind))) return [mode,'denied'];
    const oneway = onewayKeys.map(key=>tags[key]).find(value=>value != null) ?? (mode !== 'walking' && (tags.junction === 'roundabout' || kind === 'motorway') ? 'yes' : 'no');
    return [mode, ['yes','1','true'].includes(oneway) ? 'forward' : oneway === '-1' ? 'backward' : ['no','0','false'].includes(oneway) ? 'both' : 'denied'];
  }));
}

export function buildRoadPack(data, retrievedAt = new Date().toISOString()) {
  if (!Array.isArray(data.elements) || data.remark) throw new Error('Incomplete Overpass response');
  const nodes = new Map(data.elements.filter(e=>e.type === 'node').map(node=>[node.id,node]));
  const restrictedWays = new Set(data.elements.filter(e=>e.type === 'relation' && e.tags?.type === 'restriction').flatMap(e=>(e.members??[]).filter(m=>m.type === 'way').map(m=>m.ref)));
  const roads = [];
  for (const way of data.elements) {
    if (way.type !== 'way' || !ROAD_KINDS.has(way.tags?.highway) || !Array.isArray(way.nodes) || way.nodes.length < 2) continue;
    const geometry = way.nodes.map(id=>nodes.get(id));
    if (geometry.some(node=>!node || !Number.isFinite(node.lat) || !Number.isFinite(node.lon) || Math.abs(node.lat)>90 || Math.abs(node.lon)>180)) continue;
    const permissions = roadPermissions(way.tags);
    // Existing offline A* does not model turn restrictions or barrier nodes.
    // Keep their geometry for display but exclude their ways from routing.
    if (restrictedWays.has(way.id) || geometry.some(node=>node.tags?.barrier || node.tags?.access || node.tags?.motorcar || node.tags?.motor_vehicle || node.tags?.vehicle || node.tags?.foot || node.tags?.bicycle)) {
      for (const mode of MODES) permissions[mode] = 'denied';
    }
    roads.push({id:way.id,kind:way.tags.highway,name:way.tags.name ?? way.tags.ref ?? '',points:geometry.map(node=>[node.lat,node.lon]),nodeIds:way.nodes,permissions});
  }
  return {schema:1,source:'OpenStreetMap contributors',license:'ODbL-1.0',sourceUrl:'https://www.openstreetmap.org/copyright',retrievedAt,bounds:BOUNDS,roads};
}

async function syncRoadPack(output) {
  const query = `[out:json][timeout:120];way[highway](${BOUNDS.join(',')})->.roads;(.roads;node(w.roads);rel(bw.roads)[type=restriction];);out body;`;
  let data;
  for (const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']) {
    try {
      const response = await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(150000),headers:{'User-Agent':'Trajeto-Web/offline-map (https://github.com/Pabloguilherme01/trajeto-web)'}});
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const pack = buildRoadPack(await response.json());
      if (pack.roads.length < 3000 || pack.roads.length > 12000 || pack.roads.filter(road=>road.permissions.driving !== 'denied').length < 1000) throw new Error('Road coverage validation failed');
      data = pack;
      break;
    } catch (error) { console.error(String(error)); }
  }
  if (!data) throw new Error('Could not refresh verified OSM road data; existing pack kept');
  await writeFile(output+'.tmp',JSON.stringify(data)+'\n');
  await rename(output+'.tmp',output);
  console.log(`Saved ${data.roads.length} roads with OSM node identity and mode permissions`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await syncRoadPack(process.argv[2] ?? 'client/public/data/aguas-lindas-offline-map.json');
}
