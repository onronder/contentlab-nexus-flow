/**
 * Security headers and CSRF protection utilities
 */

export const getSecurityHeaders = () => {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  // Simple CSRF validation - in production, use more sophisticated methods
  return token === sessionToken;
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]*>/g, '')
              .trim();
};

export const encryptSensitiveData = (data: string, key: string): string => {
  // Simple encryption - in production, use proper encryption libraries
  return btoa(data + key);
};

export const decryptSensitiveData = (encryptedData: string, key: string): string => {
  try {
    const decoded = atob(encryptedData);
    return decoded.replace(key, '');
  } catch {
    return '';
  }
};