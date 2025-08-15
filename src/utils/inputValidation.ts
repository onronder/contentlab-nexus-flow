// Input validation utilities for enhanced security

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>'"]/g, '') // Remove HTML/XSS characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/onload/gi, '') // Remove onload handlers
    .replace(/onerror/gi, '') // Remove onerror handlers
    .replace(/onclick/gi, '') // Remove onclick handlers
    .trim();
};

/**
 * Validates and sanitizes tag inputs
 */
export const validateTag = (tag: string): { valid: boolean; sanitized: string; error?: string } => {
  if (!tag || typeof tag !== 'string') {
    return { valid: false, sanitized: '', error: 'Tag must be a non-empty string' };
  }

  const sanitized = sanitizeInput(tag);
  
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Tag contains only invalid characters' };
  }

  if (sanitized.length > 50) {
    return { valid: false, sanitized: '', error: 'Tag must be 50 characters or less' };
  }

  // Check for valid tag pattern (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Tag can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true, sanitized };
};

/**
 * Validates file metadata to prevent injection attacks
 */
export const validateFileMetadata = (metadata: any): { valid: boolean; sanitized: any; error?: string } => {
  if (!metadata || typeof metadata !== 'object') {
    return { valid: true, sanitized: {} };
  }

  try {
    const sanitized: any = {};
    
    // Whitelist allowed metadata fields
    const allowedFields = ['name', 'type', 'size', 'description', 'category', 'tags'];
    
    for (const [key, value] of Object.entries(metadata)) {
      if (!allowedFields.includes(key)) continue;
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'number' && isFinite(value)) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Sanitize array of strings (like tags)
        sanitized[key] = value
          .filter(item => typeof item === 'string')
          .map(item => sanitizeInput(item))
          .filter(item => item.length > 0);
      }
    }

    return { valid: true, sanitized };
  } catch (error) {
    return { valid: false, sanitized: {}, error: 'Invalid metadata format' };
  }
};

/**
 * Enhanced CSV parsing security for member invitations
 */
export const parseCSVSafely = (csvContent: string): { valid: boolean; data: any[]; error?: string } => {
  if (!csvContent || typeof csvContent !== 'string') {
    return { valid: false, data: [], error: 'Invalid CSV content' };
  }

  try {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { valid: false, data: [], error: 'CSV file is empty' };
    }

    // Limit number of rows to prevent DoS
    if (lines.length > 1000) {
      return { valid: false, data: [], error: 'CSV file too large (max 1000 rows)' };
    }

    const headers = lines[0].split(',').map(header => sanitizeInput(header.trim()));
    const data: any[] = [];

    // Validate headers
    const requiredHeaders = ['email'];
    const allowedHeaders = ['email', 'name', 'role'];
    
    if (!requiredHeaders.every(required => headers.includes(required))) {
      return { valid: false, data: [], error: 'CSV must contain email column' };
    }

    if (!headers.every(header => allowedHeaders.includes(header))) {
      return { valid: false, data: [], error: 'CSV contains invalid columns' };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => sanitizeInput(value.trim()));
      
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate email format
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        continue; // Skip invalid emails
      }

      data.push(row);
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, data: [], error: 'Failed to parse CSV file' };
  }
};

/**
 * Stricter file type validation
 */
export const validateFileType = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.csv', '.xls', '.xlsx'
  ];

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File extension not allowed' };
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size too large (max 10MB)' };
  }

  // Check for suspicious file names
  if (/[<>:"/\\|?*]/.test(file.name)) {
    return { valid: false, error: 'File name contains invalid characters' };
  }

  return { valid: true };
};