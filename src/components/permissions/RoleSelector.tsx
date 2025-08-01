import React, { useState } from 'react';
import { Check, ChevronDown, Shield, Users, Crown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRoles, useRolePermissions } from '@/hooks/usePermissionQueries';
import { UserRole } from '@/types/team';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  value?: string;
  onValueChange: (roleId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  includeInactive?: boolean;
  showPermissionPreview?: boolean;
  className?: string;
}

export function RoleSelector({
  value,
  onValueChange,
  placeholder = 'Select a role...',
  disabled = false,
  includeInactive = false,
  showPermissionPreview = true,
  className
}: RoleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useUserRoles(includeInactive);
  const { data: previewPermissions = [] } = useRolePermissions(previewRoleId || '');

  const selectedRole = roles.find(role => role.id === value);

  const getRoleIcon = (role: UserRole) => {
    if (role.slug === 'owner') return Crown;
    if (role.slug === 'admin') return Shield;
    if (role.slug === 'manager') return Users;
    if (role.slug === 'viewer') return Eye;
    return Shield;
  };

  const getRoleColor = (role: UserRole) => {
    if (role.slug === 'owner') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (role.slug === 'admin') return 'bg-red-100 text-red-800 border-red-300';
    if (role.slug === 'manager') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (role.slug === 'editor') return 'bg-green-100 text-green-800 border-green-300';
    if (role.slug === 'viewer') return 'bg-gray-100 text-gray-800 border-gray-300';
    return 'bg-purple-100 text-purple-800 border-purple-300';
  };

  const sortedRoles = [...roles].sort((a, b) => b.hierarchy_level - a.hierarchy_level);

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
            disabled={disabled || isLoading}
          >
            {selectedRole ? (
              <div className="flex items-center gap-2">
                {React.createElement(getRoleIcon(selectedRole), { className: 'h-4 w-4' })}
                <span>{selectedRole.name}</span>
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', getRoleColor(selectedRole))}
                >
                  Level {selectedRole.hierarchy_level}
                </Badge>
              </div>
            ) : (
              placeholder
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search roles..." />
            <CommandList>
              <CommandEmpty>No roles found.</CommandEmpty>
              <CommandGroup>
                {sortedRoles.map((role) => {
                  const IconComponent = getRoleIcon(role);
                  return (
                    <Tooltip key={role.id} delayDuration={500}>
                      <TooltipTrigger asChild>
                        <CommandItem
                          value={role.slug}
                          onSelect={() => {
                            onValueChange(role.id);
                            setOpen(false);
                            setPreviewRoleId(null);
                          }}
                          onMouseEnter={() => showPermissionPreview && setPreviewRoleId(role.id)}
                          onMouseLeave={() => setPreviewRoleId(null)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <IconComponent className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">{role.name}</span>
                              {role.description && (
                                <span className="text-xs text-muted-foreground">
                                  {role.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn('text-xs', getRoleColor(role))}
                            >
                              Level {role.hierarchy_level}
                            </Badge>
                            {!role.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              value === role.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      </TooltipTrigger>
                      {showPermissionPreview && previewRoleId === role.id && previewPermissions.length > 0 && (
                        <TooltipContent side="right" className="max-w-sm">
                          <div className="space-y-2">
                            <p className="font-medium">Permissions for {role.name}:</p>
                            <div className="grid grid-cols-1 gap-1 text-xs">
                              {previewPermissions.slice(0, 8).map((permission) => (
                                <div key={permission.id} className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                  <span>{permission.name}</span>
                                </div>
                              ))}
                              {previewPermissions.length > 8 && (
                                <div className="text-muted-foreground">
                                  +{previewPermissions.length - 8} more permissions...
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}