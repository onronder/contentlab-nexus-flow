import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import { useTeamContext } from '@/contexts/TeamContext';
import type { TaskStatus } from '@/types/tasks';

const TASK_COLUMNS: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'backlog', title: 'Backlog', color: 'bg-gray-100' },
  { status: 'todo', title: 'To Do', color: 'bg-blue-100' },
  { status: 'in_progress', title: 'In Progress', color: 'bg-yellow-100' },
  { status: 'in_review', title: 'In Review', color: 'bg-purple-100' },
  { status: 'done', title: 'Done', color: 'bg-green-100' }
];

const PRIORITY_COLORS = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500', 
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

export function TeamTaskBoard() {
  const { currentTeam } = useTeamContext();
  const { useTasks } = useTaskManagement(currentTeam?.id || '');
  const [selectedFilters, setSelectedFilters] = useState({});

  const { data: tasksResponse, isLoading } = useTasks({
    filters: selectedFilters,
    limit: 100
  });

  const tasks = tasksResponse?.tasks || [];

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(task => task.status === status);

  if (!currentTeam) {
    return <div className="p-6 text-center text-muted-foreground">Select a team to view tasks</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-center">Loading tasks...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-muted-foreground">Manage your team's tasks efficiently</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-200px)]">
        {TASK_COLUMNS.map(column => {
          const columnTasks = getTasksByStatus(column.status);
          
          return (
            <div key={column.status} className="flex flex-col">
              <div className={`${column.color} rounded-lg p-3 mb-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </div>
              </div>
              
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnTasks.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{task.title}</CardTitle>
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-xs">
                          {task.task_type}
                        </Badge>
                        {task.assignee && (
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                            {task.assignee.full_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      {task.due_date && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}