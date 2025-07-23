import { Project, ProjectStatus, ProjectPriority, ThreatLevel } from '@/types/projects';

// Calculate project progress percentage
export function calculateProjectProgress(project: Project): number {
  if (!project.startDate || !project.targetEndDate) return 0;
  
  const now = new Date();
  const start = new Date(project.startDate);
  const end = new Date(project.targetEndDate);
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  
  return Math.round((elapsed / totalDuration) * 100);
}

// Calculate project performance score
export function calculateProjectPerformanceScore(project: Project): number {
  let score = 0;
  let factors = 0;
  
  // Factor 1: Progress vs timeline (30%)
  if (project.startDate && project.targetEndDate) {
    const progress = calculateProjectProgress(project);
    const timeProgress = calculateTimeProgress(project.startDate, project.targetEndDate);
    
    if (progress >= timeProgress) {
      score += 30;
    } else {
      score += (progress / timeProgress) * 30;
    }
    factors += 30;
  }
  
  // Factor 2: Competitor analysis coverage (25%)
  if (project.competitorCount !== undefined) {
    const competitorScore = Math.min(project.competitorCount * 5, 25);
    score += competitorScore;
    factors += 25;
  }
  
  // Factor 3: Analysis frequency (20%)
  if (project.analysisCount !== undefined) {
    const analysisScore = Math.min(project.analysisCount * 2, 20);
    score += analysisScore;
    factors += 20;
  }
  
  // Factor 4: Team engagement (15%)
  if (project.teamMemberCount !== undefined) {
    const teamScore = Math.min(project.teamMemberCount * 3, 15);
    score += teamScore;
    factors += 15;
  }
  
  // Factor 5: Recent activity (10%)
  if (project.lastActivityDate) {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(project.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity <= 1) score += 10;
    else if (daysSinceActivity <= 7) score += 7;
    else if (daysSinceActivity <= 30) score += 5;
    
    factors += 10;
  }
  
  return factors > 0 ? Math.round(score) : 0;
}

// Calculate time progress percentage
function calculateTimeProgress(startDate: Date, endDate: Date): number {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  
  return (elapsed / totalDuration) * 100;
}

// Format project status for display
export function formatProjectStatus(status: ProjectStatus): string {
  const statusMap: Record<ProjectStatus, string> = {
    planning: 'Planning',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
    cancelled: 'Cancelled'
  };
  
  return statusMap[status] || status;
}

// Get status color class
export function getStatusColorClass(status: ProjectStatus): string {
  const colorMap: Record<ProjectStatus, string> = {
    planning: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

// Get priority color class
export function getPriorityColorClass(priority: ProjectPriority): string {
  const colorMap: Record<ProjectPriority, string> = {
    low: 'text-gray-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500'
  };
  
  return colorMap[priority] || 'text-gray-500';
}

// Get threat level color class
export function getThreatLevelColorClass(threatLevel: ThreatLevel): string {
  const colorMap: Record<ThreatLevel, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };
  
  return colorMap[threatLevel] || 'bg-gray-100 text-gray-800';
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Generate project slug
export function generateProjectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Check if project is overdue
export function isProjectOverdue(project: Project): boolean {
  if (!project.targetEndDate || project.status === 'completed') return false;
  
  const now = new Date();
  const targetEnd = new Date(project.targetEndDate);
  
  return now > targetEnd;
}

// Get project health status
export function getProjectHealthStatus(project: Project): 'excellent' | 'good' | 'warning' | 'critical' {
  const performanceScore = calculateProjectPerformanceScore(project);
  
  if (performanceScore >= 80) return 'excellent';
  if (performanceScore >= 60) return 'good';
  if (performanceScore >= 40) return 'warning';
  return 'critical';
}