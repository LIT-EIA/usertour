# Usertour SDK Iframe Integration

This document describes the comprehensive iframe integration features added to the Usertour SDK, allowing tour steps and launchers to work seamlessly with elements inside iframes.

## Overview

The iframe integration enables the Usertour SDK to:
- **Automatically detect elements** inside iframes when they're not found on the main page
- **Position tour steps and launchers** accurately relative to iframe elements using virtual elements
- **Communicate bidirectionally** between parent and iframe for step progression and actions
- **Handle both same-origin and cross-origin** iframes with appropriate fallbacks
- **Manage event listeners** and cleanup to prevent memory leaks and conflicts
- **Support multiple iframes** and complex tour flows with proper state management

## Key Features

### 1. Intelligent Element Discovery
- **Automatic iframe search**: When an element is not found on the main page, the SDK automatically searches through all accessible iframes
- **Same-origin detection**: Automatically detects and handles same-origin iframes with full SDK injection
- **Cross-origin support**: Graceful handling of cross-origin iframes using postMessage API
- **Dynamic iframe support**: Handles dynamically loaded iframes and content changes
- **Infinite loop prevention**: Robust guards prevent recursive searches and duplicate processing

### 2. Virtual Element Positioning System
- **Accurate positioning**: Creates virtual elements that represent the exact position and dimensions of target elements within iframes
- **Real-time updates**: Automatically updates positioning when iframes move, resize, or scroll
- **Cross-document visibility**: Proper visibility checks for elements within iframe contexts
- **Z-index management**: Maintains proper layering and stacking context

### 3. Advanced Communication System
- **Bidirectional messaging**: Comprehensive parent-iframe communication using postMessage API
- **Action handling**: Full support for step actions, navigation, and custom interactions
- **Multiple handler support**: Supports multiple communication handlers for complex tour flows
- **Message validation**: Secure message handling with proper validation and error handling

### 4. Event Management & Cleanup
- **Automatic cleanup**: Comprehensive cleanup system prevents memory leaks and lingering event listeners
- **Step-specific cleanup**: Individual step cleanup with proper timing to avoid premature removal
- **Tour completion cleanup**: Full cleanup when tours complete or are dismissed
- **State management**: Proper reset and cleanup when tours are revisited or restarted

## Implementation Details

### Core Components

#### 1. IframeUtils (`src/utils/iframe-utils.ts`)
**Main utility class for iframe operations:**

```typescript
class IframeUtils {
  // Element discovery
  searchElementInIframes(target: ElementSelectorPropsData): Promise<IframeElementInfo | null>
  getAllIframes(): HTMLIFrameElement[]
  isIframeAccessible(iframe: HTMLIFrameElement): boolean
  isIframeVisible(iframe: HTMLIFrameElement): boolean
  
  // SDK injection and communication
  injectSDKIntoIframe(iframe: HTMLIFrameElement): Promise<void>
  sendMessageToIframe(iframe: HTMLIFrameElement, message: IframeMessage): void
  sendCleanupMessageToIframe(iframe: HTMLIFrameElement, stepId: string): void
  sendCleanupAllStepsToAllIframes(): void
  
  // Communication handler management
  setCommunicationHandler(id: string, handler: IframeCommunicationHandler): void
  removeCommunicationHandler(id: string): void
  removeAllCommunicationHandlers(): void
}
```

#### 2. ElementWatcher (`src/core/element-watcher.ts`)
**Enhanced element watcher with comprehensive iframe support:**

```typescript
class ElementWatcher {
  // Core functionality
  findElement(target: ElementSelectorPropsData): Promise<void>
  searchInIframes(retryTimes: number): Promise<void>
  checkVisibility(): Promise<void>
  
  // Iframe-specific methods
  getIframeElementInfo(): IframeElementInfo | null
  isElementInIframe(): boolean
  checkElementVisibilityInContext(element: HTMLElement): Promise<boolean>
  
  // State management
  reset(): void
  destroy(): void
}
```

#### 3. Tour (`src/core/tour.ts`)
**Tour class with comprehensive iframe integration:**

```typescript
class Tour {
  // Element handling
  handleElementFound(element: HTMLElement): void
  handleElementChanged(element: HTMLElement): void
  createVirtualElementForIframe(iframeElementInfo: IframeElementInfo): HTMLElement
  
  // Communication setup
  setupIframeCommunication(step: Step, iframeElementInfo: IframeElementInfo): void
  handleIframeStepAction(step: Step, action: string, data?: any): Promise<void>
  handleIframeStepComplete(step: Step, data?: any): void
  
  // Cleanup and state management
  cleanupIframeCommunication(step: Step): void
  moveToNextStep(): Promise<void>
  close(reason: contentEndReason): Promise<void>
  reset(): void
  destroy(): void
}
```

