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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  MessageCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Settings,
  Plus,
  Send,
  Eye,
  Edit,
  RotateCcw,
  GitCommit,
  FileText,
  Users,
  Bell,
  Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReviewStage {
  id: string;
  name: string;
  description: string;
  order: number;
  requiredApprovals: number;
  assignedReviewers: string[];
  status: 'pending' | 'in-progress' | 'approved' | 'rejected' | 'skipped';
  deadline?: Date;
  completedAt?: Date;
  isOptional: boolean;
}

interface ReviewComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  type: 'general' | 'suggestion' | 'issue' | 'approval' | 'rejection';
  rating?: number;
  createdAt: Date;
  isResolved: boolean;
  replies: ReviewComment[];
}

interface ReviewWorkflow {
  id: string;
  contentId: string;
  title: string;
  description: string;
  status: 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'published';
  currentStage: number;
  stages: ReviewStage[];
  submittedBy: string;
  submittedAt: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  compliance: {
    required: boolean;
    checklistItems: string[];
    completedItems: string[];
  };
}

interface ContentReviewWorkflowProps {
  contentId: string;
  onWorkflowUpdate?: (workflow: ReviewWorkflow) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

export const ContentReviewWorkflow: React.FC<ContentReviewWorkflowProps> = ({
  contentId,
  onWorkflowUpdate,
  currentUser = { id: 'user1', name: 'Current User', role: 'reviewer' }
}) => {
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<ReviewWorkflow | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<ReviewComment['type']>('general');
  const [rating, setRating] = useState(0);
  const [isCreateWorkflowDialogOpen, setIsCreateWorkflowDialogOpen] = useState(false);

  // Sample workflow data
  useEffect(() => {
    const sampleWorkflow: ReviewWorkflow = {
      id: 'workflow-1',
      contentId,
      title: 'Competitive Analysis Q1 2024',
      description: 'Comprehensive competitive analysis document for Q1 2024 strategic planning',
      status: 'in-review',
      currentStage: 1,
      submittedBy: 'john-doe',
      submittedAt: new Date('2024-01-15T09:00:00'),
      deadline: new Date('2024-01-25T17:00:00'),
      priority: 'high',
      tags: ['competitive-analysis', 'q1-2024', 'strategic'],
      compliance: {
        required: true,
        checklistItems: [
          'Data sources verified',
          'Competitive metrics validated',
          'Legal review completed',
          'Stakeholder approval obtained'
        ],
        completedItems: ['Data sources verified', 'Competitive metrics validated']
      },
      stages: [
        {
          id: 'stage-1',
          name: 'Content Review',
          description: 'Initial content review for accuracy and completeness',
          order: 1,
          requiredApprovals: 2,
          assignedReviewers: ['reviewer-1', 'reviewer-2'],
          status: 'in-progress',
          deadline: new Date('2024-01-20T17:00:00'),
          isOptional: false
        },
        {
          id: 'stage-2',
          name: 'Legal Review',
          description: 'Legal and compliance review',
          order: 2,
          requiredApprovals: 1,
          assignedReviewers: ['legal-reviewer'],
          status: 'pending',
          deadline: new Date('2024-01-23T17:00:00'),
          isOptional: false
        },
        {
          id: 'stage-3',
          name: 'Final Approval',
          description: 'Final stakeholder approval',
          order: 3,
          requiredApprovals: 1,
          assignedReviewers: ['stakeholder-1'],
          status: 'pending',
          deadline: new Date('2024-01-25T17:00:00'),
          isOptional: false
        }
      ]
    };

    const sampleComments: ReviewComment[] = [
      {
        id: 'comment-1',
        author: { id: 'reviewer-1', name: 'Sarah Wilson', role: 'Senior Analyst', avatar: '/api/placeholder/32/32' },
        content: 'The competitive landscape analysis is comprehensive, but I think we should include more recent market data from Q4 2023.',
        type: 'suggestion',
        rating: 4,
        createdAt: new Date('2024-01-16T10:30:00'),
        isResolved: false,
        replies: [
          {
            id: 'reply-1',
            author: { id: 'author-1', name: 'John Doe', role: 'Content Creator', avatar: '/api/placeholder/32/32' },
            content: 'Good point! I\'ll update the analysis with the latest Q4 data. Should be ready by tomorrow.',
            type: 'general',
            createdAt: new Date('2024-01-16T14:20:00'),
            isResolved: false,
            replies: []
          }
        ]
      },
      {
        id: 'comment-2',
        author: { id: 'reviewer-2', name: 'Mike Johnson', role: 'Market Research Lead', avatar: '/api/placeholder/32/32' },
        content: 'Excellent work on the competitor pricing analysis. The visualizations are clear and actionable.',
        type: 'approval',
        rating: 5,
        createdAt: new Date('2024-01-17T09:15:00'),
        isResolved: true,
        replies: []
      },
      {
        id: 'comment-3',
        author: { id: 'reviewer-1', name: 'Sarah Wilson', role: 'Senior Analyst', avatar: '/api/placeholder/32/32' },
        content: 'There might be an issue with the market share calculation on page 12. The numbers don\'t seem to add up to 100%.',
        type: 'issue',
        createdAt: new Date('2024-01-17T15:45:00'),
        isResolved: false,
        replies: []
      }
    ];

    setWorkflow(sampleWorkflow);
    setComments(sampleComments);
  }, [contentId]);

  const handleStageAction = (stageId: string, action: 'approve' | 'reject' | 'skip') => {
    if (!workflow) return;

    const updatedStages = workflow.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          status: action === 'approve' ? 'approved' as const : 
                  action === 'reject' ? 'rejected' as const : 'skipped' as const,
          completedAt: new Date()
        };
      }
      return stage;
    });

    const updatedWorkflow = { ...workflow, stages: updatedStages };
    setWorkflow(updatedWorkflow);
    onWorkflowUpdate?.(updatedWorkflow);

    toast({
      title: `Stage ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Skipped'}`,
      description: `Review stage has been ${action}d successfully.`,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: ReviewComment = {
      id: `comment-${Date.now()}`,
      author: { 
        id: currentUser.id, 
        name: currentUser.name, 
        role: currentUser.role,
        avatar: '/api/placeholder/32/32'
      },
      content: newComment,
      type: selectedCommentType,
      rating: selectedCommentType === 'approval' ? rating : undefined,
      createdAt: new Date(),
      isResolved: false,
      replies: []
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setRating(0);

    toast({
      title: "Comment Added",
      description: "Your review comment has been posted.",
    });
  };

  const getStatusColor = (status: ReviewWorkflow['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'in-review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'published': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageStatusIcon = (status: ReviewStage['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in-progress': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-gray-400" />;
      case 'skipped': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCommentTypeIcon = (type: ReviewComment['type']) => {
    switch (type) {
      case 'approval': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'rejection': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      case 'issue': return <Flag className="h-4 w-4 text-red-500" />;
      case 'suggestion': return <MessageCircle className="h-4 w-4 text-blue-500" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculateProgress = () => {
    if (!workflow) return 0;
    const completedStages = workflow.stages.filter(s => s.status === 'approved').length;
    return (completedStages / workflow.stages.length) * 100;
  };

  if (!workflow) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Review Workflow</h3>
            <p className="text-muted-foreground mb-4">Create a review workflow to start the approval process.</p>
            <Button onClick={() => setIsCreateWorkflowDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{workflow.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{workflow.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(workflow.status)}>
                {workflow.status.replace('-', ' ')}
              </Badge>
              <Badge variant="outline" className={`${
                workflow.priority === 'urgent' ? 'border-red-500 text-red-500' :
                workflow.priority === 'high' ? 'border-orange-500 text-orange-500' :
                workflow.priority === 'medium' ? 'border-blue-500 text-blue-500' :
                'border-gray-500 text-gray-500'
              }`}>
                {workflow.priority} priority
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(calculateProgress())}% complete</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Submitted by:</span>
                <div className="font-medium">{workflow.submittedBy}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted:</span>
                <div className="font-medium">{workflow.submittedAt.toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Deadline:</span>
                <div className="font-medium">{workflow.deadline?.toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Stage:</span>
                <div className="font-medium">{workflow.currentStage} of {workflow.stages.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Workflow Tabs */}
      <Tabs defaultValue="stages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stages">Review Stages</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-4">
          <div className="space-y-4">
            {workflow.stages.map((stage, index) => (
              <Card key={stage.id} className={`${stage.status === 'in-progress' ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        {getStageStatusIcon(stage.status)}
                        {index < workflow.stages.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-2" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold">{stage.name}</h3>
                        <p className="text-muted-foreground">{stage.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{stage.assignedReviewers.length} reviewers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>{stage.requiredApprovals} approvals needed</span>
                          </div>
                          {stage.deadline && (
                            <div className="flex items-center gap-1">
                              <Timer className="h-4 w-4" />
                              <span>Due {stage.deadline.toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {stage.status === 'in-progress' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStageAction(stage.id, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStageAction(stage.id, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {stage.status === 'pending' && stage.isOptional && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStageAction(stage.id, 'skip')}
                        >
                          Skip
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {/* Add Comment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Review Comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comment Type</Label>
                  <Select value={selectedCommentType} onValueChange={(value: any) => setSelectedCommentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Comment</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="approval">Approval</SelectItem>
                      <SelectItem value="rejection">Rejection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedCommentType === 'approval' && (
                  <div>
                    <Label>Rating (1-5)</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-5 w-5 cursor-pointer ${
                            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Comment</Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter your review comments..."
                  className="min-h-[100px]"
                />
              </div>
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </Button>
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{comment.author.name}</span>
                        <Badge variant="outline" className="text-xs">{comment.author.role}</Badge>
                        {getCommentTypeIcon(comment.type)}
                        <span className="text-sm text-muted-foreground">
                          {comment.createdAt.toLocaleDateString()}
                        </span>
                        {comment.rating && (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= comment.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm mb-3">{comment.content}</p>
                      
                      {comment.replies.length > 0 && (
                        <div className="space-y-2 border-l-2 border-muted pl-4 ml-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={reply.author.avatar} />
                                <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{reply.author.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {reply.createdAt.toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                        {!comment.isResolved && (
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflow.compliance.checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${
                      workflow.compliance.completedItems.includes(item) 
                        ? 'text-green-500' 
                        : 'text-gray-300'
                    }`} />
                    <span className={
                      workflow.compliance.completedItems.includes(item) 
                        ? 'line-through text-muted-foreground' 
                        : ''
                    }>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Compliance Progress: {workflow.compliance.completedItems.length} of {workflow.compliance.checklistItems.length}
                </span>
                <Progress 
                  value={(workflow.compliance.completedItems.length / workflow.compliance.checklistItems.length) * 100} 
                  className="w-32 h-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">3.2 days</div>
                <div className="text-sm text-muted-foreground">Avg Review Time</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{comments.length}</div>
                <div className="text-sm text-muted-foreground">Total Comments</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{workflow.stages.filter(s => s.status === 'approved').length}</div>
                <div className="text-sm text-muted-foreground">Completed Stages</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};