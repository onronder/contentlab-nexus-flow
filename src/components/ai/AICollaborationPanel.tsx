import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAICollaborationAssistant } from '@/hooks/useAICollaborationAssistant';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Lightbulb, 
  FileText, 
  Palette,
  CheckSquare,
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface AICollaborationPanelProps {
  sessionId: string;
  className?: string;
}

const suggestionTypeConfig = {
  content_improvement: {
    icon: FileText,
    label: 'Content Improvement',
    description: 'Enhance clarity, readability, and engagement',
    color: 'blue'
  },
  conflict_resolution: {
    icon: MessageSquare,
    label: 'Conflict Resolution',
    description: 'Resolve collaborative editing conflicts',
    color: 'amber'
  },
  style_suggestion: {
    icon: Palette,
    label: 'Style Enhancement',
    description: 'Improve tone, voice, and writing style',
    color: 'purple'
  },
  grammar_check: {
    icon: CheckSquare,
    label: 'Grammar Check',
    description: 'Fix grammar, spelling, and language issues',
    color: 'green'
  },
  context_enhancement: {
    icon: Lightbulb,
    label: 'Context Enhancement',
    description: 'Add relevant information and structure',
    color: 'orange'
  }
};

export const AICollaborationPanel: React.FC<AICollaborationPanelProps> = ({
  sessionId,
  className
}) => {
  const [inputContent, setInputContent] = useState('');
  const [selectedSuggestionType, setSelectedSuggestionType] = useState<keyof typeof suggestionTypeConfig>('content_improvement');

  const {
    suggestions,
    pendingSuggestions,
    highConfidenceSuggestions,
    isLoadingSuggestions,
    isProcessing,
    generateSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    ignoreSuggestion,
    getSuggestionsByType,
    error
  } = useAICollaborationAssistant({ sessionId });

  const handleGenerateSuggestion = async () => {
    if (!inputContent.trim()) return;
    
    await generateSuggestion(inputContent, selectedSuggestionType);
    setInputContent('');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'ignored': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Alert className={className}>
        <AlertDescription>
          Failed to load AI collaboration features: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Collaboration Assistant
        </CardTitle>
        <CardDescription>
          Get intelligent suggestions to improve your collaborative content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="suggestions">
              Suggestions
              {pendingSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Suggestion Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(suggestionTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key}
                        variant={selectedSuggestionType === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSuggestionType(key as keyof typeof suggestionTypeConfig)}
                        className="justify-start h-auto p-3"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs opacity-70">{config.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="content-input" className="text-sm font-medium mb-2 block">
                  Content to Analyze
                </label>
                <Textarea
                  id="content-input"
                  placeholder="Paste your content here for AI analysis and suggestions..."
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button 
                onClick={handleGenerateSuggestion}
                disabled={!inputContent.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Generating Suggestion...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Suggestion
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner className="w-6 h-6" />
              </div>
            ) : pendingSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending suggestions</p>
                <p className="text-sm">Generate content analysis to see AI suggestions here</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {pendingSuggestions.map((suggestion) => {
                    const config = suggestionTypeConfig[suggestion.suggestion_type as keyof typeof suggestionTypeConfig];
                    const Icon = config?.icon || Brain;
                    
                    return (
                      <Card key={suggestion.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <Badge variant="outline">
                              {config?.label || suggestion.suggestion_type}
                            </Badge>
                            <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence_score)}`}>
                              {Math.round(suggestion.confidence_score * 100)}% confident
                            </span>
                          </div>
                          <Badge className={getStatusColor(suggestion.status)}>
                            {suggestion.status}
                          </Badge>
                        </div>

                        {suggestion.original_content && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Original:</p>
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              {suggestion.original_content.substring(0, 200)}
                              {suggestion.original_content.length > 200 && '...'}
                            </p>
                          </div>
                        )}

                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">AI Suggestion:</p>
                          <p className="text-sm bg-blue-50 border border-blue-200 p-3 rounded">
                            {suggestion.suggested_content}
                          </p>
                        </div>

                        {suggestion.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => acceptSuggestion(suggestion.id)}
                              className="flex-1"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => rejectSuggestion(suggestion.id)}
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => ignoreSuggestion(suggestion.id)}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner className="w-6 h-6" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No suggestion history</p>
                <p className="text-sm">Your AI suggestion history will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {suggestions.map((suggestion) => {
                    const config = suggestionTypeConfig[suggestion.suggestion_type as keyof typeof suggestionTypeConfig];
                    const Icon = config?.icon || Brain;
                    
                    return (
                      <Card key={suggestion.id} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {config?.label || suggestion.suggestion_type}
                            </span>
                            <span className={`text-xs ${getConfidenceColor(suggestion.confidence_score)}`}>
                              {Math.round(suggestion.confidence_score * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(suggestion.status)}>
                              {suggestion.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {suggestion.suggested_content.substring(0, 100)}
                          {suggestion.suggested_content.length > 100 && '...'}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {highConfidenceSuggestions.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Sparkles className="w-4 h-4" />
              <span>{highConfidenceSuggestions.length} high-confidence suggestion(s) available</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};