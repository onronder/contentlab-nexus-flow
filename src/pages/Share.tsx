import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfigurableChart from "@/components/analytics/ConfigurableChart";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, Calendar, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ShareData {
  chart_title: string;
  payload: {
    title: string;
    data: any[];
    config: any;
    generatedAt: string;
  };
  expires_at?: string;
}

export default function Share() {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/get-report-share?token=${token}`
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setShareData(data);
      } catch (err) {
        console.error("Error fetching share data:", err);
        setError(err instanceof Error ? err.message : "Failed to load shared chart");
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Loading shared chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Unable to Load Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mt-4">
              This could mean the link has expired, been revoked, or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No chart data found</p>
      </div>
    );
  }

  const isExpired = shareData.expires_at && new Date(shareData.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Shared Chart</h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Generated {format(new Date(shareData.payload.generatedAt), "PPP 'at' p")}
            </div>
            {shareData.expires_at && (
              <Badge variant={isExpired ? "destructive" : "secondary"}>
                {isExpired ? "Expired" : "Expires"} {format(new Date(shareData.expires_at), "PPP")}
              </Badge>
            )}
          </div>
        </div>

        {/* Expired Warning */}
        {isExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This shared chart has expired and may not display current data.
            </AlertDescription>
          </Alert>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{shareData.chart_title || shareData.payload.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ConfigurableChart
                title={shareData.payload.title}
                data={shareData.payload.data}
                config={shareData.payload.config}
                
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          <p>This chart was shared using Analytics Dashboard</p>
        </div>
      </div>
    </div>
  );
}