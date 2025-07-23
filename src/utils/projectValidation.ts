import { ProjectCreationInput, ProjectUpdateInput, ProjectTeamMember, PermissionSet } from '@/types/projects';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Project name validation
export function validateProjectName(name: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Project name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Project name must be at least 2 characters long' });
  } else if (name.length > 200) {
    errors.push({ field: 'name', message: 'Project name cannot exceed 200 characters' });
  } else if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(name)) {
    errors.push({ field: 'name', message: 'Project name contains invalid characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Industry validation
export function validateIndustry(industry: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!industry || industry.trim().length === 0) {
    errors.push({ field: 'industry', message: 'Industry is required' });
  } else if (industry.length > 100) {
    errors.push({ field: 'industry', message: 'Industry cannot exceed 100 characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Date validation
export function validateProjectDates(startDate?: Date, targetEndDate?: Date): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (startDate && targetEndDate) {
    if (targetEndDate <= startDate) {
      errors.push({ 
        field: 'targetEndDate', 
        message: 'Target end date must be after start date' 
      });
    }
    
    // Check if dates are reasonable (not too far in the past or future)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const fiveYearsFromNow = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
    
    if (startDate < oneYearAgo) {
      errors.push({ 
        field: 'startDate', 
        message: 'Start date cannot be more than one year in the past' 
      });
    }
    
    if (targetEndDate > fiveYearsFromNow) {
      errors.push({ 
        field: 'targetEndDate', 
        message: 'Target end date cannot be more than five years in the future' 
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Objectives validation
export function validateObjectives(objectives: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!objectives || objectives.length === 0) {
    errors.push({ field: 'primaryObjectives', message: 'At least one objective is required' });
  } else {
    objectives.forEach((objective, index) => {
      if (!objective || objective.trim().length === 0) {
        errors.push({ 
          field: 'primaryObjectives', 
          message: `Objective ${index + 1} cannot be empty` 
        });
      } else if (objective.length > 500) {
        errors.push({ 
          field: 'primaryObjectives', 
          message: `Objective ${index + 1} cannot exceed 500 characters` 
        });
      }
    });
    
    if (objectives.length > 10) {
      errors.push({ 
        field: 'primaryObjectives', 
        message: 'Cannot have more than 10 objectives' 
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Complete project creation validation
export function validateProjectCreation(input: ProjectCreationInput): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // Validate individual fields
  const nameValidation = validateProjectName(input.name);
  const industryValidation = validateIndustry(input.industry);
  const datesValidation = validateProjectDates(input.startDate, input.targetEndDate);
  const objectivesValidation = validateObjectives(input.primaryObjectives);
  
  allErrors.push(...nameValidation.errors);
  allErrors.push(...industryValidation.errors);
  allErrors.push(...datesValidation.errors);
  allErrors.push(...objectivesValidation.errors);
  
  // Validate description length
  if (input.description && input.description.length > 2000) {
    allErrors.push({ 
      field: 'description', 
      message: 'Description cannot exceed 2000 characters' 
    });
  }
  
  // Validate target market
  if (input.targetMarket && input.targetMarket.length > 500) {
    allErrors.push({ 
      field: 'targetMarket', 
      message: 'Target market description cannot exceed 500 characters' 
    });
  }
  
  // Validate success metrics
  if (input.successMetrics && input.successMetrics.length > 10) {
    allErrors.push({ 
      field: 'successMetrics', 
      message: 'Cannot have more than 10 success metrics' 
    });
  }
  
  // Validate tags
  if (input.tags && input.tags.length > 20) {
    allErrors.push({ 
      field: 'tags', 
      message: 'Cannot have more than 20 tags' 
    });
  }
  
  input.tags?.forEach((tag, index) => {
    if (tag.length > 50) {
      allErrors.push({ 
        field: 'tags', 
        message: `Tag ${index + 1} cannot exceed 50 characters` 
      });
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

// Project update validation
export function validateProjectUpdate(input: ProjectUpdateInput): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // Only validate fields that are being updated
  if (input.name !== undefined) {
    const nameValidation = validateProjectName(input.name);
    allErrors.push(...nameValidation.errors);
  }
  
  if (input.industry !== undefined) {
    const industryValidation = validateIndustry(input.industry);
    allErrors.push(...industryValidation.errors);
  }
  
  if (input.startDate !== undefined || input.targetEndDate !== undefined) {
    const datesValidation = validateProjectDates(input.startDate, input.targetEndDate);
    allErrors.push(...datesValidation.errors);
  }
  
  if (input.primaryObjectives !== undefined) {
    const objectivesValidation = validateObjectives(input.primaryObjectives);
    allErrors.push(...objectivesValidation.errors);
  }
  
  // Additional update-specific validations
  if (input.description !== undefined && input.description.length > 2000) {
    allErrors.push({ 
      field: 'description', 
      message: 'Description cannot exceed 2000 characters' 
    });
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

// Team member validation
export function validateTeamMemberRole(member: ProjectTeamMember, requiredRole: string[]): boolean {
  return requiredRole.includes(member.role) && member.invitationStatus === 'active';
}

// Permission validation
export function validateUserPermission(member: ProjectTeamMember, permission: keyof PermissionSet): boolean {
  if (member.invitationStatus !== 'active') return false;
  
  // Owner and admin have all permissions
  if (member.role === 'owner' || member.role === 'admin') return true;
  
  // Check specific permission
  return member.permissions[permission] === true;
}