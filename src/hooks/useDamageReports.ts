import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DamageReport {
  id: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  location_name: string | null;
  image_url: string;
  thumbnail_url: string | null;
  overall_condition: string;
  total_damages: number;
  priority: string | null;
  confidence_score: number | null;
  detections: Detection[];
  summary: Summary;
  device_info: string | null;
  capture_method: string | null;
  weather_conditions: string | null;
  road_type: string | null;
  status: string | null;
  notes: string | null;
}

export interface Detection {
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

export interface Summary {
  total_damages: number;
  overall_condition: string;
  priority_level: string;
  recommendation: string;
}

export interface CreateReportData {
  latitude?: number;
  longitude?: number;
  address?: string;
  location_name?: string;
  image_url: string;
  overall_condition: string;
  total_damages: number;
  priority?: string;
  confidence_score?: number;
  detections: Detection[];
  summary: Summary;
  capture_method?: string;
  device_info?: string;
}

export function useDamageReports() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("damage_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(report => ({
        ...report,
        detections: (report.detections as unknown as Detection[]) || [],
        summary: (report.summary as unknown as Summary) || {
          total_damages: 0,
          overall_condition: "unknown",
          priority_level: "low",
          recommendation: ""
        }
      }));
      
      setReports(transformedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload image to storage
  const uploadImage = useCallback(async (imageData: string): Promise<string> => {
    try {
      // Convert base64 to blob
      const base64Data = imageData.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      // Generate unique filename
      const filename = `damage-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("damage-images")
        .upload(filename, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("damage-images")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      throw new Error("Failed to upload image");
    }
  }, []);

  // Create a new report
  const createReport = useCallback(async (reportData: CreateReportData): Promise<DamageReport | null> => {
    try {
      const insertData = {
        latitude: reportData.latitude || null,
        longitude: reportData.longitude || null,
        address: reportData.address || null,
        location_name: reportData.location_name || null,
        image_url: reportData.image_url,
        overall_condition: reportData.overall_condition,
        total_damages: reportData.total_damages,
        priority: reportData.priority || reportData.summary.priority_level,
        confidence_score: reportData.confidence_score || null,
        detections: JSON.parse(JSON.stringify(reportData.detections)),
        summary: JSON.parse(JSON.stringify(reportData.summary)),
        capture_method: reportData.capture_method || "upload",
        device_info: reportData.device_info || navigator.userAgent,
        status: "pending" as const,
      };

      const { data: newReport, error: insertError } = await supabase
        .from("damage_reports")
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      const transformedReport: DamageReport = {
        ...newReport,
        detections: (newReport.detections as unknown as Detection[]) || [],
        summary: (newReport.summary as unknown as Summary) || reportData.summary
      };

      setReports(prev => [transformedReport, ...prev]);
      toast.success("Report saved successfully!");
      return transformedReport;
    } catch (err) {
      console.error("Error creating report:", err);
      toast.error("Failed to save report");
      return null;
    }
  }, []);

  // Update report status
  const updateReportStatus = useCallback(async (id: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from("damage_reports")
        .update({ status })
        .eq("id", id);

      if (updateError) throw updateError;

      setReports(prev =>
        prev.map(report =>
          report.id === id ? { ...report, status } : report
        )
      );
      toast.success("Status updated!");
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel("damage_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "damage_reports",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newReport = payload.new as DamageReport;
            setReports(prev => {
              // Avoid duplicates
              if (prev.some(r => r.id === newReport.id)) return prev;
              return [{
                ...newReport,
                detections: (newReport.detections as unknown as Detection[]) || [],
                summary: (newReport.summary as unknown as Summary) || {
                  total_damages: 0,
                  overall_condition: "unknown",
                  priority_level: "low",
                  recommendation: ""
                }
              }, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedReport = payload.new as DamageReport;
            setReports(prev =>
              prev.map(report =>
                report.id === updatedReport.id ? {
                  ...updatedReport,
                  detections: (updatedReport.detections as unknown as Detection[]) || [],
                  summary: (updatedReport.summary as unknown as Summary) || report.summary
                } : report
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setReports(prev => prev.filter(report => report.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  // Computed statistics
  const stats = {
    totalReports: reports.length,
    totalDamages: reports.reduce((sum, r) => sum + r.total_damages, 0),
    averageConfidence: reports.length > 0
      ? reports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / reports.length
      : 0,
    byCondition: reports.reduce((acc, r) => {
      acc[r.overall_condition] = (acc[r.overall_condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: reports.reduce((acc, r) => {
      const status = r.status || "pending";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentReports: reports.slice(0, 5),
  };

  return {
    reports,
    isLoading,
    error,
    stats,
    fetchReports,
    uploadImage,
    createReport,
    updateReportStatus,
  };
}
