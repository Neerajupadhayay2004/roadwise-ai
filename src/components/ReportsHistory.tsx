import { useState } from "react";
import { 
  Clock, MapPin, AlertTriangle, CheckCircle, Eye, 
  ChevronRight, Calendar, Filter, Search, MoreVertical,
  Trash2, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DamageReport } from "@/hooks/useDamageReports";
import { format } from "date-fns";

interface ReportsHistoryProps {
  reports: DamageReport[];
  onViewReport?: (report: DamageReport) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

const conditionColors: Record<string, { bg: string; text: string }> = {
  good: { bg: "bg-success/10", text: "text-success" },
  fair: { bg: "bg-warning/10", text: "text-warning" },
  poor: { bg: "bg-orange-500/10", text: "text-orange-500" },
  critical: { bg: "bg-destructive/10", text: "text-destructive" },
  unknown: { bg: "bg-muted", text: "text-muted-foreground" },
};

const statusColors: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "bg-warning/10", text: "text-warning", icon: Clock },
  reviewed: { bg: "bg-primary/10", text: "text-primary", icon: Eye },
  resolved: { bg: "bg-success/10", text: "text-success", icon: CheckCircle },
  archived: { bg: "bg-muted", text: "text-muted-foreground", icon: XCircle },
};

export const ReportsHistory = ({ reports, onViewReport, onUpdateStatus }: ReportsHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState<string | null>(null);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.overall_condition.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !filterCondition || report.overall_condition === filterCondition;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterCondition(null)}>
              All Conditions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterCondition("good")}>
              Good
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterCondition("fair")}>
              Fair
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterCondition("poor")}>
              Poor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterCondition("critical")}>
              Critical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <Card variant="glass">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No Reports Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterCondition 
                  ? "Try adjusting your search or filter"
                  : "Start analyzing road images to create reports"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => {
            const condition = conditionColors[report.overall_condition] || conditionColors.unknown;
            const status = statusColors[report.status || "pending"];
            const StatusIcon = status.icon;

            return (
              <Card 
                key={report.id} 
                variant="elevated" 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onViewReport?.(report)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-muted">
                      <img
                        src={report.thumbnail_url || report.image_url}
                        alt="Road damage"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${condition.bg} ${condition.text} border-0`}>
                              {report.overall_condition}
                            </Badge>
                            <Badge variant="outline" className={`${status.bg} ${status.text} border-0 gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {report.status || "pending"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground mt-1 truncate">
                            {report.location_name || report.address || "Unknown Location"}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus?.(report.id, "reviewed");
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Mark as Reviewed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus?.(report.id, "resolved");
                            }}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus?.(report.id, "archived");
                            }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {report.total_damages} damages
                        </span>
                        {report.latitude && report.longitude && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      {report.summary?.recommendation && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {report.summary.recommendation}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center px-3 bg-muted/30">
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Report count */}
      {filteredReports.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredReports.length} of {reports.length} reports
        </p>
      )}
    </div>
  );
};
