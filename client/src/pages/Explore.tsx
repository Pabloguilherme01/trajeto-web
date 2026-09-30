import { Accessibility, Bus, ChevronRight, ExternalLink, Fuel, Globe2, HeartPulse, Landmark, LocateFixed, MapPin, Navigation, Search, Share2, Shield, TreePine, WifiOff, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import CityExplorerMap, { placeDistanceLabel } from "@/components/CityExplorerMap";
import DataHealthStrip from "@/components/DataHealthStrip";
import type { PlaceCategory, PlaceEntity } from "@/lib/placeEntity";
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS } from "@/lib/placeEntity";
import { inferPlaceCategory, placeMatchesQuery } from "@/lib/placeSearch";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";
import { appUrl } from "@/lib/appUrl";
import type { Coordinates } from "@/lib/stationDirectorySearch";
import { getPreferredNavigationProvider, openNavigation, shareText, vibration } from "@/lib/mobileTools";

type CategoryOption={key:PlaceCategory|"all";label:string;icon:typeof Fuel};
const categoryOptions:CategoryOption[]=[
  {key:"all",label:"Tudo",icon:Globe2},{key:"fuel",label:"Postos",icon:Fuel},
  {key:"health",label:"Saúde",icon:HeartPulse},{key:"education",label:"Educação",icon:GraduationCap},
  {key:"transport",label:"Transporte",icon:Bus},{key:"government",label:"Serviços",icon:Landmark},
  {key:"security",label:"Segurança",icon:Shield},{key:"leisure",label:"Lazer",icon:TreePine},{key:"territory",label:"Território",icon:MapPin},
  {key:"accessibility",label:"Acessibilidade",icon:Accessibility},
];

function fallbackCenter():Coordinates{
  const coords=AGUAS_LINDAS_STATIONS.map(s=>({lat:Number(s.anp?.latitude),lng:Number(s.anp?.longitude)}))
    .filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng));
  if(coords.length===0) return {lat:0,lng:0};
  return {lat:coords.reduce((sum,c)=>sum+c.lat,0)/coords.length,lng:coords.reduce((sum,c)=>sum+c.lng,0)/coords.length};
}

function iconFor(category:PlaceCategory){
  const map={fuel:Fuel,health:HeartPulse,education:GraduationCap,transport:Bus,government:Landmark,security:Shield,leisure:TreePine,accessibility:Accessibility,territory:MapPin};
  return map[category];
}

