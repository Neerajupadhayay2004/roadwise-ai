import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation, MapPin, Route, AlertTriangle, Shield, ChevronRight, X, Locate, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DamageMarker {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: string;
}

interface RoutePlannerProps {
  damageMarkers: DamageMarker[];
  onClose: () => void;
}

const IIT_BOMBAY = { lat: 19.1334, lng: 72.9133 };

const getSeverityWeight = (severity: string): number => {
  switch (severity.toLowerCase()) {
    case "critical": return 100;
    case "high": return 50;
    case "medium": return 20;
    case "low": return 5;
    default: return 10;
  }
};

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#6b7280";
  }
};

export const RoutePlanner = ({ damageMarkers, onClose }: RoutePlannerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingStart, setIsSelectingStart] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    damagesAvoided: number;
    safetyScore: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [IIT_BOMBAY.lat, IIT_BOMBAY.lng],
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add damage zones as circles
    damageMarkers.forEach((marker) => {
      const weight = getSeverityWeight(marker.severity);
      const radius = 15 + weight * 0.5;
      
      L.circle([marker.lat, marker.lng], {
        radius,
        fillColor: getSeverityColor(marker.severity),
        fillOpacity: 0.3,
        color: getSeverityColor(marker.severity),
        weight: 2,
      }).addTo(map).bindPopup(`
        <strong>${marker.type}</strong><br/>
        Severity: ${marker.severity}<br/>
        <span style="color: #ef4444;">⚠️ Damage Zone</span>
      `);
    });

    // Route layer
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Map click handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (isSelectingStart) {
        setStartPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        setEndPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [damageMarkers]);

  // Update click handler when selection mode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    mapInstanceRef.current.off("click");
    mapInstanceRef.current.on("click", (e: L.LeafletMouseEvent) => {
      if (isSelectingStart) {
        setStartPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        setEndPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
  }, [isSelectingStart]);

  // Draw markers for start/end points
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    
    routeLayerRef.current.clearLayers();

    if (startPoint) {
      L.marker([startPoint.lat, startPoint.lng], {
        icon: L.divIcon({
          html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><span style="color: white; font-weight: bold; font-size: 12px;">A</span></div>`,
          className: "start-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(routeLayerRef.current);
    }

    if (endPoint) {
      L.marker([endPoint.lat, endPoint.lng], {
        icon: L.divIcon({
          html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><span style="color: white; font-weight: bold; font-size: 12px;">B</span></div>`,
          className: "end-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(routeLayerRef.current);
    }
  }, [startPoint, endPoint]);

  const calculateSafeRoute = useCallback(() => {
    if (!startPoint || !endPoint || !mapInstanceRef.current || !routeLayerRef.current) return;
    
    setIsCalculating(true);

    // Simulate route calculation with damage avoidance
    setTimeout(() => {
      // Create waypoints that avoid damage zones
      const waypoints: [number, number][] = [[startPoint.lat, startPoint.lng]];
      
      // Simple algorithm: check if direct path crosses damage zones and add detour points
      const directLat = (endPoint.lat - startPoint.lat);
      const directLng = (endPoint.lng - startPoint.lng);
      const steps = 10;
      
      let damagesOnPath = 0;
      
      for (let i = 1; i < steps; i++) {
        const lat = startPoint.lat + (directLat * i / steps);
        const lng = startPoint.lng + (directLng * i / steps);
        
        // Check if this point is near any damage
        let nearDamage = false;
        let offsetLat = 0;
        let offsetLng = 0;
        
        for (const marker of damageMarkers) {
          const distance = Math.sqrt(
            Math.pow(lat - marker.lat, 2) + Math.pow(lng - marker.lng, 2)
          );
          
          if (distance < 0.0008) { // Within ~80m
            nearDamage = true;
            damagesOnPath++;
            // Calculate offset to avoid damage
            const avoidDir = Math.atan2(lat - marker.lat, lng - marker.lng);
            offsetLat = Math.sin(avoidDir) * 0.0012;
            offsetLng = Math.cos(avoidDir) * 0.0012;
            break;
          }
        }
        
        waypoints.push([lat + offsetLat, lng + offsetLng]);
      }
      
      waypoints.push([endPoint.lat, endPoint.lng]);

      // Draw the safe route
      const polyline = L.polyline(waypoints, {
        color: "#22c55e",
        weight: 5,
        opacity: 0.8,
        dashArray: undefined,
      }).addTo(routeLayerRef.current!);

      // Draw original direct route (dashed red)
      L.polyline([[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]], {
        color: "#ef4444",
        weight: 3,
        opacity: 0.5,
        dashArray: "10, 10",
      }).addTo(routeLayerRef.current!);

      // Calculate route info
      let totalDistance = 0;
      for (let i = 1; i < waypoints.length; i++) {
        totalDistance += Math.sqrt(
          Math.pow(waypoints[i][0] - waypoints[i-1][0], 2) +
          Math.pow(waypoints[i][1] - waypoints[i-1][1], 2)
        );
      }
      
      // Convert to meters (rough approximation)
      const distanceMeters = totalDistance * 111000;
      
      const safetyScore = Math.max(0, 100 - (damagesOnPath * 15));

      setRouteInfo({
        distance: distanceMeters,
        damagesAvoided: damagesOnPath,
        safetyScore,
      });

      mapInstanceRef.current?.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      setIsCalculating(false);
    }, 1000);
  }, [startPoint, endPoint, damageMarkers]);

  const useCurrentLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (isSelectingStart) {
        setStartPoint(loc);
      } else {
        setEndPoint(loc);
      }
      
      mapInstanceRef.current?.setView([loc.lat, loc.lng], 17);
    } catch {
      // Fallback to IIT Bombay
      const loc = IIT_BOMBAY;
      if (isSelectingStart) {
        setStartPoint(loc);
      } else {
        setEndPoint(loc);
      }
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-0 rounded-none border-0 bg-background/98 backdrop-blur-xl">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/50 bg-card/80">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <Route className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">Safe Route Planner</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">Avoid damage zones</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Controls */}
        <div className="p-3 md:p-4 border-b border-border/50 bg-muted/30 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant={isSelectingStart ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelectingStart(true)}
              className="flex-1 gap-2"
            >
              <div className="w-4 h-4 rounded-full bg-green-500" />
              {startPoint ? `Start: ${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}` : "Select Start Point"}
            </Button>
            <Button
              variant={!isSelectingStart ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelectingStart(false)}
              className="flex-1 gap-2"
            >
              <div className="w-4 h-4 rounded-full bg-red-500" />
              {endPoint ? `End: ${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}` : "Select End Point"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={useCurrentLocation} className="gap-2">
              <Locate className="w-4 h-4" />
              Use My Location
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={calculateSafeRoute}
              disabled={!startPoint || !endPoint || isCalculating}
              className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              {isCalculating ? "Calculating..." : "Calculate Safe Route"}
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />
          
          {/* Route Info */}
          {routeInfo && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card/95 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-foreground">Route Analysis</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-foreground">{Math.round(routeInfo.distance)}m</p>
                  <p className="text-[10px] text-muted-foreground">Distance</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-amber-500">{routeInfo.damagesAvoided}</p>
                  <p className="text-[10px] text-muted-foreground">Avoided</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-green-500">{routeInfo.safetyScore}%</p>
                  <p className="text-[10px] text-muted-foreground">Safety</p>
                </div>
              </div>
              
              <div className="mt-3 flex gap-2">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Safe Route
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <div className="w-2 h-0.5 bg-red-500" style={{ borderStyle: "dashed" }} />
                  Direct Path
                </Badge>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 text-xs">
            <p className="font-medium mb-2 text-foreground">Damage Zones</p>
            <div className="space-y-1">
              {["Critical", "High", "Medium", "Low"].map((level) => (
                <div key={level} className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-3 h-3 rounded-full opacity-50" style={{ backgroundColor: getSeverityColor(level) }} />
                  {level}
                </div>
              ))}
            </div>
          </div>

          {/* Click instruction */}
          {(!startPoint || !endPoint) && (
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium animate-pulse">
              Click map to set {isSelectingStart ? "start" : "end"} point
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
