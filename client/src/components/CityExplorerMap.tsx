import { MapView, loadGoogleMapsScript } from "@/components/Map";
import { useEffect, useRef, useState } from "react";
import type { PlaceCategory, PlaceEntity } from "@/lib/placeEntity";
import { categoryFromGoogleType, categoryToGoogleTypes } from "@/lib/placeSearch";
import { getDistanceKm, type Coordinates } from "@/lib/stationDirectorySearch";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";

type Props = {
  category: PlaceCategory | "all";
  center: Coordinates;
  online: boolean;
  onResults: (places: PlaceEntity[]) => void;
  onSelect?: (place: PlaceEntity) => void;
};

const sourceColors:Record<PlaceCategory|"all",string> = {
  all:"#FFFFFF", fuel:"#C7FF3C", health:"#FF7A90", education:"#62B8FF",
  transport:"#FFB86B", government:"#B59CFF", security:"#FF8D55",
  leisure:"#59DFA5", accessibility:"#3DE3FF",
};

function placeCoordinates(value:google.maps.LatLng|google.maps.LatLngLiteral|undefined){
  if(!value) return null;
  if(typeof (value as google.maps.LatLng).lat === "function"){
    const item=value as google.maps.LatLng;
    return {lat:item.lat(),lng:item.lng()};
  }
  const item=value as google.maps.LatLngLiteral;
  return {lat:item.lat,lng:item.lng};
}

