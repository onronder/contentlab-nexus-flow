import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useTeamProjects, useTeamProjectsStats, useTeamProjectSearch } from "@/hooks/queries/useTeamAwareProjectQueries";
import { Loader2, FolderKanban, Flag, TrendingUp } from "lucide-react";
import { useTeamContext } from "@/contexts/TeamContext";
import { useTeamSwitching } from "@/hooks/useTeamSwitching";

export function TeamProjectsOverview() {
  const { currentTeam } = useTeamContext();
  const { invalidateTeamQueries } = useTeamSwitching();
  const { stats } = useTeamProjectsStats();
  const [query, setQuery] = useState("");
  const { projects, isLoading } = useTeamProjectSearch(query);
  
  // Reset search when team changes
  useEffect(() => {
    setQuery("");
  }, [currentTeam?.id]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" /> High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriority}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <FolderKanban className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search team projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
          aria-label="Search team projects"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No projects found.
            </CardContent>
          </Card>
        ) : (
          projects.map((p) => (
            <Card key={p.id} className="hover:shadow-elegant transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate" title={p.name}>{p.name}</span>
                  <Badge variant="secondary">{p.industry}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground line-clamp-2">{p.description || "No description"}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                  <Badge className="capitalize">{p.priority}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
