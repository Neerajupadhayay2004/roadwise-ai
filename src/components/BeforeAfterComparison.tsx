import { useState, useRef, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ArrowLeftRight, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DamageReport } from "@/hooks/useDamageReports";
import { format } from "date-fns";

interface BeforeAfterComparisonProps {
  reports: DamageReport[];
  onClose: () => void;
}

const conditionColors: Record<string, string> = {
  good: "text-green-500",
  fair: "text-yellow-500",
  poor: "text-orange-500",
  critical: "text-red-500",
};

export const BeforeAfterComparison = ({ reports, onClose }: BeforeAfterComparisonProps) => {
  const [beforeReport, setBeforeReport] = useState<DamageReport | null>(null);
  const [afterReport, setAfterReport] = useState<DamageReport | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort reports by date (oldest first)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const ReportSelector = ({ 
    label, 
    selected, 
    onSelect, 
    exclude 
  }: { 
    label: string; 
    selected: DamageReport | null; 
    onSelect: (r: DamageReport) => void;
    exclude: DamageReport | null;
  }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
      <ScrollArea className="h-32 md:h-40">
        <div className="space-y-1.5 pr-3">
          {sortedReports
            .filter(r => r.id !== exclude?.id)
            .map((report) => (
              <button
                key={report.id}
                onClick={() => onSelect(report)}
                className={`w-full p-2 rounded-lg text-left transition-all text-xs md:text-sm ${
                  selected?.id === report.id
                    ? "bg-primary/20 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={report.image_url} 
                    alt="" 
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {format(new Date(report.created_at), "MMM d, yyyy")}
                    </p>
                    <p className={`text-[10px] ${conditionColors[report.overall_condition]}`}>
                      {report.overall_condition} • {report.total_damages} damages
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className="fixed inset-0 z-50 m-0 rounded-none border-0 bg-background/98 backdrop-blur-xl">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/50">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">Before / After Comparison</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">Compare road conditions over time</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Report Selection */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 border-b border-border/50 bg-muted/20">
          <ReportSelector
            label="Before (Older)"
            selected={beforeReport}
            onSelect={setBeforeReport}
            exclude={afterReport}
          />
          <ReportSelector
            label="After (Newer)"
            selected={afterReport}
            onSelect={setAfterReport}
            exclude={beforeReport}
          />
        </div>

        {/* Comparison View */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {!beforeReport || !afterReport ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <ArrowLeftRight className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm md:text-base">Select two reports to compare</p>
                <p className="text-[10px] md:text-xs text-muted-foreground/70 mt-1">
                  Choose a "before" and "after" report from the lists above
                </p>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="relative w-full h-full cursor-col-resize select-none">
              {/* After Image (Full) */}
              <div className="absolute inset-0">
                <img
                  src={afterReport.image_url}
                  alt="After"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4">
                  <Badge className="bg-green-500/80 text-white text-[10px] md:text-xs">
                    AFTER
                  </Badge>
                </div>
              </div>

              {/* Before Image (Clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <div className="relative w-full h-full" style={{ width: `${100 / sliderPosition * 100}%` }}>
                  <img
                    src={beforeReport.image_url}
                    alt="Before"
                    className="w-full h-full object-contain"
                    style={{ width: `${sliderPosition}%` }}
                    draggable={false}
                  />
                </div>
                <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
                  <Badge className="bg-amber-500/80 text-white text-[10px] md:text-xs">
                    BEFORE
                  </Badge>
                </div>
              </div>

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize shadow-lg"
                style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-gray-600 -mr-1" />
                  <ChevronRight className="w-4 h-4 text-gray-600 -ml-1" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Comparison */}
        {beforeReport && afterReport && (
          <div className="p-3 md:p-4 border-t border-border/50 bg-card/80">
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              {/* Before Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                  <span>{format(new Date(beforeReport.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-3 h-3 md:w-4 md:h-4 ${conditionColors[beforeReport.overall_condition]}`} />
                  <span className="text-xs md:text-sm font-medium capitalize">{beforeReport.overall_condition}</span>
                  <Badge variant="outline" className="text-[10px]">{beforeReport.total_damages} damages</Badge>
                </div>
              </div>

              {/* After Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                  <span>{format(new Date(afterReport.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-3 h-3 md:w-4 md:h-4 ${conditionColors[afterReport.overall_condition]}`} />
                  <span className="text-xs md:text-sm font-medium capitalize">{afterReport.overall_condition}</span>
                  <Badge variant="outline" className="text-[10px]">{afterReport.total_damages} damages</Badge>
                </div>
              </div>
            </div>

            {/* Change Indicator */}
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm">
                {afterReport.total_damages < beforeReport.total_damages ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    ↓ {beforeReport.total_damages - afterReport.total_damages} fewer damages
                  </Badge>
                ) : afterReport.total_damages > beforeReport.total_damages ? (
                  <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                    ↑ {afterReport.total_damages - beforeReport.total_damages} more damages
                  </Badge>
                ) : (
                  <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">
                    No change in damage count
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
