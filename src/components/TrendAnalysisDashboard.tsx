import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO } from "date-fns";

interface Detection {
  class_id: number;
  class_name: string;
  severity: string;
  confidence: number;
}

interface Report {
  id: string;
  created_at: string;
  total_damages: number;
  overall_condition: string;
  confidence_score: number | null;
  detections: Detection[] | null;
  priority: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TrendAnalysisDashboardProps {
  reports: Report[];
}

const DAMAGE_TYPE_COLORS: Record<string, string> = {
  "D00 - Longitudinal Crack": "#3b82f6",
  "D10 - Transverse Crack": "#8b5cf6",
  "D20 - Alligator Crack": "#f59e0b",
  "D40 - Pothole": "#ef4444",
  "D43 - Cross Walk Blur": "#6366f1",
  "D44 - White Line Blur": "#ec4899",
  "D50 - Manhole/Utility Cover": "#14b8a6",
  "Longitudinal Crack": "#3b82f6",
  "Transverse Crack": "#8b5cf6",
  "Alligator Crack": "#f59e0b",
  "Pothole": "#ef4444",
  "Other Corruption": "#6b7280",
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: "#22c55e",
  good: "#84cc16",
  fair: "#f59e0b",
  poor: "#f97316",
  critical: "#ef4444",
  unknown: "#6b7280",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

type TimeRange = "7d" | "30d" | "90d" | "12m" | "all";

export const TrendAnalysisDashboard = ({ reports }: TrendAnalysisDashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // Filter reports based on time range
  const filteredReports = useMemo(() => {
    if (timeRange === "all") return reports;
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "12m":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }
    
    return reports.filter(r => {
      const reportDate = parseISO(r.created_at);
      return isWithinInterval(reportDate, { start: startDate, end: now });
    });
  }, [reports, timeRange]);

  // Calculate trend data over time
  const trendData = useMemo(() => {
    if (filteredReports.length === 0) return [];
    
    const now = new Date();
    let intervals: Date[];
    let formatStr: string;
    
    switch (timeRange) {
      case "7d":
        intervals = eachDayOfInterval({ start: subDays(now, 7), end: now });
        formatStr = "EEE";
        break;
      case "30d":
        intervals = eachDayOfInterval({ start: subDays(now, 30), end: now });
        formatStr = "MMM d";
        break;
      case "90d":
        intervals = eachWeekOfInterval({ start: subDays(now, 90), end: now });
        formatStr = "MMM d";
        break;
      case "12m":
        intervals = eachMonthOfInterval({ start: subMonths(now, 12), end: now });
        formatStr = "MMM yy";
        break;
      default:
        intervals = eachDayOfInterval({ start: subDays(now, 30), end: now });
        formatStr = "MMM d";
    }
    
    return intervals.map((date, idx) => {
      const nextDate = intervals[idx + 1] || now;
      const periodReports = filteredReports.filter(r => {
        const reportDate = parseISO(r.created_at);
        return isWithinInterval(reportDate, { 
          start: startOfDay(date), 
          end: endOfDay(nextDate) 
        });
      });
      
      const totalDamages = periodReports.reduce((sum, r) => sum + r.total_damages, 0);
      const avgConfidence = periodReports.length > 0
        ? periodReports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / periodReports.length
        : 0;
      
      const criticalCount = periodReports.filter(r => 
        r.overall_condition === "critical" || r.priority === "critical"
      ).length;
      
      return {
        date: format(date, formatStr),
        reports: periodReports.length,
        damages: totalDamages,
        avgConfidence: Math.round(avgConfidence * 100),
        critical: criticalCount,
      };
    });
  }, [filteredReports, timeRange]);

  // Damage type distribution
  const damageTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    
    filteredReports.forEach(report => {
      if (report.detections && Array.isArray(report.detections)) {
        report.detections.forEach((det: Detection) => {
          const typeName = det.class_name || "Unknown";
          typeCount[typeName] = (typeCount[typeName] || 0) + 1;
        });
      }
    });
    
    return Object.entries(typeCount)
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        fullName: name,
        value,
        color: DAMAGE_TYPE_COLORS[name] || "#6b7280",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredReports]);

  // Condition distribution
  const conditionData = useMemo(() => {
    const condCount: Record<string, number> = {};
    
    filteredReports.forEach(report => {
      const cond = report.overall_condition || "unknown";
      condCount[cond] = (condCount[cond] || 0) + 1;
    });
    
    return Object.entries(condCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CONDITION_COLORS[name] || "#6b7280",
    }));
  }, [filteredReports]);

  // Severity distribution
  const severityData = useMemo(() => {
    const sevCount: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    
    filteredReports.forEach(report => {
      if (report.detections && Array.isArray(report.detections)) {
        report.detections.forEach((det: Detection) => {
          const sev = det.severity || "medium";
          if (sevCount[sev] !== undefined) {
            sevCount[sev]++;
          }
        });
      }
    });
    
    return Object.entries(sevCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name],
    }));
  }, [filteredReports]);

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;
    
    switch (timeRange) {
      case "7d":
        currentStart = subDays(now, 7);
        previousStart = subDays(now, 14);
        previousEnd = subDays(now, 7);
        break;
      case "30d":
        currentStart = subDays(now, 30);
        previousStart = subDays(now, 60);
        previousEnd = subDays(now, 30);
        break;
      case "90d":
        currentStart = subDays(now, 90);
        previousStart = subDays(now, 180);
        previousEnd = subDays(now, 90);
        break;
      case "12m":
        currentStart = subMonths(now, 12);
        previousStart = subMonths(now, 24);
        previousEnd = subMonths(now, 12);
        break;
      default:
        return null;
    }
    
    const currentReports = reports.filter(r => {
      const date = parseISO(r.created_at);
      return isWithinInterval(date, { start: currentStart, end: now });
    });
    
    const previousReports = reports.filter(r => {
      const date = parseISO(r.created_at);
      return isWithinInterval(date, { start: previousStart, end: previousEnd });
    });
    
    const currentDamages = currentReports.reduce((sum, r) => sum + r.total_damages, 0);
    const previousDamages = previousReports.reduce((sum, r) => sum + r.total_damages, 0);
    
    const currentCritical = currentReports.filter(r => 
      r.overall_condition === "critical" || r.priority === "critical"
    ).length;
    const previousCritical = previousReports.filter(r => 
      r.overall_condition === "critical" || r.priority === "critical"
    ).length;
    
    const currentAvgConf = currentReports.length > 0
      ? currentReports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / currentReports.length
      : 0;
    const previousAvgConf = previousReports.length > 0
      ? previousReports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / previousReports.length
      : 0;
    
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    return {
      reports: {
        current: currentReports.length,
        previous: previousReports.length,
        change: calcChange(currentReports.length, previousReports.length),
      },
      damages: {
        current: currentDamages,
        previous: previousDamages,
        change: calcChange(currentDamages, previousDamages),
      },
      critical: {
        current: currentCritical,
        previous: previousCritical,
        change: calcChange(currentCritical, previousCritical),
      },
      confidence: {
        current: Math.round(currentAvgConf * 100),
        previous: Math.round(previousAvgConf * 100),
        change: calcChange(currentAvgConf, previousAvgConf),
      },
    };
  }, [reports, timeRange]);

  // Radar chart data for damage type comparison
  const radarData = useMemo(() => {
    const types = ["Longitudinal", "Transverse", "Alligator", "Pothole", "Other"];
    
    return types.map(type => {
      const count = filteredReports.reduce((sum, report) => {
        if (!report.detections || !Array.isArray(report.detections)) return sum;
        return sum + report.detections.filter((d: Detection) => 
          d.class_name?.toLowerCase().includes(type.toLowerCase())
        ).length;
      }, 0);
      
      return {
        type,
        count,
        fullMark: Math.max(count * 1.5, 10),
      };
    });
  }, [filteredReports]);

  const TrendIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    if (Math.abs(value) < 1) {
      return (
        <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
          <Minus className="w-3 h-3" />
          No change
        </span>
      );
    }
    
    return (
      <span className={`flex items-center gap-0.5 text-xs ${isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"}`}>
        {value > 0 ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Trend Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track road condition changes and damage patterns over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Cards */}
      {comparisonMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reports</p>
                  <p className="text-2xl font-bold text-foreground">{comparisonMetrics.reports.current}</p>
                </div>
                <div className="text-right">
                  <TrendIndicator value={comparisonMetrics.reports.change} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">vs prev. period</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Damages</p>
                  <p className="text-2xl font-bold text-foreground">{comparisonMetrics.damages.current}</p>
                </div>
                <div className="text-right">
                  <TrendIndicator value={comparisonMetrics.damages.change} inverse />
                  <p className="text-[10px] text-muted-foreground mt-0.5">vs prev. period</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical</p>
                  <p className="text-2xl font-bold text-destructive">{comparisonMetrics.critical.current}</p>
                </div>
                <div className="text-right">
                  <TrendIndicator value={comparisonMetrics.critical.change} inverse />
                  <p className="text-[10px] text-muted-foreground mt-0.5">vs prev. period</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Confidence</p>
                  <p className="text-2xl font-bold text-primary">{comparisonMetrics.confidence.current}%</p>
                </div>
                <div className="text-right">
                  <TrendIndicator value={comparisonMetrics.confidence.change} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">vs prev. period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1.5">
            <PieChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Distribution</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Reports Over Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Reports Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="reports" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorReports)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Damages Detected */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Damages Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="damages" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="critical" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Multi-Metric Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="reports" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                      name="Reports"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="damages" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--warning))", r: 3 }}
                      name="Damages"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="avgConfidence" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--success))", r: 3 }}
                      name="Confidence %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Damage Types */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Damage Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={damageTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {damageTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {damageTypeData.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Condition Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Road Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conditionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {conditionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {conditionData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Severity Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {severityData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Damage Type Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="type" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <PolarRadiusAxis 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Radar
                        name="Damage Count"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Period Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-3xl font-bold text-primary">{filteredReports.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-3xl font-bold text-warning">
                      {filteredReports.reduce((sum, r) => sum + r.total_damages, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Damages</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Most Common Damage</span>
                    <Badge variant="outline">
                      {damageTypeData[0]?.fullName || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Predominant Condition</span>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: conditionData[0]?.color,
                        color: conditionData[0]?.color 
                      }}
                    >
                      {conditionData[0]?.name || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Avg Damages per Report</span>
                    <Badge variant="secondary">
                      {filteredReports.length > 0 
                        ? (filteredReports.reduce((sum, r) => sum + r.total_damages, 0) / filteredReports.length).toFixed(1)
                        : "0"
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Detection Accuracy</span>
                    <Badge variant="secondary" className="bg-success/20 text-success">
                      {filteredReports.length > 0 
                        ? Math.round(filteredReports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / filteredReports.length * 100)
                        : 0
                      }%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No Data Available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start scanning roads to see trend analysis and historical comparisons.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
