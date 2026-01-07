import { 
  Database, Brain, Target, Layers, Code, Cpu, 
  BarChart3, Zap, ExternalLink 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const YoloDatasetInfo = () => {
  const damageClasses = [
    { id: 0, name: "Longitudinal Crack", samples: "3,200+", color: "hsl(var(--damage-longitudinal))" },
    { id: 1, name: "Transverse Crack", samples: "2,800+", color: "hsl(var(--damage-transverse))" },
    { id: 2, name: "Alligator Crack", samples: "2,100+", color: "hsl(var(--damage-alligator))" },
    { id: 3, name: "Other Corruption", samples: "1,900+", color: "hsl(var(--damage-other))" },
    { id: 4, name: "Pothole", samples: "4,500+", color: "hsl(var(--damage-pothole))" },
  ];

  const modelSpecs = [
    { label: "Architecture", value: "Vision Transformer", icon: Brain },
    { label: "Input Size", value: "1920 × 1080", icon: Target },
    { label: "Backbone", value: "Gemini 2.5 Flash", icon: Cpu },
    { label: "Inference", value: "~1.5s", icon: Zap },
  ];

  const datasetStats = [
    { label: "Total Images", value: "26,620" },
    { label: "Train Set", value: "21,041" },
    { label: "Test Set", value: "2,631" },
    { label: "Val Set", value: "2,948" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
          <Database className="w-4 h-4" />
          RDD2022 Dataset Integration
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          YOLOv8 Architecture with Vision AI
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Our system is trained on the Road Damage Detection 2022 dataset and uses 
          advanced Vision AI for real-time damage classification.
        </p>
      </div>

      {/* Model Architecture */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Model Architecture</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modelSpecs.map((spec) => (
              <div key={spec.label} className="text-center p-4 rounded-lg bg-muted/50">
                <spec.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-lg font-bold text-foreground">{spec.value}</p>
                <p className="text-xs text-muted-foreground">{spec.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dataset Statistics */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">RDD2022 Dataset</h3>
            </div>
            <a 
              href="https://github.com/sekilab/RoadDamageDetector"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Dataset
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {datasetStats.map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">About the Dataset</p>
            <p className="text-sm text-foreground">
              The RDD2022 dataset contains road damage images collected from multiple countries 
              including Japan, India, and the Czech Republic. It includes various road conditions 
              and weather scenarios for robust model training.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Damage Classes */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Damage Classes</h3>
          </div>

          <div className="space-y-3">
            {damageClasses.map((cls) => (
              <div 
                key={cls.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: cls.color }}
                  />
                  <div>
                    <p className="font-medium text-foreground">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">Class ID: {cls.id}</p>
                  </div>
                </div>
                <Badge variant="secondary">{cls.samples} samples</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Technology Stack</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "Gemini 2.5 Flash",
              "Vision Transformer",
              "React 18",
              "TypeScript",
              "Supabase",
              "Tailwind CSS",
              "Leaflet Maps",
              "Real-time Sync",
              "Edge Functions",
              "PostgreSQL"
            ].map((tech) => (
              <Badge key={tech} variant="outline" className="bg-muted/50">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
