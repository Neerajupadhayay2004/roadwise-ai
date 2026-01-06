import { useState, useRef, useCallback } from "react";
import { Camera, X, RotateCcw, Check, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        setCapturedImage(null);
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
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  }, [capturedImage, onCapture, onClose]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isStreaming, stopCamera, startCamera]);

  return (
    <Card className="fixed inset-0 z-50 m-0 rounded-none border-0 bg-background/95 backdrop-blur-xl">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Camera Capture</h3>
              <p className="text-xs text-muted-foreground">Capture road images in real-time</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {!isStreaming && !capturedImage && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                <VideoOff className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Camera is off</p>
              <Button onClick={startCamera} variant="hero" size="lg" className="gap-2">
                <Video className="w-5 h-5" />
                Start Camera
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

          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="max-h-full max-w-full object-contain"
            />
          )}

          {/* Scanning overlay */}
          {isStreaming && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-50" />
              <div className="absolute inset-8 border-2 border-primary/30 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border/50 bg-card/50">
          <div className="flex items-center justify-center gap-4">
            {isStreaming && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full h-12 w-12"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="rounded-full h-16 w-16 bg-primary hover:bg-primary/90"
                >
                  <Camera className="w-8 h-8" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stopCamera}
                  className="rounded-full h-12 w-12"
                >
                  <X className="w-5 h-5" />
                </Button>
              </>
            )}

            {capturedImage && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={retake}
                  className="gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={confirmCapture}
                  className="gap-2"
                >
                  <Check className="w-5 h-5" />
                  Use This Photo
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
