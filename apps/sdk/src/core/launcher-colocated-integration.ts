/**
 * Integration guide for co-located launcher rendering
 *
 * This file shows how to integrate the new IframeLauncherRenderer
 * into the existing Launcher class
 */

import { IframeLauncherRenderer, canRenderInIframe } from './launcher-iframe-renderer';
import { IframeElementInfo } from '../utils/iframe-utils';

/**
 * STEP 1: Add these properties to the Launcher class
 */
// Add to class Launcher:
// private iframeLauncherRenderer: IframeLauncherRenderer | null = null;
// private shouldUseColocatedRendering = false;

/**
 * STEP 2: Modify the setupElementFoundHandler method
 *
 * Replace the virtual element creation with co-located rendering
 */
export function modifiedSetupElementFoundHandler_Example() {
  // In launcher.ts, around line 159-236, replace:

  /*
  // OLD CODE (lines 163-189):
  if (iframeElementInfo) {
    // ... iframe checks ...

    // For iframe elements, create a virtual element for positioning
    triggerRef = this.createVirtualElementForIframe(iframeElementInfo);

    // Set up scroll/resize listeners to keep position updated
    this.setupIframePositionUpdate(iframeElementInfo);

    // ... scrolling logic ...
  }
  */

  // NEW CODE:
  /*
  if (iframeElementInfo) {
    // Check if iframe is CSS-visible
    if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
      console.log('[Launcher] iframe is not CSS-visible, skipping element processing');
      // ... existing retry logic ...
      return;
    }

    // Check if we can render inside iframe
    if (canRenderInIframe(iframeElementInfo.iframe)) {
      console.log('[Launcher] ✅ Using co-located rendering inside iframe');
      this.shouldUseColocatedRendering = true;

      // Use the actual element in iframe as triggerRef
      triggerRef = iframeElementInfo.element as HTMLElement;

      // NO virtual element, NO position listeners needed!

    } else {
      console.log('[Launcher] ⚠️ Cannot access iframe, falling back to virtual element');
      this.shouldUseColocatedRendering = false;

      // Fallback to old approach
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
      this.setupIframePositionUpdate(iframeElementInfo);
    }

    // Scroll iframe into view
    const { smoothScroll } = await import('@usertour-packages/dom');
    await smoothScroll(iframeElementInfo.iframe, { block: 'center' });

    // Scroll element inside iframe
    // ... existing scrolling logic ...
  }
  */
}

/**
 * STEP 3: Create method to render tooltip in iframe
 *
 * Add this new method to Launcher class
 */
export function renderTooltipInIframe_Example() {
  /*
  // Add to launcher.ts:

  private async renderTooltipInIframe(
    iframeElementInfo: IframeElementInfo,
    data: LauncherData
  ): Promise<void> {
    // Clean up existing renderer
    if (this.iframeLauncherRenderer) {
      this.iframeLauncherRenderer.destroy();
    }

    // Create renderer
    this.iframeLauncherRenderer = new IframeLauncherRenderer(iframeElementInfo, {
      content: this.buildTooltipContent(data),
      placement: data.tooltip.alignment.side as any,
      offset: data.tooltip.alignment.sideOffset,
      width: data.tooltip.width,
      zIndex: data.zIndex || 1000,
      onClose: () => {
        this.close();
      },
    });

    // Render inside iframe
    this.iframeLauncherRenderer.render();
  }

  private buildTooltipContent(data: LauncherData): string {
    // Build HTML for tooltip content
    // You can serialize your React components to HTML
    // or use a portal-like approach to render React inside iframe

    // Simple example:
    return `
      <div class="launcher-tooltip-content">
        ${data.tooltip.content}
      </div>
    `;
  }
  */
}

/**
 * STEP 4: Update the show() method
 *
 * Trigger iframe rendering when tooltip should be shown
 */
export function modifiedShow_Example() {
  /*
  // In the LauncherWidget component (launcher.tsx)
  // around line 191-212, modify the LauncherPopper usage:

  const LauncherWidgetCore = ({ ... }) => {
    // ... existing code ...

    const shouldUseIframeRendering = useMemo(() => {
      // Check if we should render inside iframe
      const iframeInfo = store?.iframeElementInfo;
      return iframeInfo && canRenderInIframe(iframeInfo.iframe);
    }, [store]);

    useEffect(() => {
      if (shouldUseIframeRendering && open && store?.iframeElementInfo) {
        // Render tooltip inside iframe
        launcher.renderTooltipInIframe?.(store.iframeElementInfo, data);
      }
    }, [shouldUseIframeRendering, open, store]);

    // Conditionally render popper only if NOT using iframe rendering
    return (
      <LauncherRoot themeSettings={themeSettings} data={data}>
        {!shouldUseIframeRendering && (
          <LauncherPopper
            triggerRef={...}
            zIndex={zIndex}
            open={open}
          >
            <LauncherTooltip ... />
          </LauncherPopper>
        )}
        <LauncherContentWrapper ... />
      </LauncherRoot>
    );
  };
  */
}

/**
 * STEP 5: Clean up on destroy
 */
export function modifiedDestroy_Example() {
  /*
  // In launcher.ts destroy() method, add:

  destroy() {
    // ... existing cleanup ...

    // Clean up iframe renderer
    if (this.iframeLauncherRenderer) {
      this.iframeLauncherRenderer.destroy();
      this.iframeLauncherRenderer = null;
    }

    // ... rest of cleanup ...
  }
  */
}

/**
 * STEP 6: Remove unused code
 *
 * After testing, you can remove:
 */
export function codeToRemove_Example() {
  /*
  // These can be deleted once co-located rendering is working:

  // 1. createVirtualElementForIframe() - lines 292-317
  // 2. setupIframePositionUpdate() - lines 547-711
  // 3. updateIframeElementPosition() - lines 498-539
  // 4. cleanupIframePositionUpdate() - lines 717-722
  // 5. iframePositionUpdateCleanup property

  // This removes ~300 lines of complex position syncing code!
  */
}

/**
 * FEATURE FLAG: Gradual Rollout
 *
 * Use a feature flag to enable this gradually
 */
export function featureFlagExample() {
  /*
  // In launcher.ts, check feature flag:

  if (iframeElementInfo) {
    const useColocatedRendering =
      window.__USERTOUR_FEATURES__?.colocatedIframeLaunchers !== false;

    if (useColocatedRendering && canRenderInIframe(iframeElementInfo.iframe)) {
      // Use new approach
      this.shouldUseColocatedRendering = true;
      triggerRef = iframeElementInfo.element as HTMLElement;
    } else {
      // Use old approach
      this.shouldUseColocatedRendering = false;
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
      this.setupIframePositionUpdate(iframeElementInfo);
    }
  }
  */
}
