import React, { useState } from 'react';
import { Plus, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import { useTeamContext } from '@/contexts/TeamContext';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useTeamMembers } from '@/hooks/useTeamQueries';
import type { TaskStatus, Task } from '@/types/tasks';

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
  const { useTasks, createTask, updateTask } = useTaskManagement(currentTeam?.id || '');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const { data: membersData } = useTeamMembers(currentTeam?.id || '');

  const { data: tasksResponse, isLoading } = useTasks({
    filters: { ...selectedFilters, search: searchQuery },
    limit: 100
  });

  const tasks = tasksResponse?.tasks || [];
  const teamMembers = (membersData?.members || []).map((m: any) => ({
    id: m.user?.id || m.user_id,
    name: m.user?.display_name || m.user?.full_name || m.user?.email || 'Unknown',
    avatarUrl: m.user?.avatar_url
  }));

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(task => task.status === status);

  const handleCreateTask = (taskData: Partial<Task>) => {
    createTask.mutate({
      ...taskData,
      team_id: currentTeam?.id || '',
      task_type: taskData.task_type || 'feature'
    } as any);
  };

  const handleUpdateTask = (taskData: Partial<Task>) => {
    if (selectedTask) {
      updateTask.mutate({
        id: selectedTask.id,
        ...taskData
      } as any);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(undefined);
    setIsTaskModalOpen(true);
  };

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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={handleNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
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
                  <Card 
                    key={task.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{task.title}</CardTitle>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleTaskClick(task)}>
                                Edit Task
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      {/* Task tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {task.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{task.tags.length - 2}
                            </Badge>
                          )}
                        </div>
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
                      
                      {/* Subtasks progress */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Subtasks: {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                        </div>
                      )}
                      
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

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        teamMembers={teamMembers}
      />
    </div>
  );
}