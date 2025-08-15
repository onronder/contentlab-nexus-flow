/**
 * Error filtering utilities to reduce console noise from browser extensions
 */

export const isBrowserExtensionError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' && error.stack ? error.stack : '';
  
  const extensionIndicators = [
    'deref',
    'content_script',
    'extension://',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'evmAsk.js',
    'inpage.js',
    'contentscript.js',
    'utils.js',
    'extensionState.js',
    'heuristicsRedefinitions.js',
    'Cannot redefine property: ethereum',
    'binanceInjectedProvider',
    'Failed to load resource: net::ERR_FILE_NOT_FOUND'
  ];
  
  return extensionIndicators.some(indicator => 
    errorMessage?.includes(indicator) || errorStack?.includes(indicator)
  );
};

export const isNetworkError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const networkIndicators = [
    'Failed to fetch',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_NAME_NOT_RESOLVED'
  ];
  
  return networkIndicators.some(indicator => 
    errorMessage?.includes(indicator)
  );
};

export const shouldLogError = (error: Error | string): boolean => {
  // Don't log browser extension errors
  if (isBrowserExtensionError(error)) {
    return false;
  }
  
  // Don't log certain network errors that are user-environment related
  if (isNetworkError(error)) {
    return false;
  }
  
  return true;
};

export const cleanErrorMessage = (error: Error | string): string => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Remove file paths that might be sensitive
  return errorMessage
    .replace(/file:\/\/\/.*?\//, 'file:///')
    .replace(/chrome-extension:\/\/[a-z]+\//, 'chrome-extension://***/')
    .replace(/moz-extension:\/\/[a-z]+\//, 'moz-extension://***/')
    .replace(/safari-extension:\/\/[a-z]+\//, 'safari-extension://***/')
    .trim();
};