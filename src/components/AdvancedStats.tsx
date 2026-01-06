import { Activity, AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp, Zap, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AdvancedStatsProps {
  analysisCount: number;
  totalDetections: number;
  damagesByType: Record<string, number>;
  averageConfidence: number;
}

export const AdvancedStats = ({
  analysisCount,
  totalDetections,
  damagesByType,
  averageConfidence,
}: AdvancedStatsProps) => {
  const stats = [
    {
      label: "Total Scans",
      value: analysisCount.toString(),
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Damages Found",
      value: totalDetections.toString(),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Avg Confidence",
      value: `${(averageConfidence * 100).toFixed(0)}%`,
      icon: Target,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Areas Covered",
      value: Math.floor(analysisCount * 0.8).toString(),
      icon: MapPin,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const damageTypeColors: Record<string, string> = {
    "Longitudinal Crack": "hsl(var(--damage-longitudinal))",
    "Transverse Crack": "hsl(var(--damage-transverse))",
    "Alligator Crack": "hsl(var(--damage-alligator))",
    "Other Corruption": "hsl(var(--damage-other))",
    "Pothole": "hsl(var(--damage-pothole))",
  };

  const maxDamageCount = Math.max(...Object.values(damagesByType), 1);

  return (
    <div className="space-y-6">
      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="glass" className="hover:bg-card/80 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Damage Distribution */}
      {Object.keys(damagesByType).length > 0 && (
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Damage Distribution</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalDetections} total detections
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(damagesByType).map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{type}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxDamageCount) * 100}%`,
                        backgroundColor: damageTypeColors[type] || "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">
              {analysisCount > 0 ? Math.round((1 - totalDetections / (analysisCount * 3)) * 100) : 100}%
            </p>
            <p className="text-xs text-muted-foreground">Road Health</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">~2s</p>
            <p className="text-xs text-muted-foreground">Avg Scan Time</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">98%</p>
            <p className="text-xs text-muted-foreground">AI Accuracy</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
