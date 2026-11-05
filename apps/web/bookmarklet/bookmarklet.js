(function () {

  // Only open once
  if (document.querySelector('#usertour-bookmarklet-host')) {
    return;
  }

  // Persistent data
  function loadStorage() {
    var local = localStorage.getItem("ut-configurator");
    var storage = JSON.parse(local) || {};
    return storage;
  }

  function loadStorageProp(prop) {
    var local = localStorage.getItem("ut-configurator");
    var storage = JSON.parse(local) || {};
    return storage && storage[prop] ? storage[prop] : null;
  }

  function saveToStorage(prop, value) {
    var storage = loadStorage();
    storage[prop] = value;
    localStorage.setItem("ut-configurator", JSON.stringify(storage));
  }

  // Load fonts in document.head for global @font-face availability
  const faLink = document.createElement('link');
  faLink.rel = 'stylesheet';
  faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
  document.head.appendChild(faLink);

  const robotoLink = document.createElement('link');
  robotoLink.rel = 'stylesheet';
  robotoLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
  document.head.appendChild(robotoLink);

  // Create shadow host for full CSS isolation from host page
  const shadowHost = document.createElement('div');
  shadowHost.id = 'usertour-bookmarklet-host';
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // Also inject fonts inside shadow DOM so .fa class rules apply within the shadow boundary
  const faLinkShadow = document.createElement('link');
  faLinkShadow.rel = 'stylesheet';
  faLinkShadow.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
  shadowRoot.appendChild(faLinkShadow);

  const robotoLinkShadow = document.createElement('link');
  robotoLinkShadow.rel = 'stylesheet';
  robotoLinkShadow.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
  shadowRoot.appendChild(robotoLinkShadow);

  // Inject styles into shadow DOM — fully isolated from host page styles
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      display: block;
    }

    .custom-modal-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483647;
      animation: fadeIn 0.3s ease-out;
      pointer-events: auto;
    }

    .custom-modal {
    
      position: relative;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      width: 320px;
      max-width: 90%;
      font-family: 'Roboto', sans-serif !important;
      font-size: 14px !important;
      color: #000 !important;
      animation: slideUp 0.4s ease-out;
    }

    .custom-modal * {
      font-family: 'Roboto', sans-serif !important;
      color: #000 !important;
    }

    .custom-modal .fa,
    .custom-modal [class^="fa-"],
    .custom-modal [class*=" fa-"] {
      font-family: 'FontAwesome' !important;
    }

    .custom-modal h1 {
      font-size: 20px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-modal h2 {
      margin-top: 0;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
      font-size: 18px !important;
    }

    .custom-modal h3 {
      font-size: 15px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-modal h4 {
      font-size: 15.4px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-modal h5 {
      font-size: 14px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-modal h6 {
      font-size: 12.6px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-modal p {
      font-size: 14px !important;
      color: #000 !important;
    }

    .custom-modal em {
      font-size: 14px !important;
      color: #000 !important;
    }

    .close-button {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: 16.8px !important;
      color: #666 !important;
      cursor: pointer;
      transition: color 0.2s ease;
      font-family: 'Roboto', sans-serif !important;
    }

    .close-button:hover {
      color: #000 !important;
    }

    .button-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .button-grid .custom-button {
      width: 100%;
      aspect-ratio: 1 / 1;
      font-size: 10.5px !important;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Roboto', sans-serif !important;
      color: #000 !important;
      background-color: #5533FF;
    }

    .button-grid .custom-button i {
      font-size: 16.8px !important;
      margin-bottom: 4px;
      color: #fff !important;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 0 16px;
      padding: 6px 0;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
    }

    .toggle-label {
      font-size: 12.6px !important;
      color: #000 !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0;
      right: 0; bottom: 0;
      background-color: #bbb;
      transition: 0.2s;
      border-radius: 20px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #5533FF!important;
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .button-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .custom-button {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: #e0e0e0;
      color: #000 !important;
      font-size: 11.9px !important;
      cursor: pointer;
      transition: background 0.2s ease;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-button:hover {
      background: #775CFF;
    }

    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .selector-field-label {
      font-size: 11.9px !important;
      color: #000 !important;
      margin-top: 6px;
      margin-bottom: 6px;
      display: block;
      font-family: 'Roboto', sans-serif !important;
    }

    .selector-field-wrapper {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .selector-field {
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 11.9px !important;
      font-family: 'Courier New', monospace !important;
      background: white;
      color: #000 !important;
    }

    .selector-field:read-only {
      cursor: text;
      background: #f5f5f5;
    }

    .copy-button {
      flex-shrink: 0;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: #5533FF;
      color: #000 !important;
      font-size: 11.9px !important;
      cursor: pointer;
      transition: background 0.2s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      width: 90px;
      justify-content: center;
      font-family: 'Roboto', sans-serif !important;
    }

    .copy-button:hover {
      background: #775CFF;
    }

    .copy-button i {
      font-size: 14px !important;
    }

    .copy-button i:before {
      color: #fff !important;
    }

    .copy-button span {
      font-size: 11.9px !important;
      color: #fff !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-button span {
      font-size: inherit !important;
      color: #fff !important;
      font-family: 'Roboto', sans-serif !important;
    }

    .custom-hidden {
      display: none!important;
    }

    .modal-title {
      margin-bottom: 0!important;
    }

    .modal-header {
      background: #F1F5F9;
      height: 20px;
      border-radius: 10px 10px 0 0;
      padding: 20px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #E3E9F1;
    }
      
    .modal-content {
      padding: 0 20px 20px 20px;
    }

    .usertour-logo {
      margin-right: 10px;
    }

    .debug-details {
      margin: -10px 0 16px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 6px;
    }

    .debug-details summary {
      cursor: pointer;
      font-size: 11.9px !important;
      color: #555 !important;
      padding: 4px 0;
    }

    .debug-namespace {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.9px !important;
      padding: 3px 0;
      cursor: pointer;
    }

    .debug-namespace input {
      accent-color: #5533FF;
      margin: 0;
    }

    .debug-namespaces {
      max-height: 180px;
      overflow-y: auto;
    }

    .debug-namespace-covered {
      opacity: 0.5;
      cursor: default;
    }

    .debug-namespace code {
      font-family: 'Courier New', monospace !important;
      font-size: 11.9px !important;
    }

    .debug-hint {
      display: block;
      font-size: 10.5px !important;
      color: #666 !important;
      margin-top: 4px;
    }

    .trap-result {
      font-size: 11.9px !important;
      line-height: 1.45;
      margin-top: 6px;
      overflow-wrap: anywhere;
      min-width: 0;
    }

    .trap-result li,
    .trap-result .debug-hint {
      overflow-wrap: anywhere;
    }

    .trap-modal-overlay .custom-modal {
      width: 400px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .trap-result ul {
      margin: 4px 0;
      padding-left: 16px;
    }

    .trap-result strong {
      color: #5533FF !important;
    }

    .trap-verdict {
      border: 1px solid #5533FF;
      border-left-width: 4px;
      background: rgba(85, 51, 255, 0.06);
      border-radius: 6px;
      padding: 10px 12px;
      margin: 8px 0 12px;
    }

    .trap-verdict-title {
      display: block;
      font-size: 13.5px !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      margin-bottom: 4px;
    }

    .trap-verdict-text {
      display: block;
      font-size: 12px !important;
      color: #333 !important;
    }

    .trap-verdict-warning {
      border-color: #b45309;
      background: rgba(180, 83, 9, 0.06);
    }

    .trap-highlight {
      position: fixed;
      border: 2px solid #5533FF;
      background: rgba(85, 51, 255, 0.08);
      pointer-events: none;
      z-index: 2147483646;
      display: none;
    }

    .trap-toast {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff !important;
      font-size: 12px !important;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 2147483647;
      pointer-events: none;
    }
  `;
  shadowRoot.appendChild(style);

  // Create modal
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';
  overlay.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header">
        <svg class="usertour-logo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="20" height="20" viewBox="0 0 30 30" wm-editor-extension-available="true"><defs><clipPath id="master_svg0_7_48"><rect x="0" y="0" width="30" height="30" rx="0"/></clipPath></defs><g><g clip-path="url(#master_svg0_7_48)"><g><path d="M0,6.8759790625C0,6.8759790625,8.35842,28.1924390625,8.35842,28.1924390625C8.35842,28.1924390625,9.28417,4.7900390625,9.28417,4.7900390625C9.28417,4.7900390625,0,6.8759790625,0,6.8759790625C0,6.8759790625,0,6.8759790625,0,6.8759790625Z" fill="#5533FF" fill-opacity="1"/></g><g><path d="M11.4051551171875,4.38867C11.4051551171875,4.38867,8.6512451171875,28.2246,8.6512451171875,28.2246C8.6512451171875,28.2246,29.9998451171875,0,29.9998451171875,0C29.9998451171875,0,11.4051551171875,4.38867,11.4051551171875,4.38867C11.4051551171875,4.38867,11.4051551171875,4.38867,11.4051551171875,4.38867Z" fill="#5533FF" fill-opacity="1"/></g></g></g></svg><h2 class="modal-title">Usertour Helper</h2>
        <button class="close-button" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-content">
      <h3>Selectors</h3>
      <div class="button-grid">
        <button class="custom-button select-main-only-2" aria-label="Select an element">
          <i class="fa fa-mouse-pointer"></i>
          <span>Non-unique</span>
        </button>
        <button class="custom-button select" aria-label="Select an element">
          <i class="fa fa-mouse-pointer"></i>
          <span>Unique</span>
        </button>
      </div>
      <div class="button-grid">
       
      </div>
      <h3>Options</h3>

      <div class="button-grid">
        <button class="custom-button reset-completions">
          <i class="fa fa-undo"></i>
          <span>Reset Completions</span>
        </button>
        <button class="custom-button detect-trap" title="Then click the app's modal. Hold the mouse button to click normally (e.g. to open the modal), Esc to cancel.">
          <i class="fa fa-keyboard-o"></i>
          <span>Detect focus trap</span>
        </button>
      </div>
           <div class="toggle-container">
        <span class="toggle-label">Test Mode</span>
        <label class="switch">
          <input type="checkbox" id="testModeToggle">
          <span class="slider"></span>
        </label>
      </div>
      <div class="toggle-container">
        <span class="toggle-label">Debug Mode</span>
        <label class="switch">
          <input type="checkbox" id="debugModeToggle">
          <span class="slider"></span>
        </label>
      </div>
      <details class="debug-details">
        <summary>Debug namespaces</summary>
        <div class="debug-namespaces"></div>
        <span class="debug-hint">Changes apply right away.</span>
      </details>
      <div class="page-name-section selector-field-container">
        <label class="selector-field-label">Page Name</label>
        <div class="selector-field-wrapper">
          <input type="text" class="selector-field selector-field-page-name" readonly>
          <button class="copy-button copy-button-page-name"><i class="fa fa-clone"></i><span>Copy</span></button>
        </div>
      </div>
     </div>
    </div>
  `;

  const modal = overlay.querySelector('.custom-modal');
  overlay.querySelector('.close-button').onclick = () => shadowHost.remove();
  modal.querySelector('.selector-field-page-name').value = document.title;
  shadowRoot.appendChild(overlay);
  document.body.appendChild(shadowHost);

  // Utility functions
  function attachCloseAction(button) {
    button.addEventListener('click', () => overlay.remove());
  }

  function attachButtonAction(button, action) {
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      action();
    });
  }

  // Function to show selector modal
  function showSelectorModal(selector, selectorWithTab, elementText, elementId, elementIdWithTab) {
    const existingModal = shadowRoot.querySelector('.selector-modal-overlay');
    if (existingModal) existingModal.remove();

    const selectorOverlay = document.createElement('div');
    selectorOverlay.className = 'custom-modal-overlay selector-modal-overlay';

    selectorOverlay.innerHTML = `
      <div class="custom-modal">
        <div class="modal-header">
          <svg class="usertour-logo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="20" height="20" viewBox="0 0 30 30" wm-editor-extension-available="true"><defs><clipPath id="master_svg0_7_48"><rect x="0" y="0" width="30" height="30" rx="0"/></clipPath></defs><g><g clip-path="url(#master_svg0_7_48)"><g><path d="M0,6.8759790625C0,6.8759790625,8.35842,28.1924390625,8.35842,28.1924390625C8.35842,28.1924390625,9.28417,4.7900390625,9.28417,4.7900390625C9.28417,4.7900390625,0,6.8759790625,0,6.8759790625C0,6.8759790625,0,6.8759790625,0,6.8759790625Z" fill="#5533FF" fill-opacity="1"/></g><g><path d="M11.4051551171875,4.38867C11.4051551171875,4.38867,8.6512451171875,28.2246,8.6512451171875,28.2246C8.6512451171875,28.2246,29.9998451171875,0,29.9998451171875,0C29.9998451171875,0,11.4051551171875,4.38867,11.4051551171875,4.38867C11.4051551171875,4.38867,11.4051551171875,4.38867,11.4051551171875,4.38867Z" fill="#5533FF" fill-opacity="1"/></g></g></g></svg><h2 class="modal-title">Usertour Helper</h2>
          <button class="close-button" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-content">
          <h3>Selector Details</h3>
          <div class="selector-field-container">
            <label class="selector-field-label">Element text</label>
            <div class="selector-field-wrapper">
              <input type="text" class="selector-field" readonly>
              <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
            </div>
          </div>
          <div class="selector-field-container">
            <label class="selector-field-label">CSS selector (Class)</label>
            <div class="selector-field-wrapper">
              <input type="text" class="selector-field" readonly>
              <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
            </div>
          </div>
          <div class="selector-field-container${selectorWithTab ? '' : ' custom-hidden'}">
            <label class="selector-field-label">CSS selector | Specific Tab (Class)</label>
            <div class="selector-field-wrapper">
              <input type="text" class="selector-field" readonly>
              <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
            </div>
          </div>
          <div class="selector-field-container${elementId ? '' : ' custom-hidden'}">
            <label class="selector-field-label">CSS Selector (ID)</label>
            <div class="selector-field-wrapper">
              <input type="text" class="selector-field" readonly>
              <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
            </div>
          </div>
          <div class="selector-field-container${elementIdWithTab ? '' : ' custom-hidden'}">
            <label class="selector-field-label">CSS Selector | Specific Tab (ID)</label>
            <div class="selector-field-wrapper">
              <input type="text" class="selector-field" readonly>
              <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
            </div>
          </div>
        </div>
      </div>
    `;

    const selectorModal = selectorOverlay.querySelector('.custom-modal');
    selectorModal.querySelector('.close-button').onclick = () => shadowHost.remove();

    const fieldData = [
      elementText || '',
      selector,
      selectorWithTab || '',
      elementId ? `#${elementId}` : '',
      elementIdWithTab || '',
    ];

    selectorModal.querySelectorAll('.selector-field-container').forEach((container, i) => {
      const value = fieldData[i];
      container.querySelector('.selector-field').value = value;
      const copySpan = container.querySelector('.copy-button span');
      container.querySelector('.copy-button').onclick = () => {
        navigator.clipboard.writeText(value).then(() => {
          copySpan.textContent = 'Copied';
          setTimeout(() => { copySpan.textContent = 'Copy'; }, 2000);
        });
      };
    });

    shadowRoot.appendChild(selectorOverlay);
  }

  // Select button: close + custom action
  const selectButton = modal.querySelector('.button-grid .custom-button.select');
  attachCloseAction(selectButton);
  attachButtonAction(selectButton, () => {
    function inject(doc) {
      // Add crosshair cursor style
      const style = doc.createElement("style");
      style.textContent = `* { cursor: crosshair !important }`;
      style.setAttribute("data-selector-style", "");
      doc.head.appendChild(style);

      // Ensure cursor stays crosshair even if overridden
      const observer = new MutationObserver(() => {
        doc.body.style.setProperty("cursor", "crosshair", "important");
      });
      observer.observe(doc.body, { attributes: true, attributeFilter: ["style"] });
      doc._selectorObserver = observer;

      // MutationObserver to capture original className before hover classes are added
      const classObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const el = mutation.target;
            // Only capture if we don't already have it stored
            if (!el.hasAttribute("data-original-class")) {
              // If we have oldValue, use it; otherwise use current (captured before change)
              const oldValue = mutation.oldValue !== null ? mutation.oldValue : (el.className || "");
              el.setAttribute("data-original-class", oldValue);
            }
          }
        });
      });

      // Start observing class changes on all elements
      classObserver.observe(doc.body, {
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
        subtree: true
      });
      doc._classObserver = classObserver;

      let lastHovered = null;
      let mouseDownTime = null;
      let mouseDownTarget = null;
      let preventNextClick = false;
      const CLICK_DURATION_THRESHOLD = 300; // milliseconds

      // Capture className on mouseenter (fires before mouseover and before hover states)
      function captureOriginalClass(e) {
        const el = e.target;
        if (el && el.nodeType === 1 && !el.hasAttribute("data-original-class")) {
          el.setAttribute("data-original-class", el.className || "");
        }
      }

      // Track mousedown to detect click duration
      function handleMouseDown(e) {
        mouseDownTime = Date.now();
        mouseDownTarget = e.target;
      }

      // Track mouseup and determine if it's a short click
      function handleMouseUp(e) {
        if (mouseDownTime === null) return;

        const clickDuration = Date.now() - mouseDownTime;
        const isShortClick = clickDuration < CLICK_DURATION_THRESHOLD;
        const isSameTarget = mouseDownTarget === e.target;

        // Reset tracking
        mouseDownTime = null;
        mouseDownTarget = null;

        // Only process selector for short clicks on the same target
        if (isShortClick && isSameTarget) {
          e.preventDefault();
          e.stopPropagation();
          preventNextClick = true;
          let selector = getSelector(e.target);
          let elementText = getElementText(e.target);
          let elementId = e.target.id || '';
          let selectorWithTab = null;
          // Clean up selector mode first
          window.top.postMessage("__selector_cleanup__", "*");
          // Show modal with selector and text
          showSelectorModal(selector, selectorWithTab, elementText, elementId, null);
        } else if (!isShortClick && isSameTarget) {
          // For long clicks, reset data-original-class so it can be recaptured on hoverIn
          e.target.removeAttribute("data-original-class");
        }
        // For long clicks, let the event propagate normally (don't prevent default)
      }

      // Block the click event that follows a short mouseup (prevents link navigation etc.)
      function handleClick(e) {
        if (preventNextClick) {
          preventNextClick = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }

      // Highlight hovered element
      function hoverIn(e) {
        if (lastHovered) {
          lastHovered.removeAttribute("data-selector-shadow");
          lastHovered.style.boxShadow = "";
        }
        lastHovered = e.target;
        lastHovered.setAttribute("data-selector-shadow", "");

        // Ensure we have the original className (should already be captured by mouseenter or MutationObserver)
        if (!lastHovered.hasAttribute("data-original-class")) {
          lastHovered.setAttribute("data-original-class", lastHovered.className || "");
        }

        // Special styling for iframes
        if (doc === document && lastHovered.tagName.toLowerCase() === "iframe") {
          lastHovered.style.boxShadow = "0 0 0 2px rgba(255,193,7,0.75), inset 0 0 0 9999px rgba(255,193,7,0.15)";
          try {
            lastHovered.contentDocument.documentElement.style.boxShadow = "";
          } catch { }
        } else {
          lastHovered.style.boxShadow = "0 0 0 2px rgba(0,123,255,0.75), inset 0 0 0 9999px rgba(0,123,255,0.15)";
        }
      }

      // Remove highlight on mouse out
      function hoverOut(e) {
        if (e.target === lastHovered) {
          e.target.removeAttribute("data-selector-shadow");
          e.target.style.boxShadow = "";
        }
      }

      // Extract element text with fallbacks
      function getElementText(el) {
        // First try to get text content
        let text = el.innerText || el.textContent || '';
        if (text && text.trim()) {
          return text.trim();
        }

        // Fallback to title
        if (el.title) {
          return el.title;
        }

        // Fallback to aria-label
        if (el.getAttribute('aria-label')) {
          return el.getAttribute('aria-label');
        }
        // Fallback to aria-labelledby
        if (el.getAttribute('aria-labelledby')) {
          return el.getAttribute('aria-labelledby');
        }

        // Fallback to name attribute
        if (el.name) {
          return el.name;
        }

        // Fallback to alt attribute
        if (el.alt) {
          return el.alt;
        }

        return '';
      }

      // Generate CSS selector path
      function getSelector(el) {
        let path = [];
        while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== "html") {
          let tag = el.tagName.toLowerCase();
          // Use original className if available (captured before hover classes), otherwise current className
          const originalClass = el.getAttribute("data-original-class");
          const className = originalClass !== null ? originalClass : (el.className || "");
          let cls = tag !== "body" && className
            ? "." + className.trim().split(/\s+/).map(c => CSS.escape(c)).join(".")
            : "";
          let siblings = Array.from(el.parentNode?.children || []);
          let sameTagSiblings = siblings.filter(sib => sib.tagName === el.tagName);
          let selector = `${tag}${cls}`;
          if (sameTagSiblings.length > 1 || cls === "") {
            selector += `:nth-child(${siblings.indexOf(el) + 1})`;
          }
          path.unshift(selector);
          el = el.parentElement;
        }
        return path.join(" > ");
      }

      // Cleanup function
      function destroy(doc) {
        try {
          doc.body.style.cursor = "";
          doc.querySelectorAll("style[data-selector-style]").forEach(s => s.remove());
          doc.querySelectorAll("[data-selector-shadow]").forEach(el => el.style.boxShadow = "");
          doc.querySelectorAll("[data-original-class]").forEach(el => el.removeAttribute("data-original-class"));
          doc.removeEventListener("mouseenter", captureOriginalClass, true);
          doc.removeEventListener("mousedown", handleMouseDown, true);
          doc.removeEventListener("mouseup", handleMouseUp, true);
          doc.removeEventListener("click", handleClick, true);
          doc.removeEventListener("mouseover", hoverIn);
          doc.removeEventListener("mouseout", hoverOut);
          if (doc._selectorObserver) {
            doc._selectorObserver.disconnect();
            delete doc._selectorObserver;
          }
          if (doc._classObserver) {
            doc._classObserver.disconnect();
            delete doc._classObserver;
          }
          // Clear iframe highlights in main document
          if (doc === document) {
            Array.from(document.querySelectorAll("iframe")).forEach(f => {
              f.style.boxShadow = "";
              try {
                if (f.contentDocument && f.contentDocument.documentElement) {
                  f.contentDocument.documentElement.style.boxShadow = "";
                }
              } catch (e) {
                // Cross-origin iframe, ignore
              }
            });
          }
        } catch (e) {
          console.warn("Cleanup failed:", e);
        }
      }

      // Attach event listeners
      // Use mouseenter with capture to catch className before hover effects
      doc.addEventListener("mouseenter", captureOriginalClass, true);
      doc.addEventListener("mouseover", hoverIn);
      doc.addEventListener("mouseout", hoverOut);
      doc.addEventListener("mousedown", handleMouseDown, true);
      doc.addEventListener("mouseup", handleMouseUp, true);
      doc.addEventListener("click", handleClick, true);
      window.addEventListener("message", e => {
        if (e.data === "__selector_cleanup__") destroy(doc);
      });
    }

    // Inject into main document
    inject(document);

    // Track iframe event listeners for cleanup
    const iframeHandlers = [];

    // Inject into all iframes
    Array.from(document.querySelectorAll("iframe")).forEach(f => {
      try {
        inject(f.contentDocument || f.contentWindow.document);

        const iframeMouseOver = () => {
          f.style.boxShadow = "";
          f.contentDocument.documentElement.style.boxShadow = "0 0 0 2px rgba(255,193,7,0.75), inset 0 0 0 9999px rgba(255,193,7,0.15)";
        };

        const iframeMouseOut = () => {
          f.contentDocument.documentElement.style.boxShadow = "";
        };

        f.contentDocument.documentElement.addEventListener("mouseover", iframeMouseOver);
        f.contentDocument.documentElement.addEventListener("mouseout", iframeMouseOut);

        // Store handlers for cleanup
        iframeHandlers.push({
          iframe: f,
          mouseover: iframeMouseOver,
          mouseout: iframeMouseOut,
          documentElement: f.contentDocument.documentElement
        });
      } catch (e) {
        console.warn("Cross-origin iframe skipped");
      }
    });

    // Cleanup iframe handlers when cleanup message is received
    const cleanupHandler = (e) => {
      if (e.data === "__selector_cleanup__") {
        iframeHandlers.forEach(handler => {
          try {
            handler.iframe.style.boxShadow = "";
            handler.documentElement.style.boxShadow = "";
            handler.documentElement.removeEventListener("mouseover", handler.mouseover);
            handler.documentElement.removeEventListener("mouseout", handler.mouseout);
          } catch (err) {
            // Ignore errors (e.g., iframe removed or cross-origin)
          }
        });
      }
    };

    window.addEventListener("message", cleanupHandler);
  });

  const selectButtonMainOnly2 = modal.querySelector('.button-grid .custom-button.select-main-only-2');
  attachCloseAction(selectButtonMainOnly2);
  attachButtonAction(selectButtonMainOnly2, () => {
    function inject(doc) {
      // Add crosshair cursor style
      const style = doc.createElement("style");
      style.textContent = `* { cursor: crosshair !important }`;
      style.setAttribute("data-selector-style", "");
      doc.head.appendChild(style);

      // Ensure cursor stays crosshair even if overridden
      const observer = new MutationObserver(() => {
        doc.body.style.setProperty("cursor", "crosshair", "important");
      });
      observer.observe(doc.body, { attributes: true, attributeFilter: ["style"] });
      doc._selectorObserver = observer;

      // MutationObserver to capture original className before hover classes are added
      const classObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const el = mutation.target;
            // Only capture if we don't already have it stored
            if (!el.hasAttribute("data-original-class")) {
              // If we have oldValue, use it; otherwise use current (captured before change)
              const oldValue = mutation.oldValue !== null ? mutation.oldValue : (el.className || "");
              el.setAttribute("data-original-class", oldValue);
            }
          }
        });
      });

      // Start observing class changes on all elements
      classObserver.observe(doc.body, {
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
        subtree: true
      });
      doc._classObserver = classObserver;

      let lastHovered = null;
      let mouseDownTime = null;
      let mouseDownTarget = null;
      let preventNextClick = false;
      const CLICK_DURATION_THRESHOLD = 300; // milliseconds

      // Capture className on mouseenter (fires before mouseover and before hover states)
      function captureOriginalClass(e) {
        const el = e.target;
        if (el && el.nodeType === 1 && !el.hasAttribute("data-original-class")) {
          el.setAttribute("data-original-class", el.className || "");
        }
      }

      // Track mousedown to detect click duration
      function handleMouseDown(e) {
        mouseDownTime = Date.now();
        mouseDownTarget = e.target;
      }

      // Track mouseup and determine if it's a short click
      function handleMouseUp(e) {
        if (mouseDownTime === null) return;

        const clickDuration = Date.now() - mouseDownTime;
        const isShortClick = clickDuration < CLICK_DURATION_THRESHOLD;
        const isSameTarget = mouseDownTarget === e.target;

        // Reset tracking
        mouseDownTime = null;
        mouseDownTarget = null;

        // Only process selector for short clicks on the same target
        if (isShortClick && isSameTarget) {
          e.preventDefault();
          e.stopPropagation();
          preventNextClick = true;
          let selector = getSelector(e.target);
          let selectorWithTab = getSelectorWithTab(e.target) !== selector ? getSelectorWithTab(e.target) : null;
          let elementText = getElementText(e.target);
          let elementId = e.target.id || '';
          let elementIdWithTab = null;
          if (elementId && selectorWithTab && selectorWithTab.includes('<<<')) {
            const tabPart = selectorWithTab.split('<<<')[1].trim();
            elementIdWithTab = `#${elementId} <<< ${tabPart}`;
          }
          // Clean up selector mode first
          window.top.postMessage("__selector_cleanup__", "*");
          // Show modal with selector and text
          showSelectorModal(selector, selectorWithTab, elementText, elementId, elementIdWithTab);
        }
        // For long clicks, let the event propagate normally (don't prevent default)
      }

      // Block the click event that follows a short mouseup (prevents link navigation etc.)
      function handleClick(e) {
        if (preventNextClick) {
          preventNextClick = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }

      // Highlight hovered element
      function hoverIn(e) {
        if (lastHovered) {
          lastHovered.removeAttribute("data-selector-shadow");
          lastHovered.style.boxShadow = "";
        }
        lastHovered = e.target;
        lastHovered.setAttribute("data-selector-shadow", "");

        // Ensure we have the original className (should already be captured by mouseenter or MutationObserver)
        if (!lastHovered.hasAttribute("data-original-class")) {
          lastHovered.setAttribute("data-original-class", lastHovered.className || "");
        }

        // Special styling for iframes
        if (doc === document && lastHovered.tagName.toLowerCase() === "iframe") {
          lastHovered.style.boxShadow = "0 0 0 2px rgba(255,193,7,0.75), inset 0 0 0 9999px rgba(255,193,7,0.15)";
          try {
            lastHovered.contentDocument.documentElement.style.boxShadow = "";
          } catch { }
        } else {
          lastHovered.style.boxShadow = "0 0 0 2px rgba(0,123,255,0.75), inset 0 0 0 9999px rgba(0,123,255,0.15)";
        }
      }

      // Remove highlight on mouse out
      function hoverOut(e) {
        if (e.target === lastHovered) {
          e.target.removeAttribute("data-selector-shadow");
          e.target.style.boxShadow = "";
        }
      }

      // Extract element text with fallbacks
      function getElementText(el) {
        // First try to get text content
        let text = el.innerText || el.textContent || '';
        if (text && text.trim()) {
          return text.trim();
        }

        // Fallback to title
        if (el.title) {
          return el.title;
        }

        // Fallback to aria-label
        if (el.getAttribute('aria-label')) {
          return el.getAttribute('aria-label');
        }

        // Fallback to aria-labelledby
        if (el.getAttribute('aria-labelledby')) {
          return el.getAttribute('aria-labelledby');
        }

        // Fallback to name attribute
        if (el.name) {
          return el.name;
        }

        // Fallback to alt attribute
        if (el.alt) {
          return el.alt;
        }

        return '';
      }

      // Generate CSS selector path
      function getSelector(el) {
        if (!el || el.nodeType !== 1) return "";

        let tag = el.tagName.toLowerCase();
        // Use original className if available (captured before hover classes), otherwise current className
        const originalClass = el.getAttribute("data-original-class");
        const className = originalClass !== null ? originalClass : (el.className || "");
        let cls = className
          ? "." + className.trim().split(/\s+/).map(c => CSS.escape(c)).join(".")
          : "";

        // If element has no class, find first parent with a class and add it to hierarchy
        let selector = `${tag}${cls}`;
        if (cls === "") {
          let parentWithClass = el.parentElement;
          while (parentWithClass && parentWithClass.nodeType === 1 && parentWithClass.tagName.toLowerCase() !== "html" && parentWithClass.tagName.toLowerCase() !== "body") {
            const parentOriginalClass = parentWithClass.getAttribute("data-original-class");
            const parentClassName = parentOriginalClass !== null ? parentOriginalClass : (parentWithClass.className || "");
            if (parentClassName) {
              const parentTag = parentWithClass.tagName.toLowerCase();
              const parentCls = "." + parentClassName.trim().split(/\s+/).map(c => CSS.escape(c)).join(".");
              selector = `${parentTag}${parentCls} ${selector}`;
              break;
            }
            parentWithClass = parentWithClass.parentElement;
          }
        }

        return selector;
      }

      // Generate CSS selector path
      function getSelectorWithTab(el) {
        if (!el || el.nodeType !== 1) return "";

        let tag = el.tagName.toLowerCase();
        // Use original className if available (captured before hover classes), otherwise current className
        const originalClass = el.getAttribute("data-original-class");
        const className = originalClass !== null ? originalClass : (el.className || "");
        let cls = className
          ? "." + className.trim().split(/\s+/).map(c => CSS.escape(c)).join(".")
          : "";

        // If element has no class, find first parent with a class and add it to hierarchy
        let selector = `${tag}${cls}`;
        if (cls === "") {
          let parentWithClass = el.parentElement;
          while (parentWithClass && parentWithClass.nodeType === 1 && parentWithClass.tagName.toLowerCase() !== "html" && parentWithClass.tagName.toLowerCase() !== "body") {
            const parentOriginalClass = parentWithClass.getAttribute("data-original-class");
            const parentClassName = parentOriginalClass !== null ? parentOriginalClass : (parentWithClass.className || "");
            if (parentClassName) {
              const parentTag = parentWithClass.tagName.toLowerCase();
              const parentCls = "." + parentClassName.trim().split(/\s+/).map(c => CSS.escape(c)).join(".");
              selector = `${parentTag}${parentCls} ${selector}`;
              break;
            }
            parentWithClass = parentWithClass.parentElement;
          }
        }

        // Check if element comes after div with widgetid="OASWSUPAPPSection-stc_tablist"
        const elDoc = el.ownerDocument || doc;

        // Check for tablist div in current document first
        let tablistDiv = elDoc.querySelector('div[widgetid="OASWSUPAPPSection-stc_tablist"]');
        let tablistDoc = elDoc;

        // If not found, also check main document (whether in iframe or not)
        if (!tablistDiv) {
          try {
            const mainDoc = window.top.document;
            if (mainDoc !== elDoc) {
              tablistDiv = mainDoc.querySelector('div[widgetid="OASWSUPAPPSection-stc_tablist"]');
              if (tablistDiv) {
                tablistDoc = mainDoc;
              }
            }
          } catch (e) {
            // Cross-origin iframe, ignore
          }
        }

        if (tablistDiv) {
          // Check if the selected element is a descendant of or comes after this div
          let currentEl = el;
          let isAfterTablist = false;

          // Check if element is descendant of tablist div (only if in same document)
          if (elDoc === tablistDoc) {
            while (currentEl && currentEl !== elDoc.body) {
              if (currentEl === tablistDiv) {
                isAfterTablist = true;
                break;
              }
              currentEl = currentEl.parentElement;
            }

            // If not descendant, check if element comes after tablist div in DOM
            if (!isAfterTablist && tablistDiv.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
              isAfterTablist = true;
            }
          } else {
            // Element is in iframe, tablist is in main document
            // Consider element as "after" tablist if tablist exists in main doc
            isAfterTablist = true;
          }

          if (isAfterTablist) {
            // Find the .tabLabel element with aria-selected="true" inside the tablist div
            const activeTabLabel = tablistDiv.querySelector('.tabLabel[aria-selected="true"]');

            if (activeTabLabel) {
              const elementTitle = activeTabLabel.getAttribute('title') || '';

              if (elementTitle) {
                const tabSelector = `.tabLabel[title="${CSS.escape(elementTitle)}"][aria-selected="true"]`;
                selector = `${selector} <<< ${tabSelector}`;
              }
            }
          }
        }

        return selector;
      }

      // Cleanup function
      function destroy(doc) {
        try {
          doc.body.style.cursor = "";
          doc.querySelectorAll("style[data-selector-style]").forEach(s => s.remove());
          doc.querySelectorAll("[data-selector-shadow]").forEach(el => el.style.boxShadow = "");
          doc.querySelectorAll("[data-original-class]").forEach(el => el.removeAttribute("data-original-class"));
          doc.removeEventListener("mouseenter", captureOriginalClass, true);
          doc.removeEventListener("mousedown", handleMouseDown, true);
          doc.removeEventListener("mouseup", handleMouseUp, true);
          doc.removeEventListener("click", handleClick, true);
          doc.removeEventListener("mouseover", hoverIn);
          doc.removeEventListener("mouseout", hoverOut);
          if (doc._selectorObserver) {
            doc._selectorObserver.disconnect();
            delete doc._selectorObserver;
          }
          if (doc._classObserver) {
            doc._classObserver.disconnect();
            delete doc._classObserver;
          }
          // Clear iframe highlights in main document
          if (doc === document) {
            Array.from(document.querySelectorAll("iframe")).forEach(f => {
              f.style.boxShadow = "";
              try {
                if (f.contentDocument && f.contentDocument.documentElement) {
                  f.contentDocument.documentElement.style.boxShadow = "";
                }
              } catch (e) {
                // Cross-origin iframe, ignore
              }
            });
          }
        } catch (e) {
          console.warn("Cleanup failed:", e);
        }
      }

      // Attach event listeners
      // Use mouseenter with capture to catch className before hover effects
      doc.addEventListener("mouseenter", captureOriginalClass, true);
      doc.addEventListener("mouseover", hoverIn);
      doc.addEventListener("mouseout", hoverOut);
      doc.addEventListener("mousedown", handleMouseDown, true);
      doc.addEventListener("mouseup", handleMouseUp, true);
      doc.addEventListener("click", handleClick, true);
      window.addEventListener("message", e => {
        if (e.data === "__selector_cleanup__") destroy(doc);
      });
    }

    // Inject into main document
    inject(document);

    // Track iframe event listeners for cleanup
    const iframeHandlers = [];

    // Inject into all iframes
    Array.from(document.querySelectorAll("iframe")).forEach(f => {
      try {
        inject(f.contentDocument || f.contentWindow.document);

        const iframeMouseOver = () => {
          f.style.boxShadow = "";
          f.contentDocument.documentElement.style.boxShadow = "0 0 0 2px rgba(255,193,7,0.75), inset 0 0 0 9999px rgba(255,193,7,0.15)";
        };

        const iframeMouseOut = () => {
          f.contentDocument.documentElement.style.boxShadow = "";
        };

        f.contentDocument.documentElement.addEventListener("mouseover", iframeMouseOver);
        f.contentDocument.documentElement.addEventListener("mouseout", iframeMouseOut);

        // Store handlers for cleanup
        iframeHandlers.push({
          iframe: f,
          mouseover: iframeMouseOver,
          mouseout: iframeMouseOut,
          documentElement: f.contentDocument.documentElement
        });
      } catch (e) {
        console.warn("Cross-origin iframe skipped");
      }
    });

    // Cleanup iframe handlers when cleanup message is received
    const cleanupHandler = (e) => {
      if (e.data === "__selector_cleanup__") {
        iframeHandlers.forEach(handler => {
          try {
            handler.iframe.style.boxShadow = "";
            handler.documentElement.style.boxShadow = "";
            handler.documentElement.removeEventListener("mouseover", handler.mouseover);
            handler.documentElement.removeEventListener("mouseout", handler.mouseout);
          } catch (err) {
            // Ignore errors (e.g., iframe removed or cross-origin)
          }
        });
      }
    };

    window.addEventListener("message", cleanupHandler);
  });

  // Toggle listener
  const testToggle = modal.querySelector('#testModeToggle');
  testToggle.checked = loadStorageProp("testMode") || false;
  testToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    saveToStorage("testMode", isChecked);
    usertour.enableUserTour();
  });

  // Debug mode: the SDK logger reads localStorage "debug" (comma-separated namespaces) on every log call.
  // Keep in sync with LoggerNamespace in apps/sdk/src/utils/logger.ts
  const DEBUG_NAMESPACES = [
    { ns: '*', description: 'Everything, including other libraries using "debug"' },
    { ns: 'usertour-widget:*', description: 'All Usertour SDK namespaces' },
    { ns: 'usertour-widget:app', description: 'SDK init, queue, content loading and scheduling' },
    { ns: 'usertour-widget:content', description: 'Content start/end shared by tours, checklists, launchers' },
    { ns: 'usertour-widget:tour', description: 'Tour steps, target lookup, close' },
    { ns: 'usertour-widget:focus', description: 'Keyboard focus loop for tour steps' },
    { ns: 'usertour-widget:iframe', description: 'Host-page iframes: injection, messaging, visibility' },
    { ns: 'usertour-widget:launcher', description: 'Launchers and their iframe rendering' },
    { ns: 'usertour-widget:element-watcher', description: 'Waiting for target elements to appear' },
    { ns: 'usertour-widget:conditions', description: 'Rules, conditional selectors' },
    { ns: 'usertour-widget:navigation', description: 'Navigate actions' },
    { ns: 'usertour-widget:visibility', description: 'Element visibility observer' },
  ];
  const KNOWN_NAMESPACES = DEBUG_NAMESPACES.map(entry => entry.ns);
  const debugToggle = modal.querySelector('#debugModeToggle');
  const debugNamespaceList = modal.querySelector('.debug-namespaces');

  function getDebugNamespaces() {
    return (localStorage.getItem('debug') || '')
      .split(/[\s,]+/)
      .filter(Boolean);
  }

  // Same wildcard matching as the SDK logger
  function namespaceMatches(pattern, ns) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(ns);
  }

  // The active wildcard that already turns this namespace on, if any
  function coveringPattern(ns, active) {
    return active.find(pattern => pattern !== ns && pattern.includes('*') && namespaceMatches(pattern, ns));
  }

  function setDebugNamespaces(namespaces) {
    const wasActive = getDebugNamespaces().length > 0;
    const isActive = namespaces.length > 0;
    if (isActive) {
      localStorage.setItem('debug', namespaces.join(','));
    } else {
      localStorage.removeItem('debug');
    }
    if (isActive !== wasActive) {
      console.log(isActive ? '[usertour] debug mode activated' : '[usertour] debug mode deactivated');
    }
    renderDebugNamespaces();
  }

  function renderDebugNamespaces() {
    const active = getDebugNamespaces();
    debugToggle.checked = active.length > 0;
    debugNamespaceList.innerHTML = '';
    // Known namespaces first, then any custom ones already set in localStorage (e.g. "-usertour-widget:iframe")
    const custom = active
      .filter(ns => !KNOWN_NAMESPACES.includes(ns))
      .map(ns => ({ ns, description: 'Custom value' }));
    DEBUG_NAMESPACES.concat(custom).forEach(({ ns, description }) => {
      const label = document.createElement('label');
      label.className = 'debug-namespace';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = active.includes(ns);
      label.title = description;
      // Shown as on (and locked) when a wildcard already includes it, unless it's excluded with "-"
      const coveredBy = coveringPattern(ns, active);
      if (!checkbox.checked && coveredBy && !active.includes(`-${ns}`)) {
        checkbox.checked = true;
        checkbox.disabled = true;
        label.classList.add('debug-namespace-covered');
        label.title = `${description} (included by ${coveredBy})`;
      }
      const name = document.createElement('code');
      name.textContent = ns;
      label.appendChild(checkbox);
      label.appendChild(name);
      checkbox.addEventListener('change', () => {
        const next = getDebugNamespaces().filter(n => n !== ns);
        if (checkbox.checked) next.push(ns);
        setDebugNamespaces(next);
      });
      debugNamespaceList.appendChild(label);
    });
  }

  renderDebugNamespaces();
  debugToggle.addEventListener('change', (e) => {
    setDebugNamespaces(e.target.checked ? ['*'] : []);
  });

  // Focus trap detection. Keep labels in sync with LAUNCHER_FOCUS_TRAPS in
  // packages/shared/types/src/types/sdk.ts
  const TRAP_SETTINGS = {
    auto: 'Automatic (default)',
    radix: 'Radix FocusScope',
    mui: 'MUI FocusTrap',
    dojo: 'Dojo dialogs, or a trap that lists its controls on every Tab',
    cached: 'A trap that lists its controls when the modal opens',
    carbon: 'Carbon modals',
    slow: 'Slow or animated modals',
  };
  // SDK default Tab window
  const TAB_WINDOW_MS = 100;
  const MODAL_SELECTOR = 'dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], .cds--modal, .bx--modal, .dijitDialog, .MuiModal-root';
  const TABBABLE_SELECTOR = 'a[href], button, input, select, textarea, iframe, summary, [contenteditable]:not([contenteditable="false"]), [tabindex]';

  const trapHighlight = document.createElement('div');
  trapHighlight.className = 'trap-highlight';
  shadowRoot.appendChild(trapHighlight);

  // Radix and MUI close their dialog on a press outside it
  ['pointerdown', 'mousedown', 'touchstart'].forEach((type) => {
    shadowHost.addEventListener(type, (e) => e.stopPropagation());
  });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Same-origin frames at any depth; cross-origin ones are only counted
  function getFrameDocuments(doc = document, found = { docs: [], crossOrigin: 0 }) {
    found.docs.push(doc);
    doc.querySelectorAll('iframe, frame').forEach((frame) => {
      let child = null;
      try {
        child = frame.contentDocument;
      } catch (e) {
        child = null;
      }
      if (child && child.documentElement) {
        getFrameDocuments(child, found);
      } else {
        found.crossOrigin++;
      }
    });
    return found;
  }

  function getFrameOffset(doc) {
    let left = 0;
    let top = 0;
    let view = doc.defaultView;
    while (view && view.frameElement) {
      const frame = view.frameElement;
      const rect = frame.getBoundingClientRect();
      const style = view.parent.getComputedStyle(frame);
      left += rect.left + frame.clientLeft + parseFloat(style.paddingLeft);
      top += rect.top + frame.clientTop + parseFloat(style.paddingTop);
      view = view.parent;
    }
    return { left, top };
  }

  function describeFrames(doc) {
    const path = [];
    let view = doc.defaultView;
    while (view && view.frameElement) {
      path.unshift(describe(view.frameElement));
      view = view.parent;
    }
    return path.join(' > ');
  }

  function isShown(el) {
    const view = el.ownerDocument.defaultView;
    return el.getClientRects().length > 0 && view.getComputedStyle(el).visibility !== 'hidden';
  }

  function tabbables(root) {
    return [...root.querySelectorAll(TABBABLE_SELECTOR)].filter(
      (el) => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]') && isShown(el),
    );
  }

  function describe(el) {
    if (!el) return 'nothing';
    if (el.hasAttribute && el.hasAttribute('data-usertour-trap-probe')) return 'the test button added before the first control';
    const id = el.id ? `#${el.id}` : '';
    const text = el.tagName === 'IFRAME' || el.tagName === 'FRAME' ? '' : (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return `${el.tagName.toLowerCase()}${id}${text ? ` "${text}"` : ''}`;
  }

  function fingerprint(container) {
    const doc = container.ownerDocument;
    if (container.closest('.cds--modal, .bx--modal') || container.querySelector('.cds--modal, .bx--modal, [id^="modal-end"]')) return 'carbon';
    if (doc.querySelector('[data-radix-focus-guard]') || /^radix-/.test(container.id)) return 'radix';
    if (container.closest('.MuiModal-root, .MuiDialog-root') || container.querySelector('[data-testid="sentinelStart"]')) return 'mui';
    if (container.closest('.dijitDialog') || doc.defaultView.dijit) return 'dojo';
    if (doc.querySelector('[data-focus-lock-disabled], [data-focus-guard]')) return 'react-focus-lock';
    return null;
  }

  // Firefox only focuses the iframe, not the element, unless the iframe's window has focus
  function focusElement(el) {
    const view = el.ownerDocument.defaultView;
    if (view !== window) view.focus();
    el.focus();
  }

  // Sends a synthetic Tab and records focus moves for 1.5 s; mimics the browser if nothing moves it
  async function probeTab(from, shiftKey) {
    const doc = from.ownerDocument;
    const view = doc.defaultView;
    focusElement(from);
    const start = performance.now();
    const moves = [];
    const onFocusIn = (e) => {
      moves.push({ el: e.composedPath()[0], ms: Math.round(performance.now() - start) });
    };
    doc.addEventListener('focusin', onFocusIn, true);
    // Frame's own KeyboardEvent, for instanceof checks
    const event = new view.KeyboardEvent('keydown', {
      key: 'Tab', code: 'Tab', keyCode: 9, which: 9, shiftKey, bubbles: true, cancelable: true, composed: true,
    });
    from.dispatchEvent(event);
    let browserMove = null;
    if (!event.defaultPrevented && doc.activeElement === from) {
      const order = tabbables(doc.body).filter((el) => !shadowHost.contains(el));
      browserMove = order[order.indexOf(from) + (shiftKey ? -1 : 1)] || null;
      if (browserMove) browserMove.focus();
    }
    await wait(1500);
    doc.removeEventListener('focusin', onFocusIn, true);
    const scriptMoves = moves.filter((move) => move.el !== from && move.el !== browserMove);
    return { prevented: event.defaultPrevented, browserMove, scriptMoves };
  }

  async function detectFocusTrap(container) {
    if (container.tagName === 'IFRAME' || container.tagName === 'FRAME') {
      return { error: 'This modal is in a cross-origin iframe: a bookmarklet can\'t test it. Check it with the keyboard, or run the test where the iframe\'s page is opened on its own.' };
    }
    const controls = tabbables(container).filter((el) => !el.hasAttribute('data-usertour-launcher-focus'));
    if (controls.length < 2) {
      return { error: 'This element has fewer than 2 controls: select the whole modal.' };
    }
    const doc = container.ownerDocument;
    const first = controls[0];
    const last = controls[controls.length - 1];
    const previousFocus = doc.activeElement;
    const probe = doc.createElement('button');
    probe.type = 'button';
    probe.textContent = 'Usertour test';
    probe.setAttribute('data-usertour-trap-probe', '');
    probe.style.cssText = 'position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important';
    (tabbables(container)[0] || first).before(probe);
    const steps = [];
    let pattern = 'none';
    let delay = 0;
    let movesAgain = false;
    try {
      const forward = await probeTab(last, false);
      const wrap = forward.scriptMoves.find((move) => container.contains(move.el) && move.el !== forward.browserMove);
      if (wrap) {
        pattern = wrap.el === probe ? 'live' : 'cached';
        delay = wrap.ms;
        steps.push(`Tab from the last control: ${forward.prevented ? 'cancelled by the page, ' : ''}${forward.browserMove ? `focus went to ${describe(forward.browserMove)}, then ` : ''}the page moved focus to ${describe(wrap.el)} after ${wrap.ms} ms.`);
      } else {
        steps.push(`Tab from the last control: focus went to ${describe(doc.activeElement)}; no page script wrapped it.`);
      }
      // Does focus move twice?
      if (pattern === 'cached') {
        const backward = await probeTab(first, true);
        const into = backward.scriptMoves.filter((move) => container.contains(move.el));
        movesAgain = into.length > 1 || (!!backward.browserMove && into.length > 0);
        const end = into[into.length - 1];
        steps.push(`Shift+Tab from the first control: ${into.map((move) => `${describe(move.el)} after ${move.ms} ms`).join(', then ') || 'no page script moved focus'}.`);
        if (end) delay = Math.max(delay, end.ms);
      }
    } finally {
      probe.remove();
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }
    const library = fingerprint(container);
    let setting = 'auto';
    if (pattern === 'live') {
      setting = library === 'radix' || library === 'mui' || library === 'dojo' ? library : 'dojo';
    } else if (pattern === 'cached') {
      setting = delay > TAB_WINDOW_MS ? 'slow' : library === 'carbon' || movesAgain ? 'carbon' : 'cached';
    }
    return {
      steps,
      library,
      pattern,
      delay,
      setting,
      frames: describeFrames(doc),
      tabWindow: setting === 'slow' ? Math.ceil((delay + 100) / 100) * 100 : null,
    };
  }

  function showTrapModal() {
    const existing = shadowRoot.querySelector('.trap-modal-overlay');
    if (existing) existing.remove();
    const trapOverlay = document.createElement('div');
    trapOverlay.className = 'custom-modal-overlay trap-modal-overlay';
    trapOverlay.innerHTML = `
      <div class="custom-modal">
        <div class="modal-header">
          ${overlay.querySelector('.usertour-logo').outerHTML}<h2 class="modal-title">Usertour Helper</h2>
          <button class="close-button" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-content">
          <h3>Focus Trap Details</h3>
          <div class="trap-result" aria-live="polite">Testing the focus trap…</div>
        </div>
      </div>
    `;
    trapOverlay.querySelector('.close-button').onclick = () => shadowHost.remove();
    shadowRoot.appendChild(trapOverlay);
    return trapOverlay.querySelector('.trap-result');
  }

  function trapField(label, value) {
    const container = document.createElement('div');
    container.className = 'selector-field-container';
    container.innerHTML = `
      <label class="selector-field-label"></label>
      <div class="selector-field-wrapper">
        <input type="text" class="selector-field" readonly>
        <button class="copy-button"><i class="fa fa-clone"></i><span>Copy</span></button>
      </div>
    `;
    container.querySelector('.selector-field-label').textContent = label;
    container.querySelector('.selector-field').value = value;
    const copySpan = container.querySelector('.copy-button span');
    container.querySelector('.copy-button').onclick = () => {
      navigator.clipboard.writeText(value).then(() => {
        copySpan.textContent = 'Copied';
        setTimeout(() => { copySpan.textContent = 'Copy'; }, 2000);
      });
    };
    return container;
  }

  function showTrapResult(trapResult, container, result) {
    trapResult.innerHTML = '';
    const verdict = (title, text, warning) => {
      const box = document.createElement('div');
      box.className = `trap-verdict${warning ? ' trap-verdict-warning' : ''}`;
      box.setAttribute('role', 'status');
      const strong = document.createElement('strong');
      strong.className = 'trap-verdict-title';
      strong.textContent = title;
      box.appendChild(strong);
      if (text) {
        const span = document.createElement('span');
        span.className = 'trap-verdict-text';
        span.textContent = text;
        box.appendChild(span);
      }
      trapResult.appendChild(box);
    };
    if (result.error) {
      verdict("Can't test this modal", result.error, true);
      return;
    }
    verdict(
      {
        none: 'No focus trap wrap found: the SDK needs nothing special.',
        live: 'The trap lists its controls on every Tab: it includes the launcher by itself.',
        cached: 'The trap lists its controls when the modal opens: the SDK moves focus to skipped launchers.',
      }[result.pattern],
      `Choose "${TRAP_SETTINGS[result.setting]}" in the environment's launcher focus settings${result.tabWindow ? `, or a Tab window of ${result.tabWindow} ms` : ''}.`,
    );
    trapResult.appendChild(trapField('Recommended focus trap setting', TRAP_SETTINGS[result.setting]));
    if (result.tabWindow) {
      trapResult.appendChild(trapField('Tab window (ms)', String(result.tabWindow)));
    }
    if (result.frames) {
      trapResult.appendChild(trapField('In iframe', result.frames));
    }
    trapResult.appendChild(trapField('Library marks', result.library || 'none found'));
    const list = document.createElement('ul');
    const item = (text) => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    };
    result.steps.forEach((step) => item(step));
    trapResult.appendChild(list);
    const hint = document.createElement('span');
    hint.className = 'debug-hint';
    hint.textContent = 'Synthetic key presses: a trap that ignores them looks like no trap. Check with the keyboard.';
    trapResult.appendChild(hint);
    console.log('[usertour] focus trap detection', { modal: container, ...result });
  }

  // Short click selects, long press clicks normally, Esc cancels
  function pickModal() {
    return new Promise((resolve) => {
      let hovered = null;
      let downAt = 0;
      const toast = document.createElement('div');
      toast.className = 'trap-toast';
      shadowRoot.appendChild(toast);
      const resolveTarget = (el) => (el && el.closest ? el.closest(MODAL_SELECTOR) || el : null);
      const onMove = (e) => {
        const el = resolveTarget(e.target);
        if (!el || shadowHost.contains(el)) return;
        hovered = el;
        const rect = el.getBoundingClientRect();
        const offset = getFrameOffset(el.ownerDocument);
        Object.assign(trapHighlight.style, {
          display: 'block',
          left: `${rect.left + offset.left}px`,
          top: `${rect.top + offset.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
      };
      const onDown = () => {
        downAt = Date.now();
      };
      const isPick = () => Date.now() - downAt < 300;
      const onClick = (e) => {
        if (!isPick() || shadowHost.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        done(hovered);
      };
      const onUp = (e) => {
        if (isPick() && !shadowHost.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          done(null);
        }
      };
      const listeners = [['mousemove', onMove], ['mousedown', onDown], ['mouseup', onUp], ['click', onClick], ['keydown', onKey]];
      // Iframe events stay in the iframe: listen in every same-origin frame, including new ones
      const watched = new Set();
      const watchFrames = () => {
        const { docs, crossOrigin } = getFrameDocuments();
        docs.forEach((doc) => {
          if (watched.has(doc)) return;
          watched.add(doc);
          listeners.forEach(([type, fn]) => doc.defaultView.addEventListener(type, fn, true));
        });
        toast.textContent = `Click the modal. Hold the mouse button to click normally. Esc to cancel.${crossOrigin ? ` ${crossOrigin} cross-origin iframe${crossOrigin > 1 ? 's' : ''} can't be tested.` : ''}`;
      };
      watchFrames();
      const rescan = setInterval(watchFrames, 500);
      function done(el) {
        clearInterval(rescan);
        watched.forEach((doc) => {
          try {
            listeners.forEach(([type, fn]) => doc.defaultView.removeEventListener(type, fn, true));
          } catch (e) {
          }
        });
        trapHighlight.style.display = 'none';
        toast.remove();
        resolve(el);
      }
    });
  }

  const detectTrapButton = modal.querySelector('.detect-trap');
  attachButtonAction(detectTrapButton, async () => {
    overlay.remove();
    const container = await pickModal();
    if (!container) {
      shadowRoot.appendChild(overlay);
      return;
    }
    const trapResult = showTrapModal();
    showTrapResult(trapResult, container, await detectFocusTrap(container));
  });

  // Option buttons example
  const resetCompletions = modal.querySelector('.reset-completions');
  attachButtonAction(resetCompletions, () => {
    if (localStorage.getItem("USERTOUR@0.0.1/identify-anonymous")) {
      localStorage.removeItem("USERTOUR@0.0.1/identify-anonymous");
      usertour.enableUserTour();
    }
  });

  const pageNameCopy = modal.querySelector('.page-name-section .copy-button-page-name');
  const pageNameCopyLabel = modal.querySelector('.page-name-section .copy-button-page-name span');
  attachButtonAction(pageNameCopy, () => {
    navigator.clipboard.writeText(document.title).then(() => {
      pageNameCopyLabel.textContent = 'Copied';
      setTimeout(() => {
        pageNameCopyLabel.textContent = 'Copy';
      }, 2000);
    });
  });

})();