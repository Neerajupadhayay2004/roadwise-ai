import { useState, useCallback, useMemo, useEffect } from "react";
import { Scan, AlertTriangle, Info, ChevronRight, Camera, MapPin, BarChart3, Database, History, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { DamageResults } from "@/components/DamageResults";
import { DamageClassLegend } from "@/components/DamageClassLegend";
import { CameraCapture } from "@/components/CameraCapture";
import { RealTimeDetector } from "@/components/RealTimeDetector";
import { MapView } from "@/components/MapView";
import { AdvancedStats } from "@/components/AdvancedStats";
import { ReportsHistory } from "@/components/ReportsHistory";
import { ReportDetail } from "@/components/ReportDetail";
import { YoloDatasetInfo } from "@/components/YoloDatasetInfo";
import { useDamageReports, DamageReport, Detection, Summary } from "@/hooks/useDamageReports";
import { toast } from "sonner";

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
  const [showCamera, setShowCamera] = useState(false);
  const [showRealTimeDetector, setShowRealTimeDetector] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Use the damage reports hook
  const { 
    reports, 
    isLoading: isLoadingReports, 
    stats, 
    uploadImage, 
    createReport,
    updateReportStatus 
  } = useDamageReports();

  // Calculate damage markers from reports
  const damageMarkers = useMemo(() => {
    return reports
      .filter(r => r.latitude && r.longitude)
      .flatMap(report => 
        report.detections.map((d, i) => ({
          id: `${report.id}-${i}`,
          lat: report.latitude!,
          lng: report.longitude!,
          type: d.class_name,
          severity: d.severity,
          timestamp: new Date(report.created_at),
          description: d.description,
        }))
      );
  }, [reports]);

  // Calculate stats from all detections
  const allDetections = useMemo(() => {
    return reports.flatMap(r => r.detections);
  }, [reports]);

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

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to IIT Bombay
          setUserLocation({ lat: 19.1334, lng: 72.9133 });
        }
      );
    }
  }, []);

  const handleImageSelect = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setResults(null);
  }, []);

  const handleCameraCapture = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setResults(null);
    setShowCamera(false);
  }, []);

  // Handler for saving reports from real-time detection
  const handleRealTimeSave = useCallback(async (
    imageData: string, 
    detections: Detection[], 
    summary: any
  ) => {
    try {
      toast.loading("Saving report...", { id: "save-realtime" });
      
      const imageUrl = await uploadImage(imageData);
      
      const avgConfidence = detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
        : 0;

      await createReport({
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        location_name: "Real-time Detection",
        image_url: imageUrl,
        overall_condition: summary.overall_condition,
        total_damages: detections.length,
        priority: summary.priority_level,
        confidence_score: avgConfidence,
        detections,
        summary,
        capture_method: "realtime",
      });
      
      toast.dismiss("save-realtime");
      toast.success("Report saved to database!");
    } catch (error) {
      toast.dismiss("save-realtime");
      toast.error("Failed to save report");
      console.error("Save error:", error);
    }
  }, [uploadImage, createReport, userLocation]);

  const analyzeImage = useCallback(async (captureMethod: string = "upload") => {
    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // First upload the image to storage
      toast.loading("Uploading image...", { id: "upload" });
      const imageUrl = await uploadImage(selectedImage);
      toast.dismiss("upload");

      // Analyze the image
      toast.loading("Analyzing road damage...", { id: "analyze" });
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
      toast.dismiss("analyze");

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
        const summary = data.summary;
        
        setResults({
          detections,
          summary,
        });

        // Calculate average confidence
        const avgConfidence = detections.length > 0
          ? detections.reduce((sum: number, d: Detection) => sum + d.confidence, 0) / detections.length
          : 0;

        // Save the report to database
        await createReport({
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          location_name: "IIT Bombay Campus",
          image_url: imageUrl,
          overall_condition: summary.overall_condition,
          total_damages: detections.length,
          priority: summary.priority_level,
          confidence_score: avgConfidence,
          detections,
          summary,
          capture_method: captureMethod,
        });
        
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
  }, [selectedImage, uploadImage, createReport, userLocation]);

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

      {/* Real-Time Detector Modal */}
      {showRealTimeDetector && (
        <RealTimeDetector
          onClose={() => setShowRealTimeDetector(false)}
          onSaveReport={handleRealTimeSave}
          userLocation={userLocation}
        />
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
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
                AI-Powered Road Damage Detection • IIT Bombay
              </div>
              
              <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
                Detect Road Damage with
                <br />
                <span className="text-gradient">YOLOv8 + Vision AI</span>
              </h2>
              
              <p className="text-muted-foreground max-w-xl mx-auto">
                Upload or capture road images. Our AI detects and classifies cracks, potholes, and surface damages using the RDD2022 dataset.
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
                          onClick={() => analyzeImage("upload")}
                          className="gap-2"
                        >
                          Analyze & Save
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
                            Upload a clear image of a road surface. Our AI will detect 5 types of damage with severity levels and save the report to the database.
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

              {/* Right - Stats & Legend */}
              <div className="space-y-6">
                <DamageClassLegend />

                <Card variant="glass">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-medium text-foreground">Database Stats</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Reports</span>
                        <span className="font-mono text-foreground">{stats.totalReports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Damages Found</span>
                        <span className="font-mono text-foreground">{stats.totalDamages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending Review</span>
                        <span className="font-mono text-foreground">{stats.byStatus.pending || 0}</span>
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
            {/* Real-Time Detection Mode */}
            <div className="text-center py-6 md:py-8">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <Zap className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Real-Time Damage Detection</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-lg mx-auto">
                Advanced AI-powered detection with live bounding boxes, confidence scores, and automatic analysis
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={() => setShowRealTimeDetector(true)} 
                  className="gap-2 w-full sm:w-auto"
                >
                  <Zap className="w-5 h-5" />
                  Start Real-Time Detection
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setShowCamera(true)} 
                  className="gap-2 w-full sm:w-auto"
                >
                  <Camera className="w-5 h-5" />
                  Single Capture
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card variant="glass" className="p-3 md:p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <Scan className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs md:text-sm font-medium">Bounding Boxes</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Real-time overlays</p>
              </Card>
              <Card variant="glass" className="p-3 md:p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-xs md:text-sm font-medium">Confidence Scores</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Per detection</p>
              </Card>
              <Card variant="glass" className="p-3 md:p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xs md:text-sm font-medium">Severity Levels</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Color-coded alerts</p>
              </Card>
              <Card variant="glass" className="p-3 md:p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <Database className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xs md:text-sm font-medium">Auto Save</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Cloud storage</p>
              </Card>
            </div>

            {/* Last Captured Image */}
            {selectedImage && (
              <Card variant="elevated">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-foreground">Last Captured Image</h3>
                    <Button variant="hero" onClick={() => analyzeImage("camera")} disabled={isAnalyzing} className="w-full sm:w-auto">
                      {isAnalyzing ? "Analyzing..." : "Analyze & Save"}
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
                <h2 className="text-2xl font-bold text-foreground">Damage Heatmap</h2>
                <p className="text-muted-foreground">View all reported road damages on the interactive map</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">{damageMarkers.length} Markers</span>
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

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Report History</h2>
                <p className="text-muted-foreground">View and manage all saved damage reports</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">{reports.length} Reports</span>
              </div>
            </div>

            {isLoadingReports ? (
              <Card variant="glass">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading reports...</p>
                </CardContent>
              </Card>
            ) : (
              <ReportsHistory 
                reports={reports} 
                onViewReport={setSelectedReport}
                onUpdateStatus={updateReportStatus}
              />
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
              <p className="text-muted-foreground">Comprehensive analysis statistics from all reports</p>
            </div>
            
            <AdvancedStats
              analysisCount={stats.totalReports}
              totalDetections={stats.totalDamages}
              damagesByType={damagesByType}
              averageConfidence={averageConfidence}
            />

            {stats.totalReports === 0 && (
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

        {/* Dataset Tab */}
        {activeTab === "dataset" && (
          <YoloDatasetInfo />
        )}

        {/* Footer */}
        <footer className="text-center py-8 mt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Built for IIT Bombay Hackathon • RDD2022 Dataset • Powered by Gemini 2.5 Vision AI
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
