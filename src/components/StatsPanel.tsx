import { Activity, Target, Clock, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsPanelProps {
  analysisCount: number;
  totalDetections: number;
}

export const StatsPanel = ({ analysisCount, totalDetections }: StatsPanelProps) => {
  const stats = [
    {
      icon: Activity,
      label: "Analyses",
      value: analysisCount.toString(),
      color: "text-primary",
    },
    {
      icon: Target,
      label: "Detections",
      value: totalDetections.toString(),
      color: "text-destructive",
    },
    {
      icon: Cpu,
      label: "Model",
      value: "Gemini",
      color: "text-success",
    },
    {
      icon: Clock,
      label: "Status",
      value: "Ready",
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          variant="glass"
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
