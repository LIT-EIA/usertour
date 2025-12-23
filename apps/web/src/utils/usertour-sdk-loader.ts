import type { UserTourTypes } from '@usertour/types';

// Singleton pattern to prevent multiple simultaneous loads
let loadPromise: Promise<UserTourTypes.Usertour> | null = null;

/**
 * Loads the usertour SDK from the server
 * Uses a singleton pattern to ensure only one load attempt at a time
 * @returns Promise that resolves with the usertour SDK instance
 */
export const loadUsertourSDK = (): Promise<UserTourTypes.Usertour> => {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  console.log('Loading usertour SDK');

  const win = window as UserTourTypes.WindowWithUsertour;

  // Check if already loaded
  if (win.usertour && !win.usertour._stubbed) {
    return Promise.resolve(win.usertour);
  }

  // Create loading promise
  loadPromise = new Promise<UserTourTypes.Usertour>((resolve, reject) => {
    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[data-usertour-sdk]',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => {
        if (win.usertour && !win.usertour._stubbed) {
          resolve(win.usertour);
        } else {
          reject(new Error('SDK script loaded but not attached to window.usertour'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load usertour SDK script'));
      });
      return;
    }

    // Create and inject script tag
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/sdk/es2020/usertour.js';
    script.setAttribute('data-usertour-sdk', 'true');
    script.async = true;

    // Poll for SDK attachment (since ES modules load asynchronously)
    const checkInterval = setInterval(() => {
      if (win.usertour && !win.usertour._stubbed) {
        clearInterval(checkInterval);
        resolve(win.usertour);
      }
    }, 50);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      script.remove();
      loadPromise = null;
      reject(new Error('Timeout: usertour SDK failed to load within 10 seconds'));
    }, 10000);

    script.onload = () => {
      // Give it a moment to attach to window
      setTimeout(() => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        if (win.usertour && !win.usertour._stubbed) {
          resolve(win.usertour);
        } else {
          script.remove();
          loadPromise = null;
          reject(new Error('SDK script loaded but not attached to window.usertour'));
        }
      }, 100);
    };

    script.onerror = () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      script.remove();
      loadPromise = null;
      reject(new Error('Failed to load usertour SDK script'));
    };

    document.head.appendChild(script);
  });

  // Reset promise on error to allow retry
  loadPromise.catch(() => {
    loadPromise = null;
  });

  return loadPromise;
};
