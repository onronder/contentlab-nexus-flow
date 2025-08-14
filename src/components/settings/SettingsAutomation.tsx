import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Zap, Brain, Code, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'user_action' | 'team_join' | 'project_create' | 'time_based' | 'condition';
    condition: string;
    parameters: Record<string, any>;
  };
  actions: {
    type: 'apply_settings' | 'send_notification' | 'create_project' | 'assign_role';
    parameters: Record<string, any>;
  }[];
  isActive: boolean;
  priority: number;
  created_at: string;
}

export function SettingsAutomation() {
  const { toast } = useToast();
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const defaultRule: Partial<AutomationRule> = {
    name: '',
    description: '',
    trigger: {
      type: 'user_action',
      condition: '',
      parameters: {},
    },
    actions: [],
    isActive: true,
    priority: 1,
  };

  const [newRule, setNewRule] = useState<Partial<AutomationRule>>(defaultRule);

  const triggerTypes = [
    { value: 'user_action', label: 'User Action', description: 'When user performs specific action' },
    { value: 'team_join', label: 'Team Join', description: 'When user joins a team' },
    { value: 'project_create', label: 'Project Create', description: 'When new project is created' },
    { value: 'time_based', label: 'Time Based', description: 'At specific times or intervals' },
    { value: 'condition', label: 'Condition Met', description: 'When certain conditions are met' },
  ];

  const actionTypes = [
    { value: 'apply_settings', label: 'Apply Settings', description: 'Apply predefined settings' },
    { value: 'send_notification', label: 'Send Notification', description: 'Send notification to user' },
    { value: 'create_project', label: 'Create Project', description: 'Auto-create project from template' },
    { value: 'assign_role', label: 'Assign Role', description: 'Assign role to user' },
  ];

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name and description for the rule.',
        variant: 'destructive',
      });
      return;
    }

    const rule: AutomationRule = {
      id: crypto.randomUUID(),
      name: newRule.name,
      description: newRule.description,
      trigger: newRule.trigger!,
      actions: newRule.actions || [],
      isActive: newRule.isActive || true,
      priority: newRule.priority || 1,
      created_at: new Date().toISOString(),
    };

    setAutomationRules(prev => [...prev, rule]);
    setNewRule(defaultRule);
    setIsCreating(false);

    toast({
      title: 'Rule Created',
      description: `Automation rule "${rule.name}" has been created.`,
    });
  };

  const handleToggleRule = (ruleId: string) => {
    setAutomationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== ruleId));
    toast({
      title: 'Rule Deleted',
      description: 'Automation rule has been deleted.',
    });
  };

  const addAction = () => {
    setNewRule(prev => ({
      ...prev,
      actions: [
        ...(prev.actions || []),
        { type: 'apply_settings', parameters: {} },
      ],
    }));
  };

  const removeAction = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateAction = (index: number, updates: Partial<AutomationRule['actions'][0]>) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions?.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      ) || [],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings Automation</h2>
          <p className="text-muted-foreground">
            Create rules to automatically apply settings and perform actions
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Quick Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Smart Defaults</CardTitle>
            </div>
            <CardDescription>
              Automatically apply optimized settings based on user behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Configure Smart Defaults
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Recommendations</CardTitle>
            </div>
            <CardDescription>
              Get AI-powered suggestions for settings optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Enable AI Suggestions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">API Integration</CardTitle>
            </div>
            <CardDescription>
              Manage settings programmatically via REST API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View API Docs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Active Automation Rules</CardTitle>
          <CardDescription>
            {automationRules.length} rule(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {automationRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automation rules configured yet.</p>
              <p className="text-sm">Create your first rule to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {automationRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{rule.name}</h4>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Priority {rule.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Trigger: {rule.trigger.type}</span>
                    <span>Actions: {rule.actions.length}</span>
                    <span>Created: {new Date(rule.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Rule Dialog */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Automation Rule</CardTitle>
            <CardDescription>
              Define triggers and actions for automatic settings management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New Team Member Setup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-priority">Priority</Label>
                <Select
                  value={newRule.priority?.toString() || '1'}
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, priority: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Highest)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 (Lowest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={newRule.description || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule does..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Trigger</h4>
              <Select
                value={newRule.trigger?.type || ''}
                onValueChange={(value) => setNewRule(prev => ({
                  ...prev,
                  trigger: { ...prev.trigger!, type: value as any }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label htmlFor="trigger-condition">Condition</Label>
                <Input
                  id="trigger-condition"
                  value={newRule.trigger?.condition || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    trigger: { ...prev.trigger!, condition: e.target.value }
                  }))}
                  placeholder="e.g., user.role === 'new' && team.type === 'organization'"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Actions</h4>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>

              {newRule.actions?.map((action, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">Action {index + 1}</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={action.type}
                    onValueChange={(value) => updateAction(index, { type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {newRule.actions?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No actions defined yet.</p>
                  <p className="text-xs">Add at least one action to complete the rule.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="rule-active"
                  checked={newRule.isActive || true}
                  onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="rule-active">Enable this rule immediately</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule}>
                  Create Rule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}