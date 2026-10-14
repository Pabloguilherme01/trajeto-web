import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(await readFile(new URL('../client/src/lib/offlineMapCamera.ts',import.meta.url),'utf8'));
const {fitOfflineMapCamera} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const svgSource = stripTypeScriptTypes(await readFile(new URL('../client/src/lib/offlineMapSvg.ts',import.meta.url),'utf8'));
const {offlineSvgPath,offlineSvgTransform} = await import('data:text/javascript;base64,'+Buffer.from(svgSource).toString('base64'));
for (const [width,height] of [[320,360],[640,520]]) test(`route endpoints remain below controls at ${width}px`, () => {
  const points = [{x:1,y:2},{x:1.001,y:2.002}];
  const camera = fitOfflineMapCamera(points,width,height,1);
  for (const point of points) {
    const x = width/2+(point.x-camera.x)*camera.scale;
    const y = height/2+(point.y-camera.y)*camera.scale;
    assert.ok(x>=44-1e-6 && x<=width-80+1e-6);
    assert.ok(y>=Math.min(160,height*.45)-1e-6 && y<=height-64+1e-6);
  }
});
test('city catalogue retains its centered viewport and cluster spacing', () => {
  const camera = fitOfflineMapCamera([{x:1,y:2},{x:1.001,y:2.002}],320,360,1,false);
  assert.equal(camera.x,1.0005);
  assert.equal(camera.y,2.001);
  assert.ok(Math.abs(camera.scale - 130000) < 1e-6);
});
for (const [dx,dy] of [[0.0000055,0],[0,0.0000055],[0.0000055,0.0000055]]) {
  test(`short trip separates endpoint pins (${dx}, ${dy})`, () => {
    const points = [{x:0.366,y:0.544},{x:0.366+dx,y:0.544+dy}];
    const camera = fitOfflineMapCamera(points,320,360,1);
    assert.ok(Math.hypot(dx,dy)*camera.scale >= 110, 'nearby pins need readable space');
  });
}
test('coincident endpoints have a finite, bounded neighbourhood view', () => {
  const camera = fitOfflineMapCamera([{x:0.366,y:0.544},{x:0.366,y:0.544}],320,360,1);
  assert.ok(Number.isFinite(camera.x) && Number.isFinite(camera.y));
  assert.ok(camera.scale > 0 && camera.scale <= 40_000_000);
});
for (const zoom of [1,6]) test(`short route SVG stays aligned below browser translation limits at zoom ${zoom}`, () => {
  const points = [{x:0.3659,y:0.5442568},{x:0.36590556,y:0.54426257}];
  const camera = fitOfflineMapCamera(points,1320,730,zoom);
  const origin = points[0];
  const transform = offlineSvgTransform(camera,origin,1320,730,{x:0,y:0});
  const [tx,ty,scale] = transform.match(/-?[\d.]+/g).map(Number);
  assert.ok(Math.abs(tx)<2**25 && Math.abs(ty)<2**25, 'SVG translation must not hit Chromium layout clamping');
  const pathPoints = [...offlineSvgPath(points,origin).matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
  for (let i=0;i<points.length;i++) {
    const x = tx+Number(pathPoints[i][1])*scale;
    const y = ty+Number(pathPoints[i][2])*scale;
    assert.ok(Math.abs(x-(660+(points[i].x-camera.x)*camera.scale))<1);
    assert.ok(Math.abs(y-(365+(points[i].y-camera.y)*camera.scale))<1);
  }
});

test('invalid projected route points and unmeasured viewports keep a finite camera', () => {
  const route = [
    {x:NaN,y:0.544},
    {x:0.366,y:0.544},
    {x:Infinity,y:0.7},
    {x:0.36601,y:0.54401},
  ];
  const valid = fitOfflineMapCamera(route.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),320,360,1);
  assert.deepEqual(fitOfflineMapCamera(route,320,360,1),valid);
  for (const controlMode of [false,true]) {
    for (const [width,height,zoom] of [[0,0,1],[50,50,1],[NaN,Infinity,NaN],[320,360,-1]]) {
      const camera = fitOfflineMapCamera(route,width,height,zoom,controlMode);
      assert.ok(Number.isFinite(camera.x) && Number.isFinite(camera.y) && Number.isFinite(camera.scale));
      assert.ok(camera.scale>0, 'camera scale must never invert or disappear');
    }
  }
  assert.deepEqual(fitOfflineMapCamera([],320,360,1),{x:0,y:0,scale:1});
  assert.deepEqual(fitOfflineMapCamera([{x:NaN,y:Infinity}],320,360,1),{x:0,y:0,scale:1});
});
