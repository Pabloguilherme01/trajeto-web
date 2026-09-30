import { MapView, loadGoogleMapsScript } from "@/components/Map";
import { useEffect, useRef, useState } from "react";
import type { PlaceCategory, PlaceEntity } from "@/lib/placeEntity";
import { categoryFromGoogleType, categoryToGoogleTypes } from "@/lib/placeSearch";
import { getDistanceKm, type Coordinates } from "@/lib/stationDirectorySearch";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";

type Props = {
  category: PlaceCategory;
  center: Coordinates;
  online: boolean;
  onResults: (places: PlaceEntity[]) => void;
  selectedId?: string | null;
  onSelect?: (place: PlaceEntity) => void;
};

const sourceColors:Record<PlaceCategory,string> = {
  fuel:"#C7FF3C", health:"#FF7A90", education:"#62B8FF", transport:"#FFB86B",
  government:"#B59CFF", security:"#FF8D55", leisure:"#59DFA5", accessibility:"#3DE3FF",
};

function locationOf(place:google.maps.LatLng|google.maps.LatLngLiteral|undefined){
  if(!place) return null;
  if("lat" in place && typeof place.lat==="function") return {lat:place.lat(),lng:place.lng()};
  return {lat:place.lat,lng:place.lng};
}

export default function CityExplorerMap({ category, center, online, onResults, selectedId, onSelect }:Props){
  const mapRef=useRef<google.maps.Map|null>(null);
  const markersRef=useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const clearMarkers=()=>{
    for(const marker of markersRef.current) marker.map=null;
    markersRef.current=[];
  };

  useEffect(()=>{
    return ()=>clearMarkers();
  },[]);

  const renderMarkers=(map:google.maps.Map,places:PlaceEntity[])=>{
    void google.maps.importLibrary("marker").then((lib)=>{
      const Marker=lib as google.maps.MarkerLibrary;
      clearMarkers();
      places.forEach(place=>{
        if(!place.coordinates) return;
        const dot=document.createElement("div");
        dot.style.width="18px";
        dot.style.height="18px";
        dot.style.borderRadius="999px";
        dot.style.background=sourceColors[place.category];
        dot.style.border="3px solid #102028";
        dot.style.boxShadow="0 5px 18px rgba(0,0,0,.28)";
        dot.setAttribute("aria-label",place.name);
        const marker=new Marker.AdvancedMarkerElement({
          map,
          position:place.coordinates,
          title:place.name,
          content:dot,
        });
        marker.addListener("click",()=>onSelect?.(place));
        markersRef.current.push(marker);
      });
    });
  };

  const queryPlaces=async()=>{
    if(!online || !mapRef.current) return;
    const types=categoryToGoogleTypes(category);
    if(!types.length){ onResults([]); clearMarkers(); return; }
    setLoading(true); setError(null);
    try{
      await loadGoogleMapsScript();
      const placesLib=await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const {places}=await placesLib.Place.searchNearby({
        fields:["id","displayName","formattedAddress","location","googleMapsURI","businessStatus","types"],
        includedPrimaryTypes:types,
        locationRestriction:{center,radius:5000},
        maxResultCount:20,
        rankPreference:placesLib.SearchNearbyRankPreference.DISTANCE,
        language:"pt-BR",
        region:"BR",
      });
      const mapped=(places??[]).map((place):PlaceEntity|null=>{
        const coords=locationOf(place.location);
        if(!place.id || !coords) return null;
        const name=place.displayName?.toString() || "Local";
        const rawTypes=(place.types??[]) as string[];
        return {
          id:"google:"+place.id,
          name,
          category:categoryFromGoogleType(rawTypes),
          subcategory:rawTypes[0]??null,
          coordinates:coords,
          address:place.formattedAddress??null,
          source:"Google",
          sourceDate:new Date().toISOString(),
          status:place.businessStatus==="CLOSED_TEMPORARILY" ? "temporarily_closed" : "operational",
          mapsUrl:place.googleMapsURI??null,
          isEnrichment:true,
          evidence:[{label:"Enriquecimento geográfico",source:"Google",updatedAt:new Date().toISOString()}],
        };
      }).filter((p):p is PlaceEntity=>Boolean(p));
      onResults(mapped);
      renderMarkers(mapRef.current,mapped);
    }catch{
      setError("Não foi possível consultar o mapa externo agora.");
      onResults([]);
      clearMarkers();
    }finally{ setLoading(false); }
  };

  useEffect(()=>{
    if(!mapRef.current) return;
    void queryPlaces();
  },[category,center.lat,center.lng,online]);

  const localFuel=category==="fuel" ? AGUAS_LINDAS_STATIONS
    .filter(s=>Number.isFinite(Number(s.anp?.latitude))&&Number.isFinite(Number(s.anp?.longitude)))
    .slice(0,60)
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
    })) : [];

  useEffect(()=>{
    if(category!=="fuel" || !mapRef.current) return;
    const base=localFuel;
    if(base.length){
      renderMarkers(mapRef.current,base);
      onResults(base);
    }
  },[category]);

  return (
    <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white">
      <MapView
        className="h-[min(66dvh,620px)]"
        initialCenter={center}
        initialZoom={13}
        deferUntilVisible={false}
        onMapReady={map=>{mapRef.current=map; void queryPlaces();}}
        fallback={<div className="grid h-[min(66dvh,620px)] place-items-center bg-[#E8F0EA] p-6 text-center text-[#355149]"><div><p className="font-black">Mapa indisponível</p><p className="mt-1 text-xs">A lista continua disponível abaixo.</p></div></div>}
      />
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.58rem] font-black text-[#163840] shadow-lg">
          {loading ? "Atualizando mapa…" : online ? "Enriquecimento ao vivo" : "Modo offline"}
        </span>
        <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.55rem] font-bold text-[#5C6D65] shadow-lg">
          até 5 km
        </span>
      </div>
      {error && <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-[#FFB86B]/30 bg-[#FFF7EA]/95 px-3 py-2.5 text-xs font-bold text-[#734B16]">{error}</div>}
    </div>
  );
}

export function placeDistanceLabel(place:PlaceEntity,center:Coordinates){
  const value=getDistanceKm(center,place.coordinates??null);
  return value==null ? null : value<1 ? Math.round(value*1000)+" m" : value.toFixed(1).replace(".",",")+" km";
}