#### 4. Injected Iframe SDK (`src/utils/iframe-sdk.ts`)
**Minimal SDK injected into same-origin iframes:**

```typescript
window.usertourIframeSDK = {
  // Core functionality
  init(): void
  findElement(selector: ElementSelectorPropsData): Element | null
  setupElementInteraction(element: Element, stepId: string, actions?: RulesCondition[]): void
  
  // Communication
  notifyStepComplete(stepId: string, data?: any): void
  notifyStepAction(stepId: string, action: string, data?: any): void
  sendMessageToParent(message: IframeSDKMessage): void
  
  // Cleanup
  cleanupStep(stepId: string): void
  cleanupAllSteps(): void
}
```

### Message Types

The iframe integration uses a comprehensive set of message types:

```typescript
interface IframeMessage {
  type: 'usertour-step-complete' | 'usertour-step-action' | 'usertour-element-found' | 
        'usertour-element-not-found' | 'usertour-iframe-ready' | 'usertour-find-element' |
        'usertour-cleanup-step' | 'usertour-cleanup-all-steps';
  stepId?: string;
  action?: string;
  element?: ElementSelectorPropsData;
  actions?: RulesCondition[];
  data?: any;
}

interface IframeSDKMessage {
  type: 'usertour-step-complete' | 'usertour-step-action' | 'usertour-element-found' |
        'usertour-element-not-found' | 'usertour-iframe-ready';
  stepId?: string;
  action?: string;
  data?: any;
}
```

### Data Structures

```typescript
interface IframeElementInfo {
  element: HTMLElement;
  iframe: HTMLIFrameElement;
  iframeSrc: string;
  iframeIndex: number;
  iframeRect: DOMRect;
}

interface IframeCommunicationHandler {
  onStepComplete: (stepId: string, data?: any) => void;
  onStepAction: (stepId: string, action: string, data?: any) => void;
  onElementFound: (elementInfo: IframeElementInfo) => void;
  onElementNotFound: (selector: ElementSelectorPropsData) => void;
}
```

## Usage Examples

### Basic Setup

```javascript
// Initialize the SDK
usertour.init('your-token');

// Start tour - will automatically search iframes
usertour.start('tour-id');
```

### Advanced Configuration

```javascript
// Set up custom communication handler
iframeUtils.setCommunicationHandler('custom-handler', {
  onStepComplete: (stepId, data) => {
    console.log('Step completed:', stepId, data);
    // Custom step completion logic
  },
  onStepAction: (stepId, action, data) => {
    console.log('Step action:', stepId, action, data);
    // Handle specific actions (navigation, form submission, etc.)
  },
  onElementFound: (elementInfo) => {
    console.log('Element found in iframe:', elementInfo);
    // Update UI, show tooltips, etc.
  },
  onElementNotFound: (selector) => {
    console.log('Element not found:', selector);
    // Handle missing elements
  }
});
```

### Manual Iframe Communication

For cross-origin iframes or custom implementations:

```javascript
// In the iframe
window.parent.postMessage({
  type: 'usertour-step-action',
  stepId: 'step-1',
  action: 'handleActions',
  data: { 
    actions: [
      { type: 'step-goto', data: { stepId: 'next-step' } }
    ]
  }
}, '*');

// In the parent
window.addEventListener('message', function(event) {
  if (event.data.type === 'usertour-step-action') {
    // Handle step action
    iframeUtils.processMessage(event);
  }
});
```

## Advanced Features

### 1. Multiple Iframe Support
The SDK handles multiple iframes seamlessly:
- **Unique handler IDs**: Each step gets a unique communication handler
- **Proper cleanup**: Individual cleanup for each iframe and step
- **State isolation**: No conflicts between different iframe interactions

### 2. Event Listener Management
Comprehensive event listener management:
- **Automatic setup**: Event listeners are automatically set up on target elements
- **Proper cleanup**: Listeners are removed when steps complete or tours end
- **Memory leak prevention**: No lingering event listeners or references

### 3. Timing and Synchronization
Robust timing management:
- **Proper sequencing**: Actions are processed in the correct order
- **Cleanup timing**: Cleanup happens at the right time to avoid premature removal
- **State synchronization**: Proper state management across iframe boundaries

