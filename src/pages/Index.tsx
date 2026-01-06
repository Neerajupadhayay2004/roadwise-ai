import { useState, useCallback } from "react";
import { Scan, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { DamageResults } from "@/components/DamageResults";
import { DamageClassLegend } from "@/components/DamageClassLegend";
import { StatsPanel } from "@/components/StatsPanel";
import { toast } from "sonner";

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

interface AnalysisResult {
  detections: Detection[];
  summary: Summary;
}

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);

  const handleImageSelect = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setResults(null);
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-road`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image: selectedImage }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
          return;
        }
        if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
          return;
        }
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      
      if (data.success) {
        setResults({
          detections: data.detections || [],
          summary: data.summary,
        });
        setAnalysisCount(prev => prev + 1);
        setTotalDetections(prev => prev + (data.detections?.length || 0));
        
        if (data.detections?.length > 0) {
          toast.warning(`Detected ${data.detections.length} road damage${data.detections.length > 1 ? 's' : ''}`);
        } else {
          toast.success("No road damage detected");
        }
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage]);

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      {/* Grid pattern overlay */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      
      <Header />
      
      <main className="relative container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium animate-fade-in">
            <AlertTriangle className="w-4 h-4" />
            AI-Powered Road Damage Detection
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            Detect Road Damage with
            <br />
            <span className="text-gradient">Computer Vision AI</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            Upload a road image and our AI will automatically detect and classify 
            cracks, potholes, and other surface damages with high precision.
          </p>
        </section>

        {/* Stats Panel */}
        <StatsPanel analysisCount={analysisCount} totalDetections={totalDetections} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Upload and Analyze */}
          <div className="lg:col-span-2 space-y-6">
            <Card variant="elevated" className="overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Road Image Analysis</h3>
                  </div>
                  
                  {selectedImage && !isAnalyzing && (
                    <Button 
                      variant="hero" 
                      size="lg"
                      onClick={analyzeImage}
                      className="gap-2"
                    >
                      Analyze Damage
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <ImageUploader 
                  onImageSelect={handleImageSelect}
                  isLoading={isAnalyzing}
                />

                {/* Instructions */}
                {!selectedImage && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">How it works</p>
                      <p className="text-sm text-muted-foreground">
                        Upload a clear image of a road surface. Our AI will analyze it and detect 
                        5 types of damage: longitudinal cracks, transverse cracks, alligator cracks, 
                        other corruption, and potholes.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <DamageResults 
                detections={results.detections} 
                summary={results.summary} 
              />
            )}
          </div>

          {/* Right Column - Legend and Info */}
          <div className="space-y-6">
            <DamageClassLegend />

            {/* Technical Info */}
            <Card variant="glass">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-sm font-medium text-foreground">Technical Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-foreground">Gemini 2.5 Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dataset</span>
                    <span className="font-mono text-foreground">RDD2022</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classes</span>
                    <span className="font-mono text-foreground">5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output</span>
                    <span className="font-mono text-foreground">YOLO Format</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Use Cases */}
            <Card variant="glass">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-sm font-medium text-foreground">Use Cases</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Smart city infrastructure
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Road maintenance planning
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Safety assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Automated inspections
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Built for IIT Bombay Crackathon • RDD2022 Dataset • YOLOv8 Compatible
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
