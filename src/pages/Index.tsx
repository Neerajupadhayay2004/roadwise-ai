import { useState, useCallback, useMemo } from "react";
import { Scan, AlertTriangle, Info, ChevronRight, Camera, MapPin, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { DamageResults } from "@/components/DamageResults";
import { DamageClassLegend } from "@/components/DamageClassLegend";
import { CameraCapture } from "@/components/CameraCapture";
import { MapView } from "@/components/MapView";
import { AdvancedStats } from "@/components/AdvancedStats";
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

interface DamageMarker {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: string;
  timestamp: Date;
  description: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("scanner");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [allDetections, setAllDetections] = useState<Detection[]>([]);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);

  // Calculate stats
  const damagesByType = useMemo(() => {
    const counts: Record<string, number> = {};
    allDetections.forEach((d) => {
      counts[d.class_name] = (counts[d.class_name] || 0) + 1;
    });
    return counts;
  }, [allDetections]);

  const averageConfidence = useMemo(() => {
    if (allDetections.length === 0) return 0;
    return allDetections.reduce((sum, d) => sum + d.confidence, 0) / allDetections.length;
  }, [allDetections]);

  const handleImageSelect = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setResults(null);
  }, []);

  const handleCameraCapture = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setResults(null);
    setShowCamera(false);
    
    // Update the image uploader
    if (typeof window !== "undefined" && (window as any).__setImageFromCamera) {
      (window as any).__setImageFromCamera(imageData);
    }
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
        const detections = data.detections || [];
        setResults({
          detections,
          summary: data.summary,
        });
        setAnalysisCount(prev => prev + 1);
        setTotalDetections(prev => prev + detections.length);
        setAllDetections(prev => [...prev, ...detections]);

        // Add markers to map (simulate locations around IIT Bombay)
        if (detections.length > 0) {
          const newMarkers: DamageMarker[] = detections.map((d: Detection, i: number) => ({
            id: `${Date.now()}-${i}`,
            lat: 19.1334 + (Math.random() - 0.5) * 0.01,
            lng: 72.9133 + (Math.random() - 0.5) * 0.01,
            type: d.class_name,
            severity: d.severity,
            timestamp: new Date(),
            description: d.description,
          }));
          setDamageMarkers(prev => [...prev, ...newMarkers]);
        }
        
        if (detections.length > 0) {
          toast.warning(`Detected ${detections.length} road damage${detections.length > 1 ? 's' : ''}`);
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
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      <main className="container mx-auto px-4 py-6">
        {/* Scanner Tab */}
        {activeTab === "scanner" && (
          <div className="space-y-6">
            {/* Hero */}
            <section className="text-center space-y-4 py-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
                <AlertTriangle className="w-4 h-4" />
                AI-Powered Road Damage Detection
              </div>
              
              <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
                Detect Road Damage with
                <br />
                <span className="text-gradient">Computer Vision AI</span>
              </h2>
              
              <p className="text-muted-foreground max-w-xl mx-auto">
                Upload or capture road images. Our AI will detect and classify cracks, potholes, and surface damages.
              </p>
            </section>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left - Upload */}
              <div className="lg:col-span-2 space-y-6">
                <Card variant="elevated">
                  <CardContent className="p-6 space-y-4">
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
                      onCameraClick={() => setShowCamera(true)}
                    />

                    {!selectedImage && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border/50">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">How it works</p>
                          <p className="text-sm text-muted-foreground">
                            Upload a clear image of a road surface. Our AI will detect 5 types of damage with severity levels.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {results && (
                  <DamageResults 
                    detections={results.detections} 
                    summary={results.summary} 
                  />
                )}
              </div>

              {/* Right - Legend */}
              <div className="space-y-6">
                <DamageClassLegend />

                <Card variant="glass">
                  <CardContent className="p-6 space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Quick Stats</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scans Today</span>
                        <span className="font-mono text-foreground">{analysisCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Damages Found</span>
                        <span className="font-mono text-foreground">{totalDetections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono text-foreground">Gemini 2.5</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Camera Tab */}
        {activeTab === "camera" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Camera Capture</h2>
              <p className="text-muted-foreground mb-6">
                Use your device camera to capture road images in real-time
              </p>
              <Button variant="hero" size="lg" onClick={() => setShowCamera(true)} className="gap-2">
                <Camera className="w-5 h-5" />
                Open Camera
              </Button>
            </div>

            {selectedImage && (
              <Card variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Last Captured Image</h3>
                    <Button variant="hero" onClick={analyzeImage} disabled={isAnalyzing}>
                      {isAnalyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                  <img src={selectedImage} alt="Captured" className="w-full rounded-xl" />
                </CardContent>
              </Card>
            )}

            {results && (
              <DamageResults detections={results.detections} summary={results.summary} />
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Damage Map</h2>
                <p className="text-muted-foreground">View all reported road damages on map</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">{damageMarkers.length} Reports</span>
              </div>
            </div>
            
            <MapView damageMarkers={damageMarkers} />

            {damageMarkers.length === 0 && (
              <Card variant="glass">
                <CardContent className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No Damage Reports Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Analyze some road images to see damage locations on the map
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("scanner")}>
                    Go to Scanner
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
              <p className="text-muted-foreground">Comprehensive analysis statistics</p>
            </div>
            
            <AdvancedStats
              analysisCount={analysisCount}
              totalDetections={totalDetections}
              damagesByType={damagesByType}
              averageConfidence={averageConfidence}
            />

            {analysisCount === 0 && (
              <Card variant="glass">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No Data Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Start analyzing road images to see statistics
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("scanner")}>
                    Go to Scanner
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 mt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Built for IIT Bombay • RDD2022 Dataset • Powered by Gemini AI
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