### 4. Error Handling and Fallbacks
Comprehensive error handling:
- **Graceful degradation**: Falls back gracefully when iframe access is restricted
- **Error recovery**: Recovers from communication failures
- **Debug logging**: Extensive logging for troubleshooting

## Configuration Options

### Iframe Detection Settings

```javascript
// Set target missing timeout (default: 5 seconds)
usertour.setTargetMissingSeconds(10);

// Set session timeout (default: 24 hours)
usertour.setSessionTimeout(48);

// Enable debug mode for iframe operations
localStorage.setItem('debug', 'usertour-widget:*');
```

### Communication Handler Configuration

```javascript
// Set up handler for specific tour step
iframeUtils.setCommunicationHandler(`tour-step-${stepId}`, {
  onStepComplete: (stepId, data) => {
    // Handle step completion
    tour.moveToNextStep();
  },
  onStepAction: (stepId, action, data) => {
    // Handle specific actions
    if (action === 'handleActions') {
      tour.handleActions(data.actions);
    }
  },
  onElementFound: (elementInfo) => {
    // Element found in iframe
    tour.updateIframeElementPosition(elementInfo);
  },
  onElementNotFound: (selector) => {
    // Element not found
    tour.handleElementNotFound(selector);
  }
});
```

## Browser Compatibility

- **Modern Browsers**: Full support for all features including advanced positioning and communication
- **IE11+**: Basic iframe detection and positioning with fallbacks
- **Mobile Browsers**: Full support with touch events and responsive positioning
- **Cross-Origin**: Secure postMessage-based communication with proper validation

## Security Considerations

1. **Cross-Origin Restrictions**: Cross-origin iframes can only communicate via postMessage API
2. **Content Security Policy**: Ensure CSP allows iframe communication and script injection
3. **Message Validation**: All messages are validated for source and content
4. **XSS Prevention**: All data passed between frames is properly sanitized
5. **Secure Communication**: Uses secure postMessage patterns with origin validation

## Troubleshooting

### Common Issues and Solutions

#### 1. Elements Not Found in Iframes
**Symptoms**: Tour steps don't appear or elements aren't detected
**Solutions**:
- Check if iframe is same-origin (`iframeUtils.isIframeAccessible(iframe)`)
- Verify iframe has loaded completely (check `iframe.contentDocument`)
- Ensure selectors are correct and unique
- Check if iframe is visible (`iframeUtils.isIframeVisible(iframe)`)

#### 2. Positioning Issues
**Symptoms**: Tour steps appear in wrong location or don't follow elements
**Solutions**:
- Verify iframe dimensions and position
- Check if iframe is scrolled into view
- Ensure proper z-index stacking
- Check for CSS transforms or positioning conflicts

#### 3. Communication Failures
**Symptoms**: Steps don't progress when elements are clicked
**Solutions**:
- Check browser console for postMessage errors
- Verify message format matches `IframeMessage` interface
- Ensure communication handlers are properly set up
- Check for timing issues with SDK injection

#### 4. Event Listener Issues
**Symptoms**: Elements become unresponsive or cleanup doesn't work
**Solutions**:
- Check if cleanup is happening too early
- Verify event listeners are properly attached
- Check for multiple handlers on same element
- Ensure proper step ID matching

### Debug Mode

Enable comprehensive debug logging:

```javascript
// Enable debug mode
localStorage.setItem('debug', 'usertour-widget:*');

// Check iframe detection
console.log('Iframes found:', iframeUtils.getAllIframes());

// Check communication handlers
console.log('Active handlers:', iframeUtils.getActiveHandlers());

// Monitor message flow
window.addEventListener('message', (event) => {
  if (event.data.type?.startsWith('usertour-')) {
    console.log('Iframe message:', event.data);
  }
});
```

### Debug Console Commands

```javascript
// Check iframe accessibility
iframeUtils.getAllIframes().forEach((iframe, index) => {
  console.log(`Iframe ${index}:`, {
    src: iframe.src,
    accessible: iframeUtils.isIframeAccessible(iframe),
    visible: iframeUtils.isIframeVisible(iframe),
    loaded: !!iframe.contentDocument
  });
});

// Check active communication handlers
console.log('Active handlers:', iframeUtils.communicationHandlers.size);

// Force cleanup all iframes
iframeUtils.sendCleanupAllStepsToAllIframes();
```

## Performance Considerations

