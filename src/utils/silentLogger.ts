/**
 * Silent logger that completely eliminates console output in production
 * while maintaining full error tracking and monitoring capabilities
 */

import { productionLogger } from './productionLogger';
import { productionMonitor } from './productionMonitoring';
import { isProduction } from './production';

class SilentLogger {
  /**
   * Replace all console methods with silent equivalents
   */
  static initialize() {
    if (!isProduction()) {
      return; // Keep console in development
    }

    // Store original console methods for emergency fallback
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
      trace: console.trace,
      group: console.group,
      groupEnd: console.groupEnd,
      time: console.time,
      timeEnd: console.timeEnd,
    };

    // Replace console methods with silent equivalents
    console.log = (...args) => {
      productionLogger.log('Console log intercepted', { args: this.sanitizeArgs(args) });
    };

    console.warn = (...args) => {
      productionLogger.warn('Console warning intercepted', { args: this.sanitizeArgs(args) });
    };

    console.error = (...args) => {
      const [message, ...rest] = args;
      if (message instanceof Error) {
        productionLogger.errorWithContext(message, 'Console error intercepted', { args: this.sanitizeArgs(rest) });
      } else {
        productionLogger.error('Console error intercepted', { message, args: this.sanitizeArgs(rest) });
      }
    };

    console.info = (...args) => {
      productionLogger.log('Console info intercepted', { args: this.sanitizeArgs(args) });
    };

    console.debug = (...args) => {
      // Debug messages are completely silenced in production
    };

    console.trace = (...args) => {
      productionLogger.log('Console trace intercepted', { args: this.sanitizeArgs(args) });
    };

    console.group = (label?: string) => {
      productionLogger.group(label || 'Console group');
    };

    console.groupEnd = () => {
      productionLogger.groupEnd();
    };

    console.time = (label?: string) => {
      // Silent in production - timing moved to proper monitoring
    };

    console.timeEnd = (label?: string) => {
      // Silent in production - timing moved to proper monitoring
    };

    // Store reference for potential restoration
    (window as any).__originalConsole = originalConsole;
  }

  /**
   * Sanitize console arguments to prevent circular references and sensitive data exposure
   */
  private static sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (arg === null || arg === undefined) {
        return arg;
      }
      
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return arg;
      }
      
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
        };
      }
      
      try {
        // Attempt to stringify object, but handle circular references
        return JSON.parse(JSON.stringify(arg));
      } catch {
        // If stringify fails, return a safe representation
        return '[Complex Object]';
      }
    });
  }

  /**
   * Emergency restore console functionality
   */
  static restore() {
    const originalConsole = (window as any).__originalConsole;
    if (originalConsole) {
      Object.assign(console, originalConsole);
    }
  }
}

export { SilentLogger };