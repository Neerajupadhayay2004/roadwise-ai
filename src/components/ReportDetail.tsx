import { 
  X, MapPin, Calendar, Clock, AlertTriangle, CheckCircle,
  ThermometerSun, Camera, Smartphone, Download, Share2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DamageReport, Detection } from "@/hooks/useDamageReports";
import { format } from "date-fns";
import { toast } from "sonner";

interface ReportDetailProps {
  report: DamageReport;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-orange-500/10 text-orange-500",
  critical: "bg-destructive/10 text-destructive",
};

const conditionConfig: Record<string, { color: string; label: string }> = {
  good: { color: "text-success", label: "Good Condition" },
  fair: { color: "text-warning", label: "Fair Condition" },
  poor: { color: "text-orange-500", label: "Poor Condition" },
  critical: { color: "text-destructive", label: "Critical Condition" },
  unknown: { color: "text-muted-foreground", label: "Unknown" },
};

export const ReportDetail = ({ report, onClose }: ReportDetailProps) => {
  const condition = conditionConfig[report.overall_condition] || conditionConfig.unknown;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Road Damage Report",
          text: `Road damage report: ${report.summary?.recommendation || "View details"}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = report.image_url;
    link.download = `road-damage-${report.id}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-sm border-b border-border/50 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Report Details</h2>
            <p className="text-sm text-muted-foreground">
              ID: {report.id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Image */}
        <Card variant="elevated" className="overflow-hidden">
          <img
            src={report.image_url}
            alt="Road damage"
            className="w-full max-h-[400px] object-contain bg-black"
          />
        </Card>

        {/* Summary */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Analysis Summary</h3>
              <Badge className={`${condition.color} bg-transparent border`}>
                {condition.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{report.total_damages}</p>
                <p className="text-xs text-muted-foreground">Damages Found</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">
                  {((report.confidence_score || 0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground capitalize">
                  {report.priority || "low"}
                </p>
                <p className="text-xs text-muted-foreground">Priority</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground capitalize">
                  {report.status || "pending"}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>

            {report.summary?.recommendation && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium text-foreground mb-1">Recommendation</p>
                <p className="text-sm text-muted-foreground">{report.summary.recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detections */}
        {report.detections && report.detections.length > 0 && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Detected Damages ({report.detections.length})
              </h3>
              <div className="space-y-3">
                {report.detections.map((detection: Detection, index: number) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border/50 bg-muted/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-foreground">
                          {detection.class_name}
                        </span>
                      </div>
                      <Badge className={severityColors[detection.severity] || severityColors.low}>
                        {detection.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {detection.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Confidence: {(detection.confidence * 100).toFixed(0)}%</span>
                      <span>Position: ({(detection.x_center * 100).toFixed(0)}%, {(detection.y_center * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card variant="glass">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Report Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {report.latitude && report.longitude && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(report.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capture Method</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {report.capture_method || "Upload"}
                  </p>
                </div>
              </div>

              {report.road_type && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Road Type</p>
                    <p className="text-sm font-medium text-foreground">
                      {report.road_type}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
