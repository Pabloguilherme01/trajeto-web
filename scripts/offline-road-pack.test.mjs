import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadPack, roadPermissions } from './offline-road-pack.mjs';

test('retains OSM junction identity and one-way direction', () => {
  const pack = buildRoadPack({ elements: [
    {type:'node',id:1,lat:-15.75,lon:-48.28},
    {type:'node',id:2,lat:-15.751,lon:-48.28},
    {type:'node',id:3,lat:-15.751,lon:-48.279},
    {type:'way',id:10,nodes:[1,2],tags:{highway:'residential',name:'Rua A',oneway:'yes'}},
    {type:'way',id:11,nodes:[2,3],tags:{highway:'residential',name:'Rua B'}}
  ]}, '2026-10-13T00:00:00Z');
  assert.deepEqual(pack.roads[0].nodeIds,[1,2]);
  assert.equal(pack.roads[1].nodeIds[0],pack.roads[0].nodeIds[1]);
  assert.equal(pack.roads[0].permissions.driving,'forward');
  assert.equal(pack.roads[0].permissions.walking,'both');
});

test('honors restricted access, reverse lanes and bicycle exceptions', () => {
  assert.equal(roadPermissions({highway:'residential',access:'private'}).driving,'denied');
  assert.equal(roadPermissions({highway:'residential',oneway:'-1'}).driving,'backward');
  assert.equal(roadPermissions({highway:'residential',oneway:'yes','oneway:bicycle':'no'}).cycling,'both');
  assert.equal(roadPermissions({highway:'footway'}).driving,'denied');
  assert.equal(roadPermissions({highway:'residential','motor_vehicle:conditional':'no @ (Mo-Fr)'}).driving,'denied');
  assert.equal(roadPermissions({highway:'residential','oneway:foot':'yes'}).walking,'forward');
  assert.equal(roadPermissions({highway:'residential','oneway:vehicle':'yes'}).driving,'forward');
  assert.equal(roadPermissions({highway:'residential','oneway:vehicle':'yes'}).cycling,'forward');
});

test('excludes ways through motorcar and vehicle access restrictions on nodes', () => {
  for (const key of ['motorcar','vehicle']) {
    const pack = buildRoadPack({elements:[
      {type:'node',id:1,lat:-15.75,lon:-48.28,tags:{[key]:'no'}},
      {type:'node',id:2,lat:-15.751,lon:-48.28},
      {type:'way',id:10,nodes:[1,2],tags:{highway:'residential'}}
    ]});
    assert.equal(pack.roads[0].permissions.driving,'denied');
  }
});

test('excludes restricted turns, barriers and incomplete geometry from navigation', () => {
  const nodes = [1,2,3].map((id,i)=>({type:'node',id,lat:-15.75-i*.001,lon:-48.28,...(id===2?{tags:{barrier:'gate'}}:{})}));
  const pack = buildRoadPack({elements:[...nodes,
    {type:'way',id:10,nodes:[1,2],tags:{highway:'residential'}},
    {type:'way',id:11,nodes:[1,3],tags:{highway:'residential'}},
    {type:'way',id:12,nodes:[1,99],tags:{highway:'residential'}},
    {type:'relation',id:20,tags:{type:'restriction',restriction:'no_left_turn'},members:[{type:'way',ref:11,role:'from'}]}
  ]});
  assert.equal(pack.roads.length,2);
  assert.equal(pack.roads[0].permissions.driving,'denied');
  assert.equal(pack.roads[1].permissions.driving,'denied');
});
