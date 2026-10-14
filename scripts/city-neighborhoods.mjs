import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export function neighborhoodKey(value) {
  const romans = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 };
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9 ]/g,' ').replace(/\bjd\b/g,'jardim').replace(/\bpq\b/g,'parque')
    .replace(/\b(?:da|de|do|das|dos)\b/g,' ').replace(/\b0+(\d+)\b/g,'$1')
    .replace(/\bclub\b/g,'clube').trim().replace(/\s+/g,' ')
    .replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/,word=>String(romans[word]))
    .replace(/^parque barragem setor /,'setor ')
    .replace(/^jardim perola barragem /,'jardim perola ');
}
function validPoint(lat,lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat > -15.9 && lat < -15.6 && lng > -48.45 && lng < -48.15;
}
function representative(points) {
  const median = values => values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const lat=median(points.map(p=>p.lat)), lng=median(points.map(p=>p.lng));
  return [...points].sort((a,b)=>Math.hypot(a.lat-lat,(a.lng-lng)*.96)-Math.hypot(b.lat-lat,(b.lng-lng)*.96) || a.lat-b.lat || a.lng-b.lng)[0];
}
export function buildCityNeighborhoods(atlas, parts) {
  const groups = new Map();
  for(const part of parts) for(const row of part.rows) {
    const address=part.strings[row[7]], precision=part.strings[row[10]];
    if(typeof address!=='string'||typeof precision!=='string'||!validPoint(row[8],row[9])) continue;
    // A shared city CEP does not locate a neighbourhood. Use only explicit
    // neighbourhood references or finer references attributed to CNEFE in the file.
    if(!/^(Bairro|Lote|Quadra|Número na rua) \(CNEFE\)$/.test(precision)) continue;
    const name=address.split(/,\s*CEP\b/i)[0].split(',').at(-1).trim();
    const key=neighborhoodKey(name);
    if(!key)continue;
    const group=groups.get(key)||{name,area:new Map(),fine:new Map()};
    const position=row[8]+','+row[9];
    const target=precision==='Bairro (CNEFE)'?group.area:group.fine;
    const existing=target.get(position)||{lat:row[8],lng:row[9],count:0};
    existing.count++;target.set(position,existing);groups.set(key,group);
  }
  const entries = atlas.items.filter(item=>item.id.startsWith('bairro-')).map(item=>({id:item.id,name:item.name,nameSource:'PMGIRS municipal 2023'}));
  const known=new Set(entries.map(item=>neighborhoodKey(item.name)));
  // Additional names must occur repeatedly at distinct finer references;
  // retain their address spelling, without merging them into official names.
  for(const [key,group] of groups) {
    if(known.has(key)||group.fine.size<3||! /^(jardim|parque|mansoes|residencial|recreio|condominio|setor|camping|padre)\b/.test(key))continue;
    const name=group.name.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\S)/g,(_,space,letter)=>space+letter.toLocaleUpperCase('pt-BR'))
      .replace(/\b(Da|De|Do|Das|Dos)\b/g,word=>word.toLowerCase()).replace(/\b(ii|iii|iv|vi|vii|viii|ix)\b/gi,word=>word.toUpperCase());
    entries.push({id:'endereco-'+key.replace(/ /g,'-'),name,nameSource:'Bairro no arquivo de endereços fornecido'});known.add(key);
  }
  return {schema:1,sourceDate:'2026-10-03',sources:[
    {label:'Prefeitura · PMGIRS 2023',url:'https://aguaslindasdegoias.go.gov.br/wp-content/uploads/2023/09/Revisao_Plano_PMGIRS_Aguas_Lindas.pdf'},
    {label:'Arquivo de empresas fornecido · referências atribuídas ao CNEFE',sha256:'0847eb84cdbcbfd0300db329222f94571ab001e557c84fbf7083560c9dccd5d8'},
  ],items:entries.map(item=>{
    const group=groups.get(neighborhoodKey(item.name));
    const area=group&&[...group.area.values()].sort((a,b)=>b.count-a.count||a.lat-b.lat||a.lng-b.lng)[0];
    const point=area||(group&&group.fine.size>=3?representative([...group.fine.values()]):undefined);
    return {...item,...(point?{lat:point.lat,lng:point.lng,precision:area?'Referência de bairro no arquivo':'Referência representativa de endereços do bairro',referenceCount:area?area.count:group.fine.size}:{precision:'Localização ainda não confirmada'})};
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const atlas=JSON.parse(await readFile(path.join(root,'client/public/data/aguas-lindas-city-atlas.json'),'utf8'));
  const directory=path.join(root,'client/src/data/businesses');
  const files=(await readdir(directory)).filter(file=>/^part-\d+\.json$/.test(file)).sort();
  const parts=await Promise.all(files.map(async file=>JSON.parse(await readFile(path.join(directory,file),'utf8'))));
  const result=buildCityNeighborhoods(atlas,parts);
  await writeFile(path.join(root,'client/public/data/aguas-lindas-neighborhoods.json'),JSON.stringify(result)+'\n');
  console.log(JSON.stringify({names:result.items.length,located:result.items.filter(item=>item.lat!==undefined).length,missing:result.items.filter(item=>item.lat===undefined).map(item=>item.name)}));
}
