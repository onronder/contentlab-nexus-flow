/**
 * Browser extension detection and compatibility utilities
 */

interface ExtensionIssue {
  name: string;
  detected: boolean;
  description: string;
  solution: string;
  severity: 'low' | 'medium' | 'high';
}

const KNOWN_PROBLEMATIC_EXTENSIONS = [
  {
    name: 'Ad Blockers',
    indicators: ['adblock', 'ublock', 'adguard', 'ghostery'],
    description: 'Ad blockers may interfere with API requests',
    solution: 'Whitelist this domain in your ad blocker',
    severity: 'medium' as const
  },
  {
    name: 'Content Blockers',
    indicators: ['privacy-badger', 'disconnect', 'duckduckgo'],
    description: 'Privacy extensions may block analytics or API calls',
    solution: 'Allow analytics and API domains in privacy settings',
    severity: 'medium' as const
  },
  {
    name: 'Script Blockers',
    indicators: ['noscript', 'scriptsafe', 'umatrix'],
    description: 'Script blockers prevent JavaScript execution',
    solution: 'Allow scripts from this domain',
    severity: 'high' as const
  },
  {
    name: 'Developer Tools',
    indicators: ['react-developer-tools', 'redux-devtools'],
    description: 'Developer tools may interfere with production builds',
    solution: 'Disable developer extensions in incognito mode',
    severity: 'low' as const
  }
];

export const detectExtensionInterference = (): ExtensionIssue[] => {
  const issues: ExtensionIssue[] = [];
  
  // Check for DOM modifications that suggest extension interference
  const hasModifications = checkDOMModifications();
  
  // Check for blocked resources
  const hasBlockedResources = checkBlockedResources();
  
  // Check for injected scripts
  const hasInjectedScripts = checkInjectedScripts();
  
  KNOWN_PROBLEMATIC_EXTENSIONS.forEach(ext => {
    const detected = ext.indicators.some(indicator => 
      hasModifications || 
      hasBlockedResources || 
      hasInjectedScripts ||
      checkSpecificExtension(indicator)
    );
    
    if (detected) {
      issues.push({
        name: ext.name,
        detected: true,
        description: ext.description,
        solution: ext.solution,
        severity: ext.severity
      });
    }
  });
  
  return issues;
};

const checkDOMModifications = (): boolean => {
  try {
    // Check for common extension-injected elements
    const suspiciousSelectors = [
      '[data-adblock]',
      '[class*="adblock"]',
      '[id*="adblock"]',
      '[data-extension]',
      '.extension-injected'
    ];
    
    return suspiciousSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
  } catch {
    return false;
  }
};

const checkBlockedResources = (): boolean => {
  try {
    // Check for failed resource loads that might indicate blocking
    const performanceEntries = performance.getEntriesByType('navigation');
    const resourceEntries = performance.getEntriesByType('resource');
    
    // Look for unusual patterns in resource loading
    const suspiciousPatterns = resourceEntries.filter(entry => {
      const resource = entry as PerformanceResourceTiming;
      return (
        resource.duration === 0 ||
        resource.transferSize === 0 ||
        resource.responseEnd === 0
      );
    });
    
    return suspiciousPatterns.length > 5; // Threshold for suspicion
  } catch {
    return false;
  }
};

const checkInjectedScripts = (): boolean => {
  try {
    // Check for scripts that weren't part of the original page
    const scripts = Array.from(document.scripts);
    const suspiciousScripts = scripts.filter(script => {
      return (
        script.src.includes('extension') ||
        script.src.includes('chrome-extension') ||
        script.src.includes('moz-extension') ||
        script.textContent?.includes('extension')
      );
    });
    
    return suspiciousScripts.length > 0;
  } catch {
    return false;
  }
};

const checkSpecificExtension = (indicator: string): boolean => {
  try {
    // Check if specific extension artifacts are present
    return (
      window.navigator.userAgent.includes(indicator) ||
      document.documentElement.classList.toString().includes(indicator) ||
      Object.keys(window).some(key => key.toLowerCase().includes(indicator))
    );
  } catch {
    return false;
  }
};

export const createExtensionSafeEventHandler = <T extends Event>(
  handler: (event: T) => void
) => {
  return (event: T) => {
    try {
      // Check if event might be from extension
      const target = event.target as Element;
      const isExtensionEvent = (
        target?.closest('[data-extension]') ||
        target?.closest('[class*="extension"]') ||
        event.isTrusted === false
      );
      
      if (isExtensionEvent) {
        console.warn('Ignoring potentially extension-generated event');
        return;
      }
      
      handler(event);
    } catch (error) {
      console.error('Error in extension-safe event handler:', error);
    }
  };
};

export const initializeExtensionCompatibility = () => {
  // Override console methods to prevent extension interference
  const originalConsole = { ...console };
  
  // Monitor for extension-related errors
  window.addEventListener('error', (event) => {
    if (
      event.filename?.includes('extension') ||
      event.message?.includes('extension')
    ) {
      console.warn('Extension-related error detected:', event.error);
      event.preventDefault(); // Prevent error from bubbling up
    }
  });
  
  // Set up mutation observer for DOM changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (
              element.getAttribute('data-extension') ||
              element.className?.includes('extension')
            ) {
              console.warn('Extension-injected element detected:', element);
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return () => {
    observer.disconnect();
    Object.assign(console, originalConsole);
  };
};

export const getExtensionCompatibilityReport = () => {
  const issues = detectExtensionInterference();
  const hasHighSeverityIssues = issues.some(issue => issue.severity === 'high');
  const hasMediumSeverityIssues = issues.some(issue => issue.severity === 'medium');
  
  return {
    compatible: !hasHighSeverityIssues,
    warnings: hasMediumSeverityIssues,
    issues,
    recommendations: generateRecommendations(issues)
  };
};

const generateRecommendations = (issues: ExtensionIssue[]): string[] => {
  const recommendations: string[] = [];
  
  if (issues.length === 0) {
    recommendations.push('No extension compatibility issues detected');
  } else {
    recommendations.push('Consider the following to improve compatibility:');
    issues.forEach(issue => {
      recommendations.push(`• ${issue.solution}`);
    });
    
    if (issues.some(i => i.severity === 'high')) {
      recommendations.push('• Try using incognito/private browsing mode');
      recommendations.push('• Disable extensions temporarily to isolate issues');
    }
  }
  
  return recommendations;
};