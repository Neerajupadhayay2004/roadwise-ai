import { useEffect, useRef } from "react";

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

interface DetectionCanvasProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
  damageColors: Record<number, string>;
  severityColors: Record<string, string>;
}

export const DetectionCanvas = ({
  detections,
  videoWidth,
  videoHeight,
  damageColors,
  severityColors,
}: DetectionCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || videoWidth === 0 || videoHeight === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each detection
    detections.forEach((detection, index) => {
      const color = damageColors[detection.class_id] || "#ffffff";
      const severityColor = severityColors[detection.severity] || "#ffffff";

      // Convert normalized coordinates to pixel coordinates
      const x = (detection.x_center - detection.width / 2) * videoWidth;
      const y = (detection.y_center - detection.height / 2) * videoHeight;
      const w = detection.width * videoWidth;
      const h = detection.height * videoHeight;

      // Draw bounding box with gradient effect
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      
      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;

      // Corner accents
      const cornerLength = Math.min(w, h) * 0.15;
      ctx.lineWidth = 4;
      ctx.strokeStyle = severityColor;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLength, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLength);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLength);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLength, y + h);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLength, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLength);
      ctx.stroke();

      // Draw label background
      const label = `${detection.class_name} ${Math.round(detection.confidence * 100)}%`;
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      const textMetrics = ctx.measureText(label);
      const textHeight = 20;
      const padding = 8;
      const labelWidth = textMetrics.width + padding * 2;
      const labelHeight = textHeight + padding;

      // Label background with gradient
      const gradient = ctx.createLinearGradient(x, y - labelHeight, x + labelWidth, y);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, severityColor);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y - labelHeight - 4, labelWidth, labelHeight, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + padding, y - padding - 4);

      // Severity indicator
      const severityLabel = detection.severity.toUpperCase();
      ctx.font = "bold 10px Inter, system-ui, sans-serif";
      const severityMetrics = ctx.measureText(severityLabel);
      const severityWidth = severityMetrics.width + padding * 2;
      
      ctx.fillStyle = severityColor;
      ctx.beginPath();
      ctx.roundRect(x + w - severityWidth, y + h + 4, severityWidth, 18, 4);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.fillText(severityLabel, x + w - severityWidth + padding, y + h + 16);

      // Detection index
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + w - 12, y + 12, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), x + w - 12, y + 12);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    });

    // Draw scanning line effect when no detections
    if (detections.length === 0) {
      const time = Date.now() / 1000;
      const scanY = ((Math.sin(time * 2) + 1) / 2) * videoHeight;
      
      const scanGradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGradient.addColorStop(0, "transparent");
      scanGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.3)");
      scanGradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanY - 20, videoWidth, 40);
    }
  }, [detections, videoWidth, videoHeight, damageColors, severityColors]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      style={{ mixBlendMode: "normal" }}
    />
  );
};