export default function Explore(){
  const [location,setLocation]=useLocation();
  const initialQuery = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("q") || ""
    : "";
  const [input,setInput]=useState(initialQuery);
  const [query,setQuery]=useState(initialQuery);
  const [online,setOnline]=useState(()=>typeof navigator==="undefined"||navigator.onLine);
  const [center,setCenter]=useState<Coordinates>(()=>{
    if(typeof window!=="undefined"){
      const params=new URLSearchParams(window.location.search);
      const lat=Number(params.get("lat"));const lng=Number(params.get("lng"));
      if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return {lat,lng};
      const q=params.get("q")||"";
      if(q)setInput(q);
    }
    return fallbackCenter();
  });
  const [category,setCategory]=useState<PlaceCategory|"all">(()=>{
    const q=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("q")||"":"";
    return inferPlaceCategory(q);
  });
  const [results,setResults]=useState<PlaceEntity[]>([]);
  const [selected,setSelected]=useState<PlaceEntity|null>(null);

  useEffect(()=>{
    const onOnline=()=>setOnline(true);
    const onOffline=()=>setOnline(false);
    window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);
    return ()=>{window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);};
  },[]);

  const filtered=useMemo(()=>results.filter(place=>placeMatchesQuery([place.name,place.address,place.neighborhood,place.subcategory],query)),[results,query]);

  const locate=()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(position=>setCenter({lat:position.coords.latitude,lng:position.coords.longitude}));
  };

  const submit=(event:FormEvent)=>{
    event.preventDefault();
    const next=input.trim();
    setQuery(next);
    setCategory(inferPlaceCategory(next));
  };

  const openNav=(place:PlaceEntity)=>{
    if(!place.coordinates)return;
    const links=openNavigation(place.coordinates.lat,place.coordinates.lng,place.name); const provider=getPreferredNavigationProvider(); window.open(links[provider],"_blank","noopener,noreferrer");
  };

  const shareMap=async()=>{
    const title=selected?.name || (query.trim() ? query.trim() : "Águas Lindas");
    const shareQuery = selected?.name || query.trim();
    const url=window.location.origin + appUrl("/mapa") + (shareQuery ? "?q=" + encodeURIComponent(shareQuery) : "");
    try {
      await shareText(
        "Trajeto · " + title + (selected?.address ? " · " + selected.address : ""),
        url,
        "Trajeto · mapa",
      );
      vibration(6);
    } catch {}
  };

  const categoryTitle=category==="all"?"Tudo":PLACE_CATEGORY_LABELS[category];

  return <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
    <div className="container max-w-5xl px-3 pt-4 sm:px-5 sm:pt-7">
      <header className="flex items-center justify-between gap-3">
        <div><p className="text-[.5rem] font-black uppercase tracking-[.18em] text-[#C7FF3C]">Mapa público</p><h1 className="mt-1 font-display text-[clamp(1.7rem,8vw,3.2rem)] font-semibold tracking-[-.055em]">Águas Lindas</h1><p className="mt-1 text-xs text-white/38">Mapa, serviços e referências em uma única busca.</p></div>
        {!online&&<span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB86B]/25 px-2.5 py-2 text-[.52rem] font-black text-[#FFD59B]"><WifiOff className="size-3"/>offline</span>}
      </header>

      <form onSubmit={submit} className="mt-5 rounded-[1.45rem] border border-white/10 bg-[#121B22] p-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3">
          <Search className="size-4 text-[#3DE3FF]"/>
          <input value={input} onChange={e=>setInput(e.target.value)} className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" placeholder="O que você procura?" enterKeyHint="search"/>
          <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Buscar"><ChevronRight className="size-5"/></button>
        </div>
      </form>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoryOptions.map(item=>{const Icon=item.icon;const active=category===item.key;return <button key={item.key} type="button" aria-pressed={active} onClick={()=>{setCategory(item.key);setQuery("");setInput("");setSelected(null);}} className={active?"shrink-0 rounded-2xl bg-[#C7FF3C] px-3 py-2.5 text-[#0B1014]":"shrink-0 rounded-2xl border border-white/10 bg-white/[.025] px-3 py-2.5 text-white/65"}><span className="flex items-center gap-2 text-[.6rem] font-black"><Icon className="size-3.5"/>{item.label}</span></button>;})}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={locate} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-3 text-[.56rem] font-black text-[#8BEAFF]"><LocateFixed className="size-3.5"/>Perto de mim</button>
        <button type="button" onClick={()=>void shareMap()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/8 px-3 text-[.56rem] font-black text-white/65" aria-label="Compartilhar mapa atual"><Share2 className="size-3.5"/>Compartilhar</button>
        <button type="button" onClick={()=>setLocation(appUrl("/postos"))} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/8 px-3 text-[.56rem] font-black text-white/65"><Fuel className="size-3.5"/>Diretório ANP de postos</button>
      </div>

      <section className="mt-4"><CityExplorerMap category={category} query={query} center={center} online={online} onResults={setResults} onSelect={setSelected}/></section>
      <DataHealthStrip online={online} />

            {filtered.some(place => place.source === "Google") && (
        <p className="mt-3 rounded-xl border border-white/6 bg-white/[.02] px-3 py-2 text-[.48rem] leading-relaxed text-white/30">
          Google · dados de mapa e Places exibidos como enriquecimento desta sessão.
        </p>
      )}

<section className="mt-4 rounded-[1.25rem] border border-white/8 bg-white/[.025] p-3">
        <div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Globe2 className="size-4"/></div><div><p className="text-[.55rem] font-black text-white">Como ler o mapa</p><p className="mt-1 text-[.52rem] leading-relaxed text-white/38">ANP é usado como fonte cadastral e de preço para postos. MAPA identifica enriquecimento geográfico externo. Uma referência externa não vira automaticamente um registro oficial.</p></div></div>
      </section>

      <section className="mt-4">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[.48rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">{category==="all"?"🌐":PLACE_CATEGORY_ICONS[category]} {categoryTitle}</p><h2 className="mt-1 text-base font-black">Resultados</h2></div><span className="text-[.55rem] font-bold text-white/30">{filtered.length} locais</span></div>

        {category==="accessibility"&&<div className="mt-3 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] p-3 text-xs leading-relaxed text-white/55">Acessibilidade só aparece quando houver dados específicos e verificáveis. O Trajeto não presume rampa, banheiro ou acesso com base apenas no nome do local.</div>}

        <div className="mt-3 grid gap-2">
          {filtered.map(place=>{const Icon=iconFor(place.category);const distance=placeDistanceLabel(place,center);return <article key={place.id} className="rounded-[1.25rem] border border-white/8 bg-[#121B22] p-3">
            <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.05] text-[#C7FF3C]"><Icon className="size-4"/></div><div className="min-w-0 flex-1"><h3 className="truncate text-[.72rem] font-black">{place.name}</h3><p className="mt-1 line-clamp-2 text-[.58rem] leading-relaxed text-white/40">{place.address||"Endereço não informado"}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-white/[.05] px-2 py-1 text-[.46rem] font-black text-white/55">{place.source}</span>{distance&&<span className="rounded-full bg-white/[.05] px-2 py-1 text-[.46rem] font-black text-white/55">{distance}</span>}{place.status==="temporarily_closed"&&<span className="rounded-full bg-[#FFB86B]/10 px-2 py-1 text-[.46rem] font-black text-[#FFD59B]">fechado segundo a fonte</span>}</div></div><button type="button" onClick={()=>setSelected(place)} className="grid size-9 place-items-center rounded-xl border border-white/8 text-white/45" aria-label={"Abrir "+place.name}><MapPin className="size-4"/></button></div>
            <div className="mt-3 flex gap-2"><button type="button" onClick={()=>openNav(place)} disabled={!place.coordinates} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] text-[.55rem] font-black text-[#0B1014] disabled:opacity-30"><Navigation className="size-3.5"/>Ir agora</button>{place.mapsUrl&&<a href={place.mapsUrl} target="_blank" rel="noreferrer" className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/8 text-white/45" aria-label="Abrir referência no mapa"><ExternalLink className="size-3.5"/></a>}</div>
          </article>;})}
        </div>

        {!filtered.length&&<div className="mt-3 rounded-[1.25rem] border border-white/8 bg-white/[.02] p-5 text-center"><p className="text-sm font-black">Nenhum resultado disponível</p><p className="mt-1 text-xs leading-relaxed text-white/35">{online?"Tente outro termo ou aproxime o mapa.":"Para consultas externas, conecte-se à internet. Postos locais continuam disponíveis em Postos."}</p></div>}
      </section>

      {selected&&<div className="fixed inset-x-3 bottom-[max(5.5rem,calc(5rem + env(safe-area-inset-bottom)))] z-50 mx-auto max-w-md rounded-[1.5rem] border border-white/10 bg-[#10191F]/98 p-4 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"><MapPin className="size-4"/></div><div className="min-w-0 flex-1"><p className="text-[.68rem] font-black">{selected.name}</p><p className="mt-1 text-[.56rem] leading-relaxed text-white/42">{selected.address||"Endereço não informado"}</p><p className="mt-2 text-[.48rem] font-bold text-white/28">{selected.source==="Google"?"Enriquecimento de mapa · não é cadastro oficial":selected.source+" · base local"}</p></div><button type="button" onClick={()=>setSelected(null)} className="grid size-9 place-items-center text-white/40" aria-label="Fechar"><ChevronRight className="size-4 rotate-90"/></button></div>
      </div>}
    </div>
  </main>;
}
