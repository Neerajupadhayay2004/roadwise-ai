import { AlertTriangle, CheckCircle, AlertCircle, Info, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

interface Summary {
  total_damages: number;
  overall_condition: string;
  priority_level: string;
  recommendation: string;
}

interface DamageResultsProps {
  detections: Detection[];
  summary: Summary;
}

const damageColors: Record<number, string> = {
  0: "damage-longitudinal",
  1: "damage-transverse",
  2: "damage-alligator",
  3: "damage-other",
  4: "damage-pothole",
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-3xl font-bold text-foreground">{summary.total_damages}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Damages Found</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-3xl font-bold text-primary">{detections.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Detections</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-lg font-bold text-foreground capitalize">{summary.priority_level}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Priority</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-lg font-bold text-foreground">
                {detections.length > 0 
                  ? `${Math.round(detections.reduce((acc, d) => acc + d.confidence, 0) / detections.length * 100)}%`
                  : "N/A"
                }
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Avg Confidence</p>
            </div>
          </div>

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
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Position: ({(detection.x_center * 100).toFixed(1)}%, {(detection.y_center * 100).toFixed(1)}%)
                          </span>
                          <span>
                            Size: {(detection.width * 100).toFixed(1)}% × {(detection.height * 100).toFixed(1)}%
                          </span>
                        </div>
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