export default function CityExplorerMap({category,center,online,onResults,onSelect}:Props){
  const mapRef=useRef<google.maps.Map|null>(null);
  const markersRef=useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const clearMarkers=()=>{
    markersRef.current.forEach(marker=>{marker.map=null;});
    markersRef.current=[];
  };

  const renderMarkers=async (places:PlaceEntity[])=>{
    const map=mapRef.current;
    if(!map) return;
    const markerLib=await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    clearMarkers();
    markersRef.current=places.filter(place=>place.coordinates).map(place=>{
      const content=document.createElement("div");
      content.style.width="18px";
      content.style.height="18px";
      content.style.borderRadius="999px";
      content.style.background=sourceColors[place.category];
      content.style.border="3px solid #102028";
      content.style.boxShadow="0 5px 18px rgba(0,0,0,.28)";
      content.setAttribute("aria-label",place.name);
      const marker=new markerLib.AdvancedMarkerElement({map,position:place.coordinates!,title:place.name,content});
      marker.addListener("click",()=>onSelect?.(place));
      return marker;
    });
  };

  const localFuel=category==="fuel"
    ? AGUAS_LINDAS_STATIONS
      .filter(s=>Number.isFinite(Number(s.anp?.latitude))&&Number.isFinite(Number(s.anp?.longitude)))
      .slice(0,80)
      .map((s):PlaceEntity=>({
        id:"local:"+s.cnpj,
        name:s.displayName,
        category:"fuel",
        coordinates:{lat:Number(s.anp?.latitude),lng:Number(s.anp?.longitude)},
        address:s.address,
        neighborhood:s.neighborhood,
        source:s.dataOrigin==="ANP" ? "ANP" : "Local",
        sourceDate:s.verifiedAt??null,
        status:"unknown",
        isEnrichment:false,
      }))
    : [];

  const queryPlaces=async()=>{
    if(!mapRef.current || !online){
      if(category==="fuel" && localFuel.length){
        onResults(localFuel);
        void renderMarkers(localFuel);
      } else {
        onResults([]);
        clearMarkers();
      }
      return;
    }
    if(category==="accessibility"){
      onResults([]);
      clearMarkers();
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try{
      await loadGoogleMapsScript();
      const placesLib=await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const types=category==="all" ? [] : categoryToGoogleTypes(category);
      const request:google.maps.places.SearchNearbyRequest={
        fields:["id","displayName","formattedAddress","location","googleMapsURI","businessStatus","types"],
        locationRestriction:{center,radius:5000},
        maxResultCount:20,
        rankPreference:placesLib.SearchNearbyRankPreference.DISTANCE,
        language:"pt-BR",
        region:"BR",
      };
      if(types.length) request.includedPrimaryTypes=types;
      const response=await placesLib.Place.searchNearby(request);
      const seen=new Set<string>();
      const mapped=(response.places??[]).map((place):PlaceEntity|null=>{
        if(!place.id || seen.has(place.id)) return null;
        const coordinates=placeCoordinates(place.location);
        if(!coordinates) return null;
        seen.add(place.id);
        const displayName=typeof place.displayName==="string" ? place.displayName : place.displayName?.text;
        const rawTypes=(place.types??[]) as string[];
        return {
          id:"google:"+place.id,
          name:displayName||"Local",
          category:category==="all" ? categoryFromGoogleType(rawTypes) : category,
          subcategory:rawTypes[0]??null,
          coordinates,
          address:place.formattedAddress??null,
          source:"Google",
          sourceDate:new Date().toISOString(),
          status:place.businessStatus==="CLOSED_TEMPORARILY" ? "temporarily_closed" : "operational",
          mapsUrl:place.googleMapsURI??null,
          isEnrichment:true,
          evidence:[{label:"Enriquecimento geográfico",source:"Google",updatedAt:new Date().toISOString()}],
        };
      }).filter((value):value is PlaceEntity=>Boolean(value));
      if(category==="fuel" && localFuel.length){
        const localKeys=new Set(localFuel.map(item=>item.cnpj).filter(Boolean));
        const merged=[...localFuel,...mapped.filter(item=>!localKeys.has(item.address||""))];
        onResults(merged);
        await renderMarkers(merged);
      } else {
        onResults(mapped);
        await renderMarkers(mapped);
      }
    }catch{
      setError("O mapa externo não respondeu agora. Os dados locais continuam disponíveis quando existirem.");
      if(category==="fuel" && localFuel.length){
        onResults(localFuel);
        void renderMarkers(localFuel);
      } else {
        onResults([]);
        clearMarkers();
      }
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    const onlineHandler=()=>void queryPlaces();
    window.addEventListener("online",onlineHandler);
    return ()=>window.removeEventListener("online",onlineHandler);
  },[category,center.lat,center.lng,online]);

  useEffect(()=>{ if(mapRef.current) void queryPlaces(); },[category,center.lat,center.lng,online]);

  useEffect(()=>()=>clearMarkers(),[]);

  if(!online){
    const offlineMessage = category==="fuel" && localFuel.length
      ? "Os postos do catálogo local continuam disponíveis. Para saúde, educação e outras categorias, os resultados externos precisam de conexão."
      : "As camadas externas precisam de conexão; o Trajeto não inventa pontos que não estejam no pacote local.";
    const offlineSource = category==="fuel" ? "ANP / catálogo local" : "pacote local disponível no aparelho";
    return <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#E8F0EA]">
      <div className="min-h-[min(46dvh,420px)] p-5">
        <div className="flex min-h-[360px] flex-col justify-between rounded-[1.35rem] border border-black/10 bg-[linear-gradient(135deg,#edf4ef,#dce8df)] p-5 text-[#163840]">
          <div>
            <p className="text-[.55rem] font-black uppercase tracking-[.14em] text-[#3A6B72]">Mapa local</p>
            <h2 className="mt-2 max-w-xs text-xl font-black tracking-tight">Você está offline.</h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#5F7169]">{offlineMessage}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
            <p className="text-[.52rem] font-black uppercase tracking-[.12em] text-[#6B7B73]">Fonte</p>
            <p className="mt-1 text-sm font-black">{offlineSource}</p>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white">
    <MapView
      className="h-[min(66dvh,620px)]"
      initialCenter={center}
      initialZoom={13}
      deferUntilVisible={false}
      onMapReady={map=>{mapRef.current=map;void queryPlaces();}}
      fallback={<div className="grid h-[min(66dvh,620px)] place-items-center bg-[#E8F0EA] p-6 text-center text-[#355149]"><div><p className="font-black">Mapa indisponível</p><p className="mt-1 text-xs">A lista continua disponível abaixo.</p></div></div>}
    />
    <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
      <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.58rem] font-black text-[#163840] shadow-lg">{loading?"Consultando…":online?"Enriquecimento ao vivo":"Modo offline"}</span>
      <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.55rem] font-bold text-[#5C6D65] shadow-lg">até 5 km</span>
    </div>
    {error&&<div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-[#FFB86B]/30 bg-[#FFF7EA]/95 px-3 py-2.5 text-xs font-bold text-[#734B16]">{error}</div>}
  </div>;
}

export function placeDistanceLabel(place:PlaceEntity,center:Coordinates){
  const value=getDistanceKm(center,place.coordinates??null);
  return value==null ? null : value<1 ? Math.round(value*1000)+" m" : value.toFixed(1).replace(".",",")+" km";
}
