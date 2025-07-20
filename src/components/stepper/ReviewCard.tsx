import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  className?: string;
}

export const ReviewCard = ({ title, children, onEdit, className }: ReviewCardProps) => (
  <Card className={cn("shadow-elegant transition-elegant hover:shadow-stepper", className)}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      {children}
    </CardContent>
  </Card>
);