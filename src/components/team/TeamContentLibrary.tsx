import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Folder } from "lucide-react";
import { useTeamProjects } from "@/hooks/queries/useTeamAwareProjectQueries";
import { useTeamContent } from "@/hooks/queries/useTeamAwareContentQueries";

export function TeamContentLibrary() {
  const { data: projects = [], isLoading: projectsLoading } = useTeamProjects();
  const [projectId, setProjectId] = useState<string | undefined>(projects[0]?.id);
  const [search, setSearch] = useState("");
const { data: content = [], isLoading } = useTeamContent(projectId || "");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return content.filter((c: any) =>
      c.title.toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term)
    );
  }, [content, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Project</label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => (
                <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Search</label>
          <Input placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {!projectId ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground flex items-center gap-2">
            <Folder className="h-4 w-4" /> Select a project to view team content.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading content...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">No content found.</CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[420px] rounded border">
          <div className="divide-y">
            {filtered.map((item: any) => (
              <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="truncate">
                      <div className="font-medium truncate" title={item.title}>{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.description || "No description"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{item.status}</Badge>
                    <Badge variant="secondary" className="capitalize">{item.content_type}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
