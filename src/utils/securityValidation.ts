/**
 * Security validation utilities for input sanitization and validation
 */

// Email validation with stricter security checks
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Check for dangerous characters
  const dangerousChars = /[<>'"&]/;
  if (dangerousChars.test(email)) {
    return { isValid: false, error: 'Email contains invalid characters' };
  }

  // Length validation
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  return { isValid: true };
};

// Sanitize input to prevent XSS attacks
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>'"&]/g, '') // Remove dangerous HTML characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate user names and display names
export const validateDisplayName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  const sanitized = sanitizeInput(name);
  if (sanitized !== name) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  // Check for only valid characters (letters, spaces, some punctuation)
  const validNameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!validNameRegex.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
};

// Validate file uploads (for future use)
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 5MB' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
  }

  // Check file name for dangerous characters
  const dangerousFileChars = /[<>:"|?*\\]/;
  if (dangerousFileChars.test(file.name)) {
    return { isValid: false, error: 'File name contains invalid characters' };
  }

  return { isValid: true };
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(identifier: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.attempts.get(identifier);

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxAttempts) {
      return false;
    }

    current.count++;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const current = this.attempts.get(identifier);
    if (!current) return 0;
    
    return Math.max(0, current.resetTime - Date.now());
  }
}

// Security headers for API requests
export const getSecurityHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});