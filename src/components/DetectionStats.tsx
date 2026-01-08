import { AlertTriangle, CheckCircle, Clock, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Detection {
  class_id: number;
  class_name: string;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  confidence: number;
  severity: string;
  description: string;
}

interface DetectionStatsProps {
  detections: Detection[];
  totalFramesAnalyzed: number;
  totalDamagesFound: number;
  lastAnalysisTime: number;
  damageColors: Record<number, string>;
  severityColors: Record<string, string>;
}

const DAMAGE_ICONS: Record<number, string> = {
  0: "━", // Longitudinal
  1: "┃", // Transverse
  2: "╬", // Alligator
  3: "◆", // Other
  4: "●", // Pothole
};

export const DetectionStats = ({
  detections,
  totalFramesAnalyzed,
  totalDamagesFound,
  lastAnalysisTime,
  damageColors,
  severityColors,
}: DetectionStatsProps) => {
  const avgConfidence = detections.length > 0
    ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
    : 0;

  const severityCounts = detections.reduce((acc, d) => {
    acc[d.severity] = (acc[d.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const classCounts = detections.reduce((acc, d) => {
    acc[d.class_id] = (acc[d.class_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="h-full flex flex-col">
      {/* Stats Header */}
      <div className="p-3 md:p-4 border-b border-border/50">
        <h4 className="font-semibold text-sm md:text-base mb-3">Detection Results</h4>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/30 rounded-lg p-2 md:p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] md:text-xs">Frames</span>
            </div>
            <p className="text-lg md:text-xl font-bold">{totalFramesAnalyzed}</p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-2 md:p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] md:text-xs">Damages</span>
            </div>
            <p className="text-lg md:text-xl font-bold">{totalDamagesFound}</p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-2 md:p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] md:text-xs">Latency</span>
            </div>
            <p className="text-lg md:text-xl font-bold">
              {lastAnalysisTime > 0 ? `${Math.round(lastAnalysisTime)}ms` : '--'}
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-2 md:p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] md:text-xs">Confidence</span>
            </div>
            <p className="text-lg md:text-xl font-bold">
              {avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Current Detections */}
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 space-y-3">
          {detections.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">No damage detected</p>
              <p className="text-[10px] md:text-xs text-muted-foreground/70 mt-1">
                Point camera at road surface
              </p>
            </div>
          ) : (
            <>
              {/* Severity Distribution */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">Severity</h5>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(severityCounts).map(([severity, count]) => (
                    <Badge
                      key={severity}
                      variant="secondary"
                      className="text-[10px] md:text-xs"
                      style={{ 
                        backgroundColor: `${severityColors[severity]}20`,
                        color: severityColors[severity],
                        borderColor: severityColors[severity]
                      }}
                    >
                      {severity}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Detection List */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">Detections</h5>
                {detections.map((detection, index) => (
                  <div
                    key={index}
                    className="bg-muted/20 rounded-lg p-2 md:p-3 border border-border/30"
                    style={{ borderLeftColor: damageColors[detection.class_id], borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-base md:text-lg"
                            style={{ color: damageColors[detection.class_id] }}
                          >
                            {DAMAGE_ICONS[detection.class_id]}
                          </span>
                          <span className="font-medium text-xs md:text-sm truncate">
                            {detection.class_name}
                          </span>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
                          {detection.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px]"
                        style={{ 
                          color: severityColors[detection.severity],
                          borderColor: severityColors[detection.severity]
                        }}
                      >
                        {detection.severity}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] md:text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-medium">{Math.round(detection.confidence * 100)}%</span>
                      </div>
                      <Progress 
                        value={detection.confidence * 100} 
                        className="h-1.5"
                      />
                    </div>
                    
                    <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                      <span>Position: ({(detection.x_center * 100).toFixed(1)}%, {(detection.y_center * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Model Info Footer */}
      <div className="p-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground">
          <span>Model: YOLOv8 + Gemini Vision</span>
          <span>RDD2022 Dataset</span>
        </div>
      </div>
    </div>
  );
};
