import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  History, 
  Tag, 
  Download,
  Upload,
  Calendar,
  User,
  FileText,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Eye,
  Code2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Version {
  id: string;
  versionNumber: string;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  branch?: string;
  parentVersion?: string;
  isMajor: boolean;
}

interface Branch {
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: Date;
  lastCommit: Date;
  status: 'active' | 'merged' | 'abandoned';
  ahead: number;
  behind: number;
}

interface AdvancedVersionControlProps {
  contentId: string;
  onVersionRestore?: (versionId: string) => void;
  onBranchCreate?: (branchData: any) => void;
}

export const AdvancedVersionControl: React.FC<AdvancedVersionControlProps> = ({
  contentId,
  onVersionRestore,
  onBranchCreate
}) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [isCreateBranchDialogOpen, setIsCreateBranchDialogOpen] = useState(false);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [diffView, setDiffView] = useState<{ oldVersion: string; newVersion: string } | null>(null);

  // Sample data - in production, this would come from your backend
  useEffect(() => {
    const sampleVersions: Version[] = [
      {
        id: '1',
        versionNumber: 'v2.1.0',
        title: 'Major content restructure',
        description: 'Reorganized content sections and updated competitive analysis framework',
        author: { id: 'user1', name: 'John Doe', avatar: '/api/placeholder/32/32' },
        createdAt: new Date('2024-01-15T10:30:00'),
        changes: { added: 150, removed: 45, modified: 30 },
        tags: ['major', 'restructure', 'framework'],
        status: 'published',
        branch: 'main',
        isMajor: true
      },
      {
        id: '2',
        versionNumber: 'v2.0.3',
        title: 'Content updates and bug fixes',
        description: 'Minor updates to competitive metrics and fixed data visualization issues',
        author: { id: 'user2', name: 'Jane Smith', avatar: '/api/placeholder/32/32' },
        createdAt: new Date('2024-01-10T14:20:00'),
        changes: { added: 25, removed: 10, modified: 15 },
        tags: ['patch', 'bugfix'],
        status: 'published',
        branch: 'main',
        parentVersion: '3',
        isMajor: false
      },
      {
        id: '3',
        versionNumber: 'v2.0.2',
        title: 'Initial competitive analysis',
        description: 'First version of comprehensive competitive analysis document',
        author: { id: 'user1', name: 'John Doe', avatar: '/api/placeholder/32/32' },
        createdAt: new Date('2024-01-05T09:15:00'),
        changes: { added: 300, removed: 0, modified: 0 },
        tags: ['initial', 'analysis'],
        status: 'published',
        branch: 'main',
        isMajor: true
      },
      {
        id: '4',
        versionNumber: 'feature-v2.1.0-beta.1',
        title: 'New analytics dashboard',
        description: 'Work in progress: Adding advanced analytics dashboard',
        author: { id: 'user3', name: 'Mike Johnson', avatar: '/api/placeholder/32/32' },
        createdAt: new Date('2024-01-12T16:45:00'),
        changes: { added: 80, removed: 5, modified: 20 },
        tags: ['feature', 'beta', 'analytics'],
        status: 'review',
        branch: 'feature/analytics-dashboard',
        parentVersion: '1',
        isMajor: false
      }
    ];

    const sampleBranches: Branch[] = [
      {
        id: 'main',
        name: 'main',
        description: 'Main production branch',
        author: 'System',
        createdAt: new Date('2024-01-01T00:00:00'),
        lastCommit: new Date('2024-01-15T10:30:00'),
        status: 'active',
        ahead: 0,
        behind: 0
      },
      {
        id: 'feature-analytics',
        name: 'feature/analytics-dashboard',
        description: 'Adding advanced analytics and reporting capabilities',
        author: 'Mike Johnson',
        createdAt: new Date('2024-01-10T12:00:00'),
        lastCommit: new Date('2024-01-12T16:45:00'),
        status: 'active',
        ahead: 2,
        behind: 1
      },
      {
        id: 'hotfix-data',
        name: 'hotfix/data-validation',
        description: 'Critical fix for data validation issues',
        author: 'Jane Smith',
        createdAt: new Date('2024-01-13T08:30:00'),
        lastCommit: new Date('2024-01-13T11:20:00'),
        status: 'merged',
        ahead: 0,
        behind: 0
      }
    ];

    setVersions(sampleVersions);
    setBranches(sampleBranches);
  }, [contentId]);

  const handleVersionRestore = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      onVersionRestore?.(versionId);
      toast({
        title: "Version Restored",
        description: `Successfully restored to ${version.versionNumber}`,
      });
    }
  };

  const handleCreateBranch = (branchData: any) => {
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: branchData.name,
      description: branchData.description,
      author: 'Current User',
      createdAt: new Date(),
      lastCommit: new Date(),
      status: 'active',
      ahead: 0,
      behind: 0
    };
    
    setBranches(prev => [...prev, newBranch]);
    onBranchCreate?.(branchData);
    setIsCreateBranchDialogOpen(false);
    toast({
      title: "Branch Created",
      description: `New branch "${branchData.name}" created successfully`,
    });
  };

  const handleMergeBranch = (branchId: string) => {
    setBranches(prev => 
      prev.map(branch => 
        branch.id === branchId 
          ? { ...branch, status: 'merged' as const }
          : branch
      )
    );
    toast({
      title: "Branch Merged",
      description: "Branch has been successfully merged to main",
    });
  };

  const getVersionStatusColor = (status: Version['status']) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBranchStatusColor = (status: Branch['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'merged': return 'bg-blue-100 text-blue-800';
      case 'abandoned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Version Control</h2>
          <p className="text-muted-foreground">Manage content versions, branches, and collaboration</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateBranchDialogOpen} onOpenChange={setIsCreateBranchDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <GitBranch className="h-4 w-4 mr-2" />
                New Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateBranch({
                  name: formData.get('name'),
                  description: formData.get('description'),
                  fromBranch: formData.get('fromBranch')
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Branch Name</Label>
                    <Input name="name" placeholder="feature/new-feature" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea name="description" placeholder="Describe what this branch is for..." />
                  </div>
                  <div>
                    <Label htmlFor="fromBranch">Create from</Label>
                    <Select name="fromBranch" defaultValue="main">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.filter(b => b.status === 'active').map(branch => (
                          <SelectItem key={branch.id} value={branch.name}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Create Branch</Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreateBranchDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Version Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagName">Tag Name</Label>
                  <Input placeholder="v2.1.0" />
                </div>
                <div>
                  <Label htmlFor="tagMessage">Message</Label>
                  <Textarea placeholder="Release notes or tag message..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Create Tag</Button>
                  <Button variant="outline" onClick={() => setIsCreateTagDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Version
          </Button>
        </div>
      </div>

      {/* Version Control Tabs */}
      <Tabs defaultValue="versions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
          <TabsTrigger value="branches">Branches ({branches.filter(b => b.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-4">
          {/* Branch Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Label>Current Branch:</Label>
                  <Select value={currentBranch} onValueChange={setCurrentBranch}>
                    <SelectTrigger className="w-[200px]">
                      <GitBranch className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {versions.filter(v => v.branch === currentBranch).length} versions
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Timeline */}
          <div className="space-y-4">
            {versions
              .filter(v => v.branch === currentBranch)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((version, index) => (
                <Card key={version.id} className={`${selectedVersion === version.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${version.isMajor ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            {version.isMajor ? 
                              <GitCommit className="h-5 w-5 text-blue-600" /> :
                              <GitCommit className="h-5 w-5 text-gray-600" />
                            }
                          </div>
                          {index < versions.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-2" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{version.title}</h3>
                            <Badge className={getVersionStatusColor(version.status)}>
                              {version.status}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-sm">
                              {version.versionNumber}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-3">{version.description}</p>
                          
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={version.author.avatar} />
                                <AvatarFallback>{version.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{version.author.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{version.createdAt.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-green-600">+{version.changes.added}</span>
                              <span className="text-red-600">-{version.changes.removed}</span>
                              <span className="text-blue-600">~{version.changes.modified}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            {version.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(version.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDiffView({ oldVersion: version.id, newVersion: versions[0].id })}
                        >
                          <Code2 className="h-4 w-4 mr-1" />
                          Compare
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVersionRestore(version.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <div className="grid gap-4">
            {branches.map((branch) => (
              <Card key={branch.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${getBranchStatusColor(branch.status)}`}>
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{branch.name}</h3>
                        <p className="text-muted-foreground">{branch.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{branch.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Created {branch.createdAt.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Last commit {branch.lastCommit.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        <div className="text-green-600">↑ {branch.ahead} ahead</div>
                        <div className="text-red-600">↓ {branch.behind} behind</div>
                      </div>
                      <Badge className={getBranchStatusColor(branch.status)}>
                        {branch.status}
                      </Badge>
                      {branch.status === 'active' && branch.name !== 'main' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMergeBranch(branch.id)}
                        >
                          <GitMerge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Compare from</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.versionNumber} - {version.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compare to</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map(version => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.versionNumber} - {version.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Show Differences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <GitCommit className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{versions.length}</div>
                <div className="text-sm text-muted-foreground">Total Versions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <GitBranch className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{branches.filter(b => b.status === 'active').length}</div>
                <div className="text-sm text-muted-foreground">Active Branches</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <GitMerge className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{branches.filter(b => b.status === 'merged').length}</div>
                <div className="text-sm text-muted-foreground">Merged Branches</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};