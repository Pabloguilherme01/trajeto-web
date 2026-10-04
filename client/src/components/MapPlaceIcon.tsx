import React from "react";
import { Fuel, HeartPulse, GraduationCap, ShoppingBag, Utensils, Landmark, Bus, MapPin, Route, Shield, Trees } from "lucide-react";

const segments = {
  combustivel: { label: "Posto", Icon: Fuel, glyph: "⛽" },
  saude: { label: "Saúde", Icon: HeartPulse, glyph: "✚" },
  educacao: { label: "Educação", Icon: GraduationCap, glyph: "🎓" },
  compras: { label: "Compras", Icon: ShoppingBag, glyph: "🛍" },
  alimentacao: { label: "Alimentação", Icon: Utensils, glyph: "🍴" },
  servicos: { label: "Serviços", Icon: Landmark, glyph: "🏛" },
  transporte: { label: "Transporte", Icon: Bus, glyph: "🚌" },
  seguranca: { label: "Segurança", Icon: Shield, glyph: "🛡" },
  "meio-ambiente": { label: "Meio ambiente", Icon: Trees, glyph: "🌳" },
  via: { label: "Via", Icon: Route, glyph: "↗" },
  lugar: { label: "Lugar", Icon: MapPin, glyph: "📍" },
} as const;
export function mapPlaceSegment(item: { category?: string; source?: string; coordinateKind?: string }) {
  const key = item.category && Object.hasOwn(segments, item.category) ? item.category as keyof typeof segments
    : item.source === "ANP" ? "combustivel" : item.coordinateKind === "street-midpoint" ? "via" : "lugar";
  return segments[key];
}
export default function MapPlaceIcon({ item, className = "size-4" }: { item: Parameters<typeof mapPlaceSegment>[0]; className?: string }) {
  const { Icon, label } = mapPlaceSegment(item);
  return <Icon className={className} aria-hidden="true" data-map-segment={label} />;
}
