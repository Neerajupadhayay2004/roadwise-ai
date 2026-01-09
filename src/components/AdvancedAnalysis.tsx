import { useState, useMemo } from "react";
import { Brain, TrendingUp, AlertTriangle, Gauge, Target, Clock, Zap, Activity, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  severity: string;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

interface AdvancedAnalysisProps {
  detections: Detection[];
  analysisTime: number;
  frameCount: number;
}

const DAMAGE_INFO: Record<string, { color: string; risk: number; description: string }> = {
  "Longitudinal Crack": { color: "#3b82f6", risk: 60, description: "Parallel to traffic flow, often indicates structural fatigue" },
  "Transverse Crack": { color: "#8b5cf6", risk: 70, description: "Perpendicular to traffic, caused by thermal stress" },
  "Alligator Crack": { color: "#f59e0b", risk: 85, description: "Network of cracks indicating severe pavement failure" },
  "Pothole": { color: "#ef4444", risk: 95, description: "Critical hazard requiring immediate repair" },
  "Other Damage": { color: "#6b7280", risk: 50, description: "Various surface defects and anomalies" },
};

export const AdvancedAnalysis = ({ detections, analysisTime, frameCount }: AdvancedAnalysisProps) => {
  // Calculate advanced metrics
  const metrics = useMemo(() => {
    if (detections.length === 0) {
      return {
        overallRisk: 0,
        avgConfidence: 0,
        criticalCount: 0,
        totalArea: 0,
        dominantType: null,
        distribution: {},
        densityScore: 0,
        urgencyScore: 0,
        recommendations: [],
      };
    }

    // Type distribution
    const distribution: Record<string, number> = {};
    detections.forEach((d) => {
      distribution[d.class_name] = (distribution[d.class_name] || 0) + 1;
    });

    // Find dominant type
    const dominantType = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Calculate metrics
    const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    const criticalCount = detections.filter(d => d.severity === "critical" || d.severity === "high").length;
    
    // Calculate total damage area
    const totalArea = detections.reduce((sum, d) => sum + (d.width * d.height), 0);
    
    // Risk score based on severity and type
    const riskScores = detections.map(d => {
      const typeInfo = DAMAGE_INFO[d.class_name] || DAMAGE_INFO["Other Damage"];
      const severityMultiplier = 
        d.severity === "critical" ? 1.5 :
        d.severity === "high" ? 1.2 :
        d.severity === "medium" ? 1.0 : 0.7;
      return typeInfo.risk * severityMultiplier * d.confidence;
    });
    const overallRisk = Math.min(100, riskScores.reduce((sum, r) => sum + r, 0) / detections.length);

    // Density score (damages per frame)
    const densityScore = Math.min(100, (detections.length / Math.max(1, frameCount)) * 50);

    // Urgency score
    const urgencyScore = Math.min(100, (criticalCount / detections.length) * 100 + overallRisk * 0.3);

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalCount > 0) {
      recommendations.push("Immediate repair needed for critical damages");
    }
    if (distribution["Pothole"]) {
      recommendations.push("Schedule pothole filling as priority");
    }
    if (distribution["Alligator Crack"]) {
      recommendations.push("Full pavement assessment recommended");
    }
    if (densityScore > 50) {
      recommendations.push("High damage density - consider road closure");
    }
    if (recommendations.length === 0) {
      recommendations.push("Regular maintenance schedule recommended");
    }

    return {
      overallRisk,
      avgConfidence,
      criticalCount,
      totalArea,
      dominantType,
      distribution,
      densityScore,
      urgencyScore,
      recommendations,
    };
  }, [detections, frameCount]);

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return "text-red-500";
    if (risk >= 60) return "text-orange-500";
    if (risk >= 40) return "text-amber-500";
    return "text-green-500";
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 80) return "Critical";
    if (risk >= 60) return "High";
    if (risk >= 40) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Advanced AI Analysis</h3>
          <p className="text-[10px] text-muted-foreground">Deep damage assessment</p>
        </div>
      </div>

      {/* Risk Score Circle */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-center gap-6">
          <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${metrics.overallRisk * 2.51} 251`}
                className={getRiskColor(metrics.overallRisk)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getRiskColor(metrics.overallRisk)}`}>
                {Math.round(metrics.overallRisk)}
              </span>
              <span className="text-[10px] text-muted-foreground">Risk Score</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${getRiskColor(metrics.overallRisk)} bg-transparent`}>
                {getRiskLabel(metrics.overallRisk)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {detections.length} damages detected
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.criticalCount} critical issues
            </p>
          </div>
        </div>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card variant="glass" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Confidence</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {(metrics.avgConfidence * 100).toFixed(1)}%
          </p>
          <Progress value={metrics.avgConfidence * 100} className="h-1 mt-1" />
        </Card>

        <Card variant="glass" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-foreground">Urgency</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {Math.round(metrics.urgencyScore)}%
          </p>
          <Progress value={metrics.urgencyScore} className="h-1 mt-1" />
        </Card>

        <Card variant="glass" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-medium text-foreground">Density</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {Math.round(metrics.densityScore)}%
          </p>
          <Progress value={metrics.densityScore} className="h-1 mt-1" />
        </Card>

        <Card variant="glass" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-medium text-foreground">Speed</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {analysisTime > 0 ? `${Math.round(analysisTime)}ms` : '--'}
          </p>
          <p className="text-[10px] text-muted-foreground">per frame</p>
        </Card>
      </div>

      {/* Type Distribution */}
      {Object.keys(metrics.distribution).length > 0 && (
        <Card variant="glass" className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Damage Types</span>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.distribution).map(([type, count]) => {
              const info = DAMAGE_INFO[type] || DAMAGE_INFO["Other Damage"];
              const percentage = (count / detections.length) * 100;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="text-foreground">{type}</span>
                    </div>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: info.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-foreground">AI Recommendations</span>
        </div>
        <div className="space-y-2">
          {metrics.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{rec}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
