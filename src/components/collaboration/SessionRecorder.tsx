import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Download,
  Upload,
  Clock,
  Users,
  Activity
} from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'message' | 'operation';
  userId: string;
  data: any;
  metadata?: Record<string, any>;
}

interface SessionRecording {
  id: string;
  session_id: string;
  recording_name: string | null;
  duration_seconds: number | null;
  recorded_by: string;
  file_size: number | null;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  metadata: any;
}

export const SessionRecorder: React.FC<{
  teamId: string;
  sessionId?: string;
  className?: string;
}> = ({ teamId, sessionId, className = '' }) => {
  const { state } = useCollaboration();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<SessionRecording | null>(null);
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  
  const eventsRef = useRef<SessionEvent[]>([]);
  const recordingStartTime = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout>();
  const playbackIntervalRef = useRef<NodeJS.Timeout>();

  // Load previous recordings
  useEffect(() => {
    loadRecordings();
  }, [teamId]);

  // Monitor collaboration events for recording
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const handleEvent = (event: SessionEvent) => {
      eventsRef.current.push({
        ...event,
        timestamp: Date.now() - recordingStartTime.current
      });
    };

    // Monitor state changes for recording
    const interval = setInterval(() => {
      if (state.operations.length > 0) {
        state.operations.forEach(operation => {
          handleEvent({
            id: `event-${Date.now()}-${Math.random()}`,
            timestamp: Date.now() - recordingStartTime.current,
            type: 'operation',
            userId: operation.userId,
            data: operation
          });
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused, state.operations]);

  const loadRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('session_recordings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedRecordings: SessionRecording[] = data || [];

      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: "Error",
        description: "Failed to load session recordings.",
        variant: "destructive"
      });
    }
  };

  const startRecording = useCallback(() => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "No active session to record.",
        variant: "destructive"
      });
      return;
    }

    setIsRecording(true);
    setIsPaused(false);
    recordingStartTime.current = Date.now();
    eventsRef.current = [];
    setRecordingDuration(0);

    // Start duration timer
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    toast({
      title: "Recording Started",
      description: "Session recording has begun.",
    });
  }, [sessionId, toast]);

  const pauseRecording = useCallback(() => {
    setIsPaused(!isPaused);
    
    if (isPaused) {
      // Resume
      if (durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      }
    } else {
      // Pause
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    toast({
      title: isPaused ? "Recording Resumed" : "Recording Paused",
      description: `Session recording ${isPaused ? 'resumed' : 'paused'}.`,
    });
  }, [isPaused, toast]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsPaused(false);
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    try {
      // Save to database
      const { error } = await supabase
        .from('session_recordings')
        .insert([{
          session_id: sessionId!,
          recorded_by: state.participants.find(p => p.user_id === state.participants[0]?.user_id)?.user_id || 'unknown',
          recording_name: `Session ${new Date().toLocaleString()}`,
          duration_seconds: recordingDuration,
          file_size: JSON.stringify(eventsRef.current).length,
          metadata: JSON.parse(JSON.stringify({
            events: eventsRef.current,
            participants: state.participants.map(p => p.user_id)
          }))
        }]);

      if (error) throw error;

      await loadRecordings();

      toast({
        title: "Recording Saved",
        description: `Session recording saved with ${eventsRef.current.length} events.`,
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Error",
        description: "Failed to save session recording.",
        variant: "destructive"
      });
    }
  }, [isRecording, recordingDuration, sessionId, teamId, state.participants, toast]);

  const playRecording = useCallback((recording: SessionRecording) => {
    setCurrentRecording(recording);
    setIsPlaying(true);
    setPlaybackPosition(0);

    // Simulate playback
    let currentTime = 0;
    playbackIntervalRef.current = setInterval(() => {
      currentTime += 100; // 100ms increments
      setPlaybackPosition(currentTime);

      // Process events at current time
      const events = (recording.metadata as any)?.events || [];
      const eventsAtTime = events.filter(
        (event: any) => event.timestamp >= currentTime - 100 && event.timestamp < currentTime
      );

      eventsAtTime.forEach(event => {
        // Apply event visualization or notifications
        console.log('Playback event:', event);
      });

      const totalDuration = (recording.duration_seconds || 0) * 1000;
      if (currentTime >= totalDuration) {
        setIsPlaying(false);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      }
    }, 100);
  }, []);

  const pausePlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  }, []);

  const seekPlayback = useCallback((position: number) => {
    setPlaybackPosition(position);
  }, []);

  const exportRecording = useCallback(async (recording: SessionRecording) => {
    try {
      const exportData = {
        recording,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-recording-${recording.id}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Recording exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting recording:', error);
      toast({
        title: "Export Error",
        description: "Failed to export recording.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Recorder
            {isRecording && (
              <Badge variant={isPaused ? 'secondary' : 'destructive'}>
                {isPaused ? 'Paused' : 'Recording'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Recording Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-mono">
                  {formatDuration(recordingDuration)}
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-sm text-muted-foreground">
                      {eventsRef.current.length} events captured
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button onClick={startRecording} disabled={!sessionId}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button onClick={pauseRecording} variant="outline">
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button onClick={stopRecording} variant="destructive">
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Current Session Info */}
            {sessionId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {state.participants.length} participants
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {state.operations.length} operations
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Playback Controls */}
      {currentRecording && (
        <Card>
        <CardHeader>
          <CardTitle>Playback: {currentRecording.recording_name || 'Untitled Recording'}</CardTitle>
        </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => isPlaying ? pausePlayback() : playRecording(currentRecording)}
                  variant="outline"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  onClick={() => seekPlayback(Math.max(0, playbackPosition - 10000))}
                  variant="outline"
                  size="sm"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => seekPlayback(Math.min((currentRecording.duration_seconds || 0) * 1000, playbackPosition + 10000))}
                  variant="outline"
                  size="sm"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                  <Progress 
                    value={(playbackPosition / ((currentRecording.duration_seconds || 0) * 1000)) * 100} 
                    className="cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      seekPlayback(percentage * (currentRecording.duration_seconds || 0) * 1000);
                    }}
                  />
                </div>

                <div className="text-sm font-mono">
                  {formatDuration(Math.floor(playbackPosition / 1000))} / {formatDuration(currentRecording.duration_seconds || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recordings.map(recording => (
              <div key={recording.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{recording.recording_name || 'Untitled Recording'}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDuration(recording.duration_seconds || 0)} • {(recording.metadata as any)?.events?.length || 0} events • {(recording.metadata as any)?.participants?.length || 0} participants
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(recording.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => playRecording(recording)}
                    variant="outline"
                    size="sm"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => exportRecording(recording)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {recordings.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No recordings found. Start a session recording to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};