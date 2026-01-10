import { AlertTriangle, CheckCircle, AlertCircle, Info, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Detection {
  id?: string;
  class_id: number;
  class_name: string;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  confidence: number;
  severity: string;
  description: string;
  estimated_length_cm?: number;
  estimated_width_cm?: number;
  estimated_depth_cm?: number;
  estimated_area_sqm?: number;
  cause?: string;
  progression?: string;
  repair_method?: string;
  cost_category?: string;
  safety_hazard?: boolean;
}

interface Summary {
  total_damages: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  overall_condition: string;
  pci_estimate?: number;
  priority_level: string;
  safety_score?: number;
  recommendation: string;
  estimated_repair_cost_usd?: number;
  deterioration_rate?: string;
  next_inspection_days?: number;
}

interface DamageResultsProps {
  detections: Detection[];
  summary: Summary;
}

const damageColors: Record<number, string> = {
  0: "damage-longitudinal",
  1: "damage-transverse",
  2: "damage-alligator",
  3: "damage-pothole",
  4: "damage-crosswalk",
  5: "damage-whiteline",
  6: "damage-manhole",
  7: "damage-raveling",
  8: "damage-rutting",
  9: "damage-bleeding",
  10: "damage-edge",
  11: "damage-block",
  12: "damage-patch",
};

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle; label: string }> = {
  low: { color: "text-success", icon: CheckCircle, label: "Low" },
  medium: { color: "text-warning", icon: Info, label: "Medium" },
  high: { color: "text-destructive", icon: AlertCircle, label: "High" },
  critical: { color: "text-destructive", icon: AlertTriangle, label: "Critical" },
};

const conditionConfig: Record<string, { color: string; bg: string; label: string }> = {
  good: { color: "text-success", bg: "bg-success/20", label: "Good Condition" },
  fair: { color: "text-warning", bg: "bg-warning/20", label: "Fair Condition" },
  poor: { color: "text-destructive", bg: "bg-destructive/20", label: "Poor Condition" },
  critical: { color: "text-destructive", bg: "bg-destructive/20", label: "Critical" },
  unknown: { color: "text-muted-foreground", bg: "bg-muted", label: "Unknown" },
};

export const DamageResults = ({ detections, summary }: DamageResultsProps) => {
  const condition = conditionConfig[summary.overall_condition] || conditionConfig.unknown;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Card */}
      <Card variant="elevated" className="overflow-hidden">
        <div className={cn("h-1", condition.bg)} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Analysis Summary
            </CardTitle>
            <Badge className={cn("text-sm font-semibold px-3 py-1", condition.bg, condition.color)}>
              {condition.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-3xl font-bold text-foreground">{summary.total_damages}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Damages Found</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-3xl font-bold text-primary">{summary.pci_estimate ?? '--'}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">PCI Score</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-lg font-bold text-foreground capitalize">{summary.priority_level}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Priority</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-lg font-bold text-foreground">
                {summary.safety_score !== undefined ? `${summary.safety_score}/10` : 
                  detections.length > 0 
                    ? `${Math.round(detections.reduce((acc, d) => acc + d.confidence, 0) / detections.length * 100)}%`
                    : "N/A"
                }
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Safety Score</p>
            </div>
          </div>

          {/* Severity Breakdown */}
          {(summary.critical_count !== undefined || summary.high_count !== undefined) && (
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded bg-destructive/20 border border-destructive/30">
                <p className="text-xl font-bold text-destructive">{summary.critical_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Critical</p>
              </div>
              <div className="text-center p-2 rounded bg-orange-500/20 border border-orange-500/30">
                <p className="text-xl font-bold text-orange-500">{summary.high_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">High</p>
              </div>
              <div className="text-center p-2 rounded bg-warning/20 border border-warning/30">
                <p className="text-xl font-bold text-warning">{summary.medium_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Medium</p>
              </div>
              <div className="text-center p-2 rounded bg-success/20 border border-success/30">
                <p className="text-xl font-bold text-success">{summary.low_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Low</p>
              </div>
            </div>
          )}

          {/* Cost & Inspection */}
          {(summary.estimated_repair_cost_usd || summary.next_inspection_days) && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              {summary.estimated_repair_cost_usd && (
                <div>
                  <p className="text-xs text-muted-foreground">Est. Repair Cost</p>
                  <p className="text-lg font-bold text-foreground">${summary.estimated_repair_cost_usd}</p>
                </div>
              )}
              {summary.deterioration_rate && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Deterioration</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{summary.deterioration_rate}</p>
                </div>
              )}
              {summary.next_inspection_days && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Next Inspection</p>
                  <p className="text-lg font-bold text-foreground">{summary.next_inspection_days} days</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Recommendation
            </p>
            <p className="text-sm text-muted-foreground mt-1">{summary.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detections List */}
      {detections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Detected Damages ({detections.length})
          </h3>
          
          <div className="grid gap-3">
            {detections.map((detection, index) => {
              const severity = severityConfig[detection.severity] || severityConfig.medium;
              const SeverityIcon = severity.icon;
              
              return (
                <Card 
                  key={index} 
                  variant="damage"
                  className={cn(
                    "animate-fade-in-up",
                    damageColors[detection.class_id]
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold">
                            {detection.class_name}
                          </span>
                          <Badge variant="outline" className={cn("text-xs", severity.color)}>
                            <SeverityIcon className="w-3 h-3 mr-1" />
                            {severity.label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {detection.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            ({(detection.x_center * 100).toFixed(0)}%, {(detection.y_center * 100).toFixed(0)}%)
                          </span>
                          {detection.estimated_length_cm && (
                            <span>~{detection.estimated_length_cm}×{detection.estimated_width_cm}cm</span>
                          )}
                          {detection.estimated_depth_cm && (
                            <span>Depth: {detection.estimated_depth_cm}cm</span>
                          )}
                          {detection.cause && (
                            <Badge variant="outline" className="text-[10px] h-5 capitalize">
                              {detection.cause.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {detection.safety_hazard && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              Hazard
                            </Badge>
                          )}
                        </div>
                        {detection.repair_method && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Repair: <span className="capitalize">{detection.repair_method.replace(/_/g, ' ')}</span>
                            {detection.cost_category && (
                              <span className="ml-2">• Cost: <span className="capitalize">{detection.cost_category}</span></span>
                            )}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-foreground">
                          {(detection.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">confidence</div>
                        <Progress 
                          value={detection.confidence * 100} 
                          className="w-20 h-1.5 mt-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No damage message */}
      {detections.length === 0 && (
        <Card variant="elevated" className="border-success/30">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">No Damage Detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              The road surface appears to be in good condition.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
