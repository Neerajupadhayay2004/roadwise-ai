import { useState, useMemo } from "react";
import { Shield, Users, FileText, AlertTriangle, CheckCircle, Clock, Settings, TrendingUp, MapPin, Trash2, Eye, Edit, BarChart3, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DamageReport } from "@/hooks/useDamageReports";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminDashboardProps {
  reports: DamageReport[];
  onClose: () => void;
  onViewReport: (report: DamageReport) => void;
  onRefresh: () => void;
}

export const AdminDashboard = ({ reports, onClose, onViewReport, onRefresh }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayReports = reports.filter(r => new Date(r.created_at) >= today);
    const weekReports = reports.filter(r => new Date(r.created_at) >= weekAgo);
    const monthReports = reports.filter(r => new Date(r.created_at) >= monthAgo);

    const byStatus = {
      pending: reports.filter(r => r.status === "pending").length,
      reviewed: reports.filter(r => r.status === "reviewed").length,
      resolved: reports.filter(r => r.status === "resolved").length,
    };

    const byPriority = {
      high: reports.filter(r => r.priority === "high").length,
      medium: reports.filter(r => r.priority === "medium").length,
      low: reports.filter(r => r.priority === "low").length,
    };

    const byCondition = {
      critical: reports.filter(r => r.overall_condition === "critical").length,
      poor: reports.filter(r => r.overall_condition === "poor").length,
      fair: reports.filter(r => r.overall_condition === "fair").length,
      good: reports.filter(r => r.overall_condition === "good").length,
    };

    const totalDamages = reports.reduce((sum, r) => sum + r.total_damages, 0);
    const avgConfidence = reports.length > 0
      ? reports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / reports.length
      : 0;

    return {
      total: reports.length,
      today: todayReports.length,
      week: weekReports.length,
      month: monthReports.length,
      byStatus,
      byPriority,
      byCondition,
      totalDamages,
      avgConfidence,
    };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter(r => r.priority === priorityFilter);
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === "today") {
        result = result.filter(r => new Date(r.created_at) >= today);
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter(r => new Date(r.created_at) >= weekAgo);
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter(r => new Date(r.created_at) >= monthAgo);
      }
    }

    return result;
  }, [reports, statusFilter, priorityFilter, dateFilter]);

  const handleBulkStatusUpdate = async (status: string) => {
    const pendingReports = filteredReports.filter(r => r.status === "pending");
    if (pendingReports.length === 0) {
      toast.info("No pending reports to update");
      return;
    }

    try {
      toast.loading(`Updating ${pendingReports.length} reports...`, { id: "bulk-update" });
      
      const { error } = await supabase
        .from("damage_reports")
        .update({ status })
        .in("id", pendingReports.map(r => r.id));

      if (error) throw error;

      toast.dismiss("bulk-update");
      toast.success(`Updated ${pendingReports.length} reports to ${status}`);
      onRefresh();
    } catch (error) {
      toast.dismiss("bulk-update");
      toast.error("Failed to update reports");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from("damage_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      toast.success("Report deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete report");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500/10 text-amber-500";
      case "reviewed": return "bg-blue-500/10 text-blue-500";
      case "resolved": return "bg-green-500/10 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-amber-500/10 text-amber-500";
      case "low": return "bg-green-500/10 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-0 rounded-none border-0 bg-background overflow-hidden">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Admin Dashboard</h3>
              <p className="text-xs text-muted-foreground">Road Damage Management System</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <FileText className="w-4 h-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card variant="glass" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Reports</p>
                    </div>
                  </div>
                </Card>
                
                <Card variant="glass" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.byStatus.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </Card>
                
                <Card variant="glass" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.byCondition.critical}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                  </div>
                </Card>
                
                <Card variant="glass" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.byStatus.resolved}</p>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card variant="elevated" className="p-4">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Status Distribution
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>{status}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono text-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="elevated" className="p-4">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Priority Levels
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(stats.byPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <Badge className={getPriorityColor(priority)}>{priority}</Badge>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono text-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card variant="elevated" className="p-4">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Activity Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{stats.today}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{stats.week}</p>
                    <p className="text-xs text-muted-foreground">This Week</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{stats.month}</p>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate("reviewed")}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark All Reviewed
                </Button>
              </div>

              {/* Reports List */}
              <div className="space-y-2">
                {filteredReports.length === 0 ? (
                  <Card variant="glass" className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reports match the current filters</p>
                  </Card>
                ) : (
                  filteredReports.slice(0, 20).map((report) => (
                    <Card key={report.id} variant="glass" className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <img
                          src={report.image_url}
                          alt="Report"
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(report.status || "pending")}>
                              {report.status}
                            </Badge>
                            <Badge className={getPriorityColor(report.priority || "low")}>
                              {report.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1 truncate">
                            {report.location_name || "Unknown Location"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.total_damages} damages • {report.overall_condition} condition
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onViewReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteReport(report.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card variant="elevated" className="p-4">
                  <h4 className="font-semibold text-foreground mb-4">Condition Distribution</h4>
                  <div className="space-y-3">
                    {Object.entries(stats.byCondition).map(([condition, count]) => (
                      <div key={condition} className="flex items-center justify-between">
                        <span className="text-sm text-foreground capitalize">{condition}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                condition === "critical" ? "bg-red-500" :
                                condition === "poor" ? "bg-orange-500" :
                                condition === "fair" ? "bg-amber-500" : "bg-green-500"
                              }`}
                              style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono text-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="elevated" className="p-4">
                  <h4 className="font-semibold text-foreground mb-4">Key Metrics</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Damages Detected</span>
                      <span className="text-lg font-bold text-foreground">{stats.totalDamages}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Average Confidence</span>
                      <span className="text-lg font-bold text-foreground">{(stats.avgConfidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Resolution Rate</span>
                      <span className="text-lg font-bold text-green-500">
                        {stats.total > 0 ? ((stats.byStatus.resolved / stats.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};
