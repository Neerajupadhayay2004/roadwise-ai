import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DamageMarker {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: string;
  timestamp: Date;
  description: string;
}

interface MapViewProps {
  damageMarkers?: DamageMarker[];
  onLocationSelect?: (lat: number, lng: number) => void;
}

// IIT Bombay coordinates
const IIT_BOMBAY = { lat: 19.1334, lng: 72.9133 };

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#6b7280";
  }
};

const createCustomIcon = (severity: string) => {
  const color = getSeverityColor(severity);
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          font-weight: bold;
        ">!</div>
      </div>
    `,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export const MapView = ({ damageMarkers = [], onLocationSelect }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [IIT_BOMBAY.lat, IIT_BOMBAY.lng],
      zoom: 15,
      zoomControl: false,
    });

    // Add OpenStreetMap tiles (free, no API key needed)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add IIT Bombay marker
    const iitMarker = L.marker([IIT_BOMBAY.lat, IIT_BOMBAY.lng], {
      icon: L.divIcon({
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="font-size: 20px;">🏛️</span>
          </div>
        `,
        className: "iit-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    }).addTo(map);

    iitMarker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <strong style="font-size: 14px;">IIT Bombay</strong><br/>
        <span style="color: #666; font-size: 12px;">RoadVision AI Headquarters</span>
      </div>
    `);

    // Handle click for location selection
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onLocationSelect]);

  // Add damage markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    damageMarkers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createCustomIcon(marker.severity),
      }).addTo(mapInstanceRef.current!);

      leafletMarker.bindPopup(`
        <div style="min-width: 200px; padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="
              background: ${getSeverityColor(marker.severity)};
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            ">${marker.severity}</span>
            <span style="color: #666; font-size: 11px;">${marker.type}</span>
          </div>
          <p style="margin: 0; color: #333; font-size: 13px;">${marker.description}</p>
          <p style="margin: 8px 0 0; color: #999; font-size: 11px;">
            ${marker.timestamp.toLocaleString()}
          </p>
        </div>
      `);
    });
  }, [damageMarkers]);

  const locateUser = async () => {
    if (!mapInstanceRef.current) return;

    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      mapInstanceRef.current.setView([latitude, longitude], 17);

      // Add user location marker
      L.circleMarker([latitude, longitude], {
        radius: 10,
        fillColor: "#3b82f6",
        color: "#fff",
        weight: 3,
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current).bindPopup("You are here");

    } catch (error) {
      console.error("Geolocation error:", error);
    } finally {
      setIsLocating(false);
    }
  };

  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();
  const resetView = () => mapInstanceRef.current?.setView([IIT_BOMBAY.lat, IIT_BOMBAY.lng], 15);

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-0 relative">
        {/* Map Header */}
        <div className="absolute top-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-b from-background/90 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Damage Map</h4>
                <p className="text-xs text-muted-foreground">IIT Bombay Campus</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg p-1">
              <span className="px-2 py-1 text-xs font-medium text-foreground">
                {damageMarkers.length} Reports
              </span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapRef} className="h-[400px] w-full" />

        {/* Map Controls */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={locateUser}
            disabled={isLocating}
            className="h-10 w-10 rounded-lg shadow-lg bg-card/90 backdrop-blur-sm"
          >
            <Locate className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={zoomIn}
            className="h-10 w-10 rounded-lg shadow-lg bg-card/90 backdrop-blur-sm"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={zoomOut}
            className="h-10 w-10 rounded-lg shadow-lg bg-card/90 backdrop-blur-sm"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={resetView}
            className="h-10 w-10 rounded-lg shadow-lg bg-card/90 backdrop-blur-sm"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm rounded-lg p-3">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Severity
          </p>
          <div className="flex flex-col gap-1">
            {[
              { label: "Critical", color: "#ef4444" },
              { label: "High", color: "#f97316" },
              { label: "Medium", color: "#eab308" },
              { label: "Low", color: "#22c55e" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
