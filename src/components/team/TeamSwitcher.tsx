import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Settings } from "lucide-react";
import { useTeamContext } from "@/contexts/TeamContext";
import { useAppPreferences } from "@/hooks/useAppPreferences";

export function TeamSwitcher() {
  const { currentTeam, availableTeams, switchTeam, isLoading } = useTeamContext();
  const { data: preferences } = useAppPreferences();

  if (isLoading) {
    return <div className="h-8 w-48 animate-pulse bg-muted rounded" />;
  }

  const recentTeams = preferences?.recentTeams || [];
  const recentTeamObjects = recentTeams
    .map(id => availableTeams.find(team => team.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="flex items-center gap-2">
      <Select value={currentTeam?.id || ""} onValueChange={switchTeam}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select team..." />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Available Teams
          </div>
          {availableTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>{team.name}</span>
                {team.id === currentTeam?.id && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
          
          {recentTeamObjects.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1 border-t mt-1 pt-2">
                <Clock className="w-3 h-3" />
                Recent Teams
              </div>
              {recentTeamObjects.map((team) => (
                <SelectItem key={`recent-${team.id}`} value={team.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>{team.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Recent
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      
      {preferences && (
        <Button variant="ghost" size="sm" className="p-2">
          <Settings className="w-4 h-4" />
        </Button>
      )}
      
      {preferences?.crossDeviceSync && (
        <Badge variant="secondary" className="text-xs">
          Synced
        </Badge>
      )}
    </div>
  );
}