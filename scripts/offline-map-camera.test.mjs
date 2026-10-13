import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(await readFile(new URL('../client/src/lib/offlineMapCamera.ts',import.meta.url),'utf8'));
const {fitOfflineMapCamera} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
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
