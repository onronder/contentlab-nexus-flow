import { Project } from '@/types/projects';

/**
 * Export utility functions for project data
 */

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeFields?: string[];
  excludeFields?: string[];
}

/**
 * Export projects to CSV format
 */
export function exportProjectsToCSV(projects: Project[]): string {
  const headers = [
    'ID',
    'Name',
    'Description',
    'Industry',
    'Project Type',
    'Status',
    'Priority',
    'Start Date',
    'Target End Date',
    'Created Date',
    'Team Members',
    'Competitors',
    'Tags'
  ];

  const csvContent = [
    headers.join(','),
    ...projects.map(project => [
      project.id,
      `"${project.name}"`,
      `"${project.description}"`,
      project.industry,
      project.projectType,
      project.status,
      project.priority,
      project.startDate?.toISOString().split('T')[0] || '',
      project.targetEndDate?.toISOString().split('T')[0] || '',
      project.createdAt.toISOString().split('T')[0],
      project.teamMemberCount,
      project.competitorCount,
      `"${project.tags.join(', ')}"`
    ].join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Export projects to JSON format
 */
export function exportProjectsToJSON(projects: Project[]): string {
  return JSON.stringify(projects, null, 2);
}

/**
 * Download exported data as file
 */
export function downloadExport(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export selected projects with options
 */
export function exportProjects(
  projects: Project[], 
  options: ExportOptions = { format: 'csv' }
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (options.format) {
    case 'csv': {
      const csvContent = exportProjectsToCSV(projects);
      downloadExport(csvContent, `projects-export-${timestamp}.csv`, 'text/csv');
      break;
    }
    case 'json': {
      const jsonContent = exportProjectsToJSON(projects);
      downloadExport(jsonContent, `projects-export-${timestamp}.json`, 'application/json');
      break;
    }
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Export single project with detailed data
 */
export function exportProjectDetails(project: Project): void {
  const detailedData = {
    ...project,
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0'
  };
  
  const jsonContent = JSON.stringify(detailedData, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  
  downloadExport(
    jsonContent, 
    `project-${project.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`, 
    'application/json'
  );
}