import { supabase } from '@/integrations/supabase/client';

interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'message' | 'operation' | 'page_view' | 'click' | 'scroll';
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
  metadata: any;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
}

class RealSessionRecordingService {
  private static instance: RealSessionRecordingService;
  private isRecording = false;
  private currentSession: string | null = null;
  private recordingStartTime = 0;
  private eventsBuffer: SessionEvent[] = [];
  private eventFlushInterval?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): RealSessionRecordingService {
    if (!RealSessionRecordingService.instance) {
      RealSessionRecordingService.instance = new RealSessionRecordingService();
    }
    return RealSessionRecordingService.instance;
  }

  async startRecording(sessionId: string, teamId: string, name?: string): Promise<{ success: boolean; recordingId?: string; error?: string }> {
    try {
      if (this.isRecording) {
        return { success: false, error: 'Recording already in progress' };
      }

      const recordingName = name || `Session ${new Date().toLocaleString()}`;
      
      // Create recording record in database
      const { data, error } = await supabase
        .from('session_recordings')
        .insert([{
          session_id: sessionId,
          recorded_by: 'system',
          recording_name: recordingName,
          duration_seconds: 0,
          file_size: 0,
          metadata: JSON.parse(JSON.stringify({
            status: 'recording',
            events: [],
            participants: []
          }))
        }])
        .select()
        .single();

      if (error) {
        console.error('Failed to create recording:', error);
        return { success: false, error: 'Failed to start recording' };
      }

      this.isRecording = true;
      this.currentSession = data.id;
      this.recordingStartTime = Date.now();
      this.eventsBuffer = [];

      // Set up DOM event listeners
      this.setupEventListeners();

      // Start flushing events periodically
      this.eventFlushInterval = setInterval(() => {
        this.flushEvents();
      }, 5000);

      return { success: true, recordingId: data.id };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { success: false, error: 'Failed to start recording' };
    }
  }

  async stopRecording(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isRecording || !this.currentSession) {
        return { success: false, error: 'No recording in progress' };
      }

      // Flush any remaining events
      await this.flushEvents();

      // Calculate final duration
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

      // Update recording status
      const { error } = await supabase
        .from('session_recordings')
        .update({
          status: 'active',
          duration,
          file_size: JSON.stringify(this.eventsBuffer).length
        })
        .eq('id', this.currentSession);

      if (error) {
        console.error('Failed to finalize recording:', error);
      }

      this.cleanup();
      return { success: true };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { success: false, error: 'Failed to stop recording' };
    }
  }

  async pauseRecording(): Promise<{ success: boolean; error?: string }> {
    if (!this.isRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    // Stop event collection but keep session active
    this.removeEventListeners();
    if (this.eventFlushInterval) {
      clearInterval(this.eventFlushInterval);
    }

    return { success: true };
  }

  async resumeRecording(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'No session to resume' };
    }

    this.setupEventListeners();
    this.eventFlushInterval = setInterval(() => {
      this.flushEvents();
    }, 5000);

    return { success: true };
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Page visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Mouse movements and clicks
    document.addEventListener('click', this.handleClick);
    document.addEventListener('scroll', this.handleScroll);

    // Form interactions
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);

    // Keyboard events (for non-sensitive data)
    document.addEventListener('keydown', this.handleKeyDown);

    // Window events
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private removeEventListeners() {
    if (typeof window === 'undefined') return;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleVisibilityChange = () => {
    this.recordEvent('page_view', {
      visible: !document.hidden,
      url: window.location.href
    });
  };

  private handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    this.recordEvent('click', {
      x: event.clientX,
      y: event.clientY,
      target: {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.slice(0, 100) // Limit text content
      }
    });
  };

  private handleScroll = () => {
    this.recordEvent('scroll', {
      scrollX: window.scrollX,
      scrollY: window.scrollY
    });
  };

  private handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    this.recordEvent('edit', {
      type: 'focus_in',
      target: {
        tagName: target.tagName,
        type: target.getAttribute('type'),
        name: target.getAttribute('name'),
        id: target.id
      }
    });
  };

  private handleFocusOut = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    this.recordEvent('edit', {
      type: 'focus_out',
      target: {
        tagName: target.tagName,
        type: target.getAttribute('type'),
        name: target.getAttribute('name'),
        id: target.id
      }
    });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    // Only record non-sensitive key events
    if (event.target instanceof HTMLInputElement && 
        (event.target.type === 'password' || event.target.type === 'email')) {
      return;
    }

    this.recordEvent('edit', {
      type: 'keydown',
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    });
  };

  private handleResize = () => {
    this.recordEvent('operation', {
      type: 'window_resize',
      width: window.innerWidth,
      height: window.innerHeight
    });
  };

  private handleBeforeUnload = () => {
    this.recordEvent('leave', {
      url: window.location.href,
      timestamp: Date.now()
    });
    this.flushEvents();
  };

  private recordEvent(type: SessionEvent['type'], data: any) {
    if (!this.isRecording) return;

    const event: SessionEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now() - this.recordingStartTime,
      type,
      userId: this.getCurrentUserId() || 'anonymous',
      data,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    this.eventsBuffer.push(event);

    // Limit buffer size
    if (this.eventsBuffer.length > 1000) {
      this.eventsBuffer = this.eventsBuffer.slice(-1000);
    }
  }

  private async flushEvents() {
    if (!this.currentSession || this.eventsBuffer.length === 0) return;

    const eventsToFlush = [...this.eventsBuffer];
    this.eventsBuffer = [];

    try {
      // Get current recording
      const { data: recording, error: fetchError } = await supabase
        .from('session_recordings')
        .select('metadata')
        .eq('id', this.currentSession)
        .single();

      if (fetchError) {
        console.error('Failed to fetch current recording:', fetchError);
        // Put events back in buffer
        this.eventsBuffer.unshift(...eventsToFlush);
        return;
      }

      const metadata = recording.metadata as any || {};
      const currentEvents = metadata.events || [];
      const updatedEvents = [...currentEvents, ...eventsToFlush];

      // Update recording with new events
      const { error } = await supabase
        .from('session_recordings')
        .update({
          metadata: JSON.parse(JSON.stringify({
            ...metadata,
            events: updatedEvents
          })),
          file_size: JSON.stringify(updatedEvents).length,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentSession);

      if (error) {
        console.error('Failed to flush events:', error);
        // Put events back in buffer for retry
        this.eventsBuffer.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Error flushing events:', error);
      // Put events back in buffer for retry
      this.eventsBuffer.unshift(...eventsToFlush);
    }
  }

  private getCurrentUserId(): string | null {
    // This would typically be provided by the auth context
    // For now, get from localStorage or session storage
    return localStorage.getItem('supabase.auth.token') ? 'current_user' : null;
  }

  private cleanup() {
    this.isRecording = false;
    this.currentSession = null;
    this.recordingStartTime = 0;
    this.eventsBuffer = [];
    
    if (this.eventFlushInterval) {
      clearInterval(this.eventFlushInterval);
      this.eventFlushInterval = undefined;
    }
    
    this.removeEventListeners();
  }

  // Public methods for retrieving recordings
  async getRecordings(teamId: string, limit = 50): Promise<SessionRecording[]> {
    try {
      const { data, error } = await supabase
        .from('session_recordings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get recordings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recordings:', error);
      return [];
    }
  }

  async getRecording(recordingId: string): Promise<SessionRecording | null> {
    try {
      const { data, error } = await supabase
        .from('session_recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (error) {
        console.error('Failed to get recording:', error);
        return null;
      }

      if (!data) return null;

      return data;
    } catch (error) {
      console.error('Error getting recording:', error);
      return null;
    }
  }

  async deleteRecording(recordingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('session_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) {
        console.error('Failed to delete recording:', error);
        return { success: false, error: 'Failed to delete recording' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting recording:', error);
      return { success: false, error: 'Failed to delete recording' };
    }
  }

  async exportRecording(recordingId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const recording = await this.getRecording(recordingId);
      if (!recording) {
        return { success: false, error: 'Recording not found' };
      }

      const exportData = {
        recording,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        format: 'session-recording'
      };

      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error exporting recording:', error);
      return { success: false, error: 'Failed to export recording' };
    }
  }

  getRecordingStatus(): { isRecording: boolean; currentSession: string | null; duration: number } {
    return {
      isRecording: this.isRecording,
      currentSession: this.currentSession,
      duration: this.isRecording ? Math.floor((Date.now() - this.recordingStartTime) / 1000) : 0
    };
  }
}

export const realSessionRecordingService = RealSessionRecordingService.getInstance();
export type { SessionEvent, SessionRecording };
