import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { buildCityNeighborhoods, neighborhoodKey } from './city-neighborhoods.mjs';

const dataset=JSON.parse(await readFile(new URL('../client/public/data/aguas-lindas-neighborhoods.json',import.meta.url),'utf8'));
const code=(await readFile(new URL('../client/src/lib/cityNeighborhoods.ts',import.meta.url),'utf8')).replace(/import snapshot from .*?;/,'const snapshot='+JSON.stringify(dataset)+';');
const {layoutNeighborhoodLabels,neighborhoodSearchKey,searchCityNeighborhoods}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(code)).toString('base64'));
function part(rows){const strings=[];return{strings,rows:rows.map(([name,lat,lng,precision])=>{const row=Array(17).fill(0);row[7]=strings.push('QUADRA 1, 2, '+name+', CEP 72910001, Águas Lindas de Goiás - GO')-1;row[8]=lat;row[9]=lng;row[10]=strings.push(precision)-1;return row;})};}
const atlas={items:[{id:'bairro-jardim-brasilia',name:'Jardim Brasília'},{id:'bairro-royal-parque',name:'Royal Parque'}]};
test('normalizes spelling and sectors without merging different numbered areas',()=>{
  assert.equal(neighborhoodKey('Jardim da Barragem II'),neighborhoodKey('JARDIM BARRAGEM 02'));
  assert.equal(neighborhoodKey('Parque da Barragem Setor 02'),neighborhoodKey('Setor 2'));
  assert.notEqual(neighborhoodKey('Jardim América I'),neighborhoodKey('Jardim América II'));
});
test('browser search finds accentless and abbreviated names without mixing numbered areas',()=>{
  assert.equal(neighborhoodSearchKey('Jd. América 02'),neighborhoodSearchKey('Jardim América II'));
  assert.equal(neighborhoodSearchKey('Pq Águas Bonitas 01'),neighborhoodSearchKey('Parque Águas Bonitas I'));
  assert.notEqual(neighborhoodSearchKey('Jardim América I'),neighborhoodSearchKey('Jardim América II'));
  const found=searchCityNeighborhoods('jd. america 02');
  assert.ok(found.some(item=>item.name==='Jardim América II'));
  assert.ok(!found.some(item=>item.name==='Jardim América I'));
  assert.ok(searchCityNeighborhoods('pq aguas bonitas 1').some(item=>item.name==='Parque Águas Bonitas I'));
  assert.equal(searchCityNeighborhoods('').length,dataset.items.length);
  assert.equal(searchCityNeighborhoods('bairro inexistente').length,0);
});
test('a city CEP and missing coordinates never create a mapped neighbourhood',()=>{
  const result=buildCityNeighborhoods(atlas,[part([['Jardim Brasília',-15.75,-48.28,'CEP (CNEFE)'],['Royal Parque',null,null,'Bairro (CNEFE)']])]);
  assert.equal(result.items.length,2);assert.ok(result.items.every(item=>item.lat===undefined));
});
test('keeps an explicit area reference and selects a real finer point instead of inventing a centroid',()=>{
  const points=[[-15.73,-48.28],[-15.731,-48.281],[-15.732,-48.282]];
  const result=buildCityNeighborhoods(atlas,[part([['Jardim Brasília',-15.725139,-48.285318,'Bairro (CNEFE)'],...points.map(([lat,lng])=>['Royal Parque',lat,lng,'Quadra (CNEFE)'])])]);
  assert.equal(result.items.find(item=>item.name==='Jardim Brasília').lat,-15.725139);
  const royal=result.items.find(item=>item.name==='Royal Parque');assert.ok(points.some(([lat,lng])=>royal.lat===lat&&royal.lng===lng));
});
test('all municipal names remain available with source-region coordinates',async()=>{
  const source=JSON.parse(await readFile(new URL('../client/public/data/aguas-lindas-city-atlas.json',import.meta.url),'utf8'));
  for(const item of source.items.filter(item=>item.id.startsWith('bairro-')))assert.ok(dataset.items.some(entry=>entry.id===item.id&&entry.name===item.name));
  for(const item of dataset.items.filter(item=>item.lat!==undefined))assert.ok(item.lat>-15.9&&item.lat<-15.6&&item.lng>-48.45&&item.lng<-48.15);
  assert.equal(new Set(dataset.items.map(item=>item.id)).size,dataset.items.length);
});
test('mobile labels are separated and prioritise the chosen neighbourhood',()=>{
  const items=[{id:'a',name:'Jardim Brasília',lat:1,lng:1},{id:'b',name:'Mansões Olinda',lat:2,lng:2},{id:'c',name:'Fora do mapa',lat:3,lng:3}];
  const labels=layoutNeighborhoodLabels(items,item=>item.lat===3?{x:900,y:200}:{x:160,y:180},320,360,'b');
  assert.deepEqual(labels.map(item=>item.id),['b']);assert.ok(labels[0].x-labels[0].width/2>=8);
  assert.deepEqual(layoutNeighborhoodLabels(items,item=>item.lat===3?{x:900,y:200}:{x:160,y:180},320,360,null,[{x:160,y:180}]),[]);
});