- **Minimal overhead**: Iframe searching adds minimal performance impact
- **Efficient caching**: Virtual elements are lightweight and cached appropriately
- **Event-driven**: Communication is event-driven and efficient
- **Automatic cleanup**: Proper cleanup prevents memory leaks
- **Lazy loading**: SDK injection happens only when needed

## Testing

### Test Scenarios

1. **Basic iframe detection**: Elements in same-origin iframes
2. **Cross-origin iframes**: Elements in cross-origin iframes
3. **Multiple iframes**: Tours spanning multiple iframes
4. **Dynamic content**: Elements in dynamically loaded iframes
5. **Complex interactions**: Multi-step tours with iframe elements
6. **Cleanup verification**: Ensure proper cleanup and no memory leaks

### Test Checklist

- [ ] Elements are detected in iframes
- [ ] Positioning is accurate
- [ ] Communication works bidirectionally
- [ ] Event listeners are properly attached
- [ ] Cleanup happens at the right time
- [ ] Multiple iframes work correctly
- [ ] Cross-origin iframes handle gracefully
- [ ] Tour completion works properly
- [ ] No memory leaks or lingering listeners

## Migration Guide

### From Previous Versions

Existing tours will work without changes. To enable enhanced iframe support:

1. **Update SDK**: Ensure you're using the latest version with iframe support
2. **Test existing tours**: Verify existing functionality still works
3. **Add iframe elements**: Test with elements inside iframes
4. **Configure handlers**: Set up communication handlers if needed
5. **Monitor performance**: Check for any performance impacts

### Backward Compatibility

The iframe integration is fully backward compatible:
- Existing tours continue to work unchanged
- No breaking changes to existing APIs
- Graceful fallbacks for unsupported scenarios
- Optional configuration for advanced features

## Future Enhancements

- **Nested iframe support**: Support for iframes within iframes
- **Enhanced cross-origin**: More sophisticated cross-origin communication
- **Iframe-specific configurations**: Per-iframe tour settings
- **Advanced positioning**: More sophisticated positioning algorithms
- **Performance optimizations**: Further performance improvements
- **Accessibility improvements**: Enhanced accessibility support
- **Mobile optimizations**: Better mobile iframe handling

## API Reference

### IframeUtils Methods

```typescript
// Element discovery
searchElementInIframes(target: ElementSelectorPropsData): Promise<IframeElementInfo | null>
getAllIframes(): HTMLIFrameElement[]
isIframeAccessible(iframe: HTMLIFrameElement): boolean
isIframeVisible(iframe: HTMLIFrameElement): boolean

// SDK injection
injectSDKIntoIframe(iframe: HTMLIFrameElement): Promise<void>
getIframeSDKCode(): string

// Communication
sendMessageToIframe(iframe: HTMLIFrameElement, message: IframeMessage): void
sendCleanupMessageToIframe(iframe: HTMLIFrameElement, stepId: string): void
sendCleanupAllStepsToAllIframes(): void

// Handler management
setCommunicationHandler(id: string, handler: IframeCommunicationHandler): void
removeCommunicationHandler(id: string): void
removeAllCommunicationHandlers(): void
setupMessageListener(): void
```

### Tour Methods

```typescript
// Element handling
handleElementFound(element: HTMLElement): void
handleElementChanged(element: HTMLElement): void
createVirtualElementForIframe(iframeElementInfo: IframeElementInfo): HTMLElement
updateIframeElementPosition(iframeElementInfo: IframeElementInfo): void

// Communication
setupIframeCommunication(step: Step, iframeElementInfo: IframeElementInfo): void
handleIframeStepAction(step: Step, action: string, data?: any): Promise<void>
handleIframeStepComplete(step: Step, data?: any): void

// Cleanup
cleanupIframeCommunication(step: Step): void
```

### Injected SDK Methods

```typescript
// Available in iframe context
window.usertourIframeSDK = {
  init(): void
  findElement(selector: ElementSelectorPropsData): Element | null
  setupElementInteraction(element: Element, stepId: string, actions?: RulesCondition[]): void
  notifyStepComplete(stepId: string, data?: any): void
  notifyStepAction(stepId: string, action: string, data?: any): void
  sendMessageToParent(message: IframeSDKMessage): void
  cleanupStep(stepId: string): void
  cleanupAllSteps(): void
}
```

---

The iframe integration provides a robust, secure, and performant solution for handling tour elements within iframes, with comprehensive cleanup, state management, and error handling.