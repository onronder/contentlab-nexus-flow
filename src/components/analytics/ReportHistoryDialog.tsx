import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Download, 
  Eye, 
  Calendar, 
  Mail, 
  FileText, 
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { listSchedules, listGeneratedReports } from "@/services/reportingService";

interface ReportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduledReport {
  id: string;
  email_subject: string;
  recipients: string[];
  cadence: string;
  format: string;
  is_active: boolean;
  next_run_at: string;
  last_run_at?: string;
  created_at: string;
}

interface GeneratedReport {
  id: string;
  status: string;
  file_format?: string;
  file_url?: string;
  download_count: number;
  created_at: string;
  scheduled_report_id?: string;
}

export function ReportHistoryDialog({ open, onOpenChange }: ReportHistoryDialogProps) {
  const [activeTab, setActiveTab] = useState<"scheduled" | "generated">("scheduled");
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, reportsData] = await Promise.all([
        listSchedules(),
        listGeneratedReports()
      ]);
      setScheduledReports(schedulesData || []);
      setGeneratedReports(reportsData || []);
    } catch (error) {
      toast({
        title: "Error loading reports",
        description: "Failed to load report history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  const downloadReport = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Report History</DialogTitle>
        </DialogHeader>

        <div className="flex border-b">
          <Button
            variant={activeTab === "scheduled" ? "default" : "ghost"}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab("scheduled")}
          >
            <Clock className="h-4 w-4 mr-2" />
            Scheduled Reports
          </Button>
          <Button
            variant={activeTab === "generated" ? "default" : "ghost"}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab("generated")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generated Reports
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <Clock className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading reports...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {activeTab === "scheduled" && (
                <>
                  {scheduledReports.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No scheduled reports yet</p>
                    </div>
                  ) : (
                    scheduledReports.map((report) => (
                      <Card key={report.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{report.email_subject}</CardTitle>
                            <Badge variant={report.is_active ? "default" : "secondary"}>
                              {report.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{report.recipients.length} recipient(s)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="capitalize">{report.cadence}</span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Next run:</span>
                              <span>{format(new Date(report.next_run_at), "PPP p")}</span>
                            </div>
                            {report.last_run_at && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last run:</span>
                                <span>{format(new Date(report.last_run_at), "PPP p")}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{format(new Date(report.created_at), "PPP")}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              )}

              {activeTab === "generated" && (
                <>
                  {generatedReports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No generated reports yet</p>
                    </div>
                  ) : (
                    generatedReports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(report.status)}
                                <Badge variant={getStatusVariant(report.status)}>
                                  {report.status}
                                </Badge>
                                {report.file_format && (
                                  <Badge variant="outline">
                                    {report.file_format.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(report.created_at), "PPP p")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Download className="h-3 w-3" />
                                  <span>{report.download_count} download(s)</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {report.file_url && report.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadReport(
                                    report.file_url!, 
                                    `report-${report.id}.${report.file_format}`
                                  )}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}