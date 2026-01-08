import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Scan, Video, VideoOff, Zap, AlertTriangle, CheckCircle, Loader2, Settings2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DetectionCanvas } from "./DetectionCanvas";
import { DetectionStats } from "./DetectionStats";
import { useAudioAlerts } from "@/hooks/useAudioAlerts";

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

interface RealTimeDetectorProps {
  onClose: () => void;
  onSaveReport?: (imageData: string, detections: Detection[], summary: any) => void;
  userLocation?: { lat: number; lng: number } | null;
}

const DAMAGE_COLORS: Record<number, string> = {
  0: "#3b82f6", // Longitudinal - blue
  1: "#8b5cf6", // Transverse - purple
  2: "#f59e0b", // Alligator - amber
  3: "#6b7280", // Other - gray
  4: "#ef4444", // Pothole - red
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export const RealTimeDetector = ({ onClose, onSaveReport, userLocation }: RealTimeDetectorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [detectionInterval, setDetectionInterval] = useState([3000]); // ms
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.5]);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [totalFramesAnalyzed, setTotalFramesAnalyzed] = useState(0);
  const [totalDamagesFound, setTotalDamagesFound] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState([0.5]);

  // Audio alerts hook
  const { playMultipleDetections, cleanup: cleanupAudio } = useAudioAlerts({
    enabled: audioEnabled,
    volume: audioVolume[0],
  });

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Get actual video dimensions
        videoRef.current.onloadedmetadata = () => {
          setVideoDimensions({
            width: videoRef.current!.videoWidth,
            height: videoRef.current!.videoHeight
          });
        };
        
        setIsStreaming(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Unable to access camera. Please check permissions.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsStreaming(false);
    setCurrentDetections([]);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzing || !isStreaming) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setIsAnalyzing(true);
    const startTime = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke('analyze-road', {
        body: { image: imageData }
      });

      if (error) throw error;

      const analysisTime = performance.now() - startTime;
      setLastAnalysisTime(analysisTime);
      setTotalFramesAnalyzed(prev => prev + 1);

      if (data.detections && data.detections.length > 0) {
        // Filter by confidence threshold
        const filteredDetections = data.detections.filter(
          (d: Detection) => d.confidence >= confidenceThreshold[0]
        );
        
        setCurrentDetections(filteredDetections);
        setTotalDamagesFound(prev => prev + filteredDetections.length);

        if (filteredDetections.length > 0) {
          // Play audio alert based on severity
          const severities = filteredDetections.map((d: Detection) => 
            d.severity as "critical" | "high" | "medium" | "low"
          );
          playMultipleDetections(severities);

          toast.success(`Detected ${filteredDetections.length} damage(s)`, {
            duration: 2000,
          });
        }
      } else {
        setCurrentDetections([]);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed. Will retry...");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isStreaming, captureFrame, confidenceThreshold]);

  const saveCurrentFrame = useCallback(async () => {
    const imageData = captureFrame();
    if (!imageData || !onSaveReport) return;

    if (currentDetections.length === 0) {
      toast.warning("No detections to save. Capture a frame with detected damage first.");
      return;
    }

    const summary = {
      total_damages: currentDetections.length,
      overall_condition: currentDetections.some(d => d.severity === "critical") ? "critical" :
        currentDetections.some(d => d.severity === "high") ? "poor" :
        currentDetections.some(d => d.severity === "medium") ? "fair" : "good",
      priority_level: currentDetections.some(d => d.severity === "critical" || d.severity === "high") ? "high" : "medium",
      recommendation: `Found ${currentDetections.length} damage(s). Review and schedule repairs.`
    };

    onSaveReport(imageData, currentDetections, summary);
    toast.success("Report saved successfully!");
  }, [captureFrame, currentDetections, onSaveReport]);

  // Auto-detection interval
  useEffect(() => {
    if (isStreaming && autoDetect) {
      analysisIntervalRef.current = setInterval(() => {
        analyzeFrame();
      }, detectionInterval[0]);

      return () => {
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
        }
      };
    }
  }, [isStreaming, autoDetect, detectionInterval, analyzeFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      cleanupAudio();
    };
  }, [stopCamera, cleanupAudio]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isStreaming, stopCamera, startCamera]);

  return (
    <Card className="fixed inset-0 z-50 m-0 rounded-none border-0 bg-background/98 backdrop-blur-xl">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/50 bg-card/80">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">Real-Time Detection</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">YOLOv8 + Vision AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-full h-8 w-8 md:h-9 md:w-9"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 md:h-9 md:w-9">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 md:p-4 border-b border-border/50 bg-muted/30 space-y-3 md:space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-medium">Auto Detection</span>
                  <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Automatically analyze frames</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-medium">Detection Interval</span>
                  <span className="text-xs text-muted-foreground">{detectionInterval[0]}ms</span>
                </div>
                <Slider
                  value={detectionInterval}
                  onValueChange={setDetectionInterval}
                  min={1000}
                  max={10000}
                  step={500}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-medium">Confidence Threshold</span>
                  <span className="text-xs text-muted-foreground">{Math.round(confidenceThreshold[0] * 100)}%</span>
                </div>
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs md:text-sm font-medium">Audio Alerts</span>
                  </div>
                  <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Play sounds on detection</p>
              </div>

              {audioEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-medium">Alert Volume</span>
                    <span className="text-xs text-muted-foreground">{Math.round(audioVolume[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={audioVolume}
                    onValueChange={setAudioVolume}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Video Feed with Detection Overlay */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {!isStreaming && (
              <div className="text-center space-y-4 p-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                  <VideoOff className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm md:text-base">Camera is off</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Start camera to begin real-time detection</p>
                </div>
                <Button onClick={startCamera} variant="default" size="lg" className="gap-2">
                  <Video className="w-5 h-5" />
                  Start Detection
                </Button>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`max-h-full max-w-full object-contain ${isStreaming ? 'block' : 'hidden'}`}
            />

            {/* Detection Canvas Overlay */}
            {isStreaming && (
              <DetectionCanvas
                detections={currentDetections}
                videoWidth={videoDimensions.width}
                videoHeight={videoDimensions.height}
                damageColors={DAMAGE_COLORS}
                severityColors={SEVERITY_COLORS}
              />
            )}

            {/* Status Badges */}
            {isStreaming && (
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm text-[10px] md:text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  LIVE
                </Badge>
                {isAnalyzing && (
                  <Badge variant="secondary" className="bg-primary/80 text-primary-foreground backdrop-blur-sm text-[10px] md:text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing
                  </Badge>
                )}
                {currentDetections.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/80 text-white backdrop-blur-sm text-[10px] md:text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {currentDetections.length} Detection(s)
                  </Badge>
                )}
              </div>
            )}

            {/* Performance Stats */}
            {isStreaming && (
              <div className="absolute top-3 right-3 text-right space-y-1">
                <div className="text-[10px] md:text-xs text-white/80 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                  {lastAnalysisTime > 0 ? `${Math.round(lastAnalysisTime)}ms` : '--'}
                </div>
              </div>
            )}

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Side Panel - Detection Results */}
          {isStreaming && (
            <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 bg-card/50 overflow-y-auto max-h-[40vh] lg:max-h-full">
              <DetectionStats
                detections={currentDetections}
                totalFramesAnalyzed={totalFramesAnalyzed}
                totalDamagesFound={totalDamagesFound}
                lastAnalysisTime={lastAnalysisTime}
                damageColors={DAMAGE_COLORS}
                severityColors={SEVERITY_COLORS}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 md:p-4 border-t border-border/50 bg-card/80">
          <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
            {isStreaming ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  className="rounded-full h-10 w-10 md:h-12 md:w-12 p-0"
                >
                  <Camera className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                
                <Button
                  onClick={analyzeFrame}
                  disabled={isAnalyzing}
                  className="rounded-full h-14 w-14 md:h-16 md:w-16 bg-primary hover:bg-primary/90 p-0"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                  ) : (
                    <Scan className="w-6 h-6 md:w-8 md:h-8" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveCurrentFrame}
                  disabled={currentDetections.length === 0}
                  className="rounded-full h-10 w-10 md:h-12 md:w-12 p-0"
                >
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="rounded-full h-10 w-10 md:h-12 md:w-12 p-0"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </>
            ) : null}
          </div>
          
          {isStreaming && (
            <div className="flex justify-center gap-4 mt-3 text-[10px] md:text-xs text-muted-foreground">
              <span>Frames: {totalFramesAnalyzed}</span>
              <span>•</span>
              <span>Detections: {totalDamagesFound}</span>
              <span>•</span>
              <span>Interval: {detectionInterval[0] / 1000}s</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
