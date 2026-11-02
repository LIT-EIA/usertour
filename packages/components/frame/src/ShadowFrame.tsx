import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import {
  ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AssetAttributes, FrameContext } from './Frame';

// :host blocks inherited page styles; the container stands in for <body>
const BASE_STYLE = `
:host {
  all: initial !important;
  display: block !important;
}
.usertour-shadow-body {
  margin: 0;
  line-height: 1.5;
  background-color: hsl(var(--usertour-background));
  color: hsl(var(--usertour-foreground));
}
`;

interface ShadowFrameProps {
  children: ReactNode;
  assets?: AssetAttributes[]; // External resources to load
  className?: string; // CSS class for the shadow host element
  onLoad?: () => void; // Callback when the shadow tree and assets are ready
}

/**
 * Like Frame, but in a shadow root so screen readers don't treat each step as a new page.
 * `global` assets (font faces) load in the document head: they don't register in shadow roots.
 */
export const ShadowFrame = forwardRef<HTMLDivElement, ShadowFrameProps>((props, ref) => {
  const { children, assets = [], className = '', onLoad } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const composedRefs = useComposedRefs(ref, hostRef);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot>();
  const [container, setContainer] = useState<HTMLDivElement>();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const loadedAssetsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const style = host.ownerDocument.createElement('style');
    style.textContent = BASE_STYLE;
    const body = host.ownerDocument.createElement('div');
    body.className = 'usertour-shadow-body';
    root.replaceChildren(style, body);
    setShadowRoot(root);
    setContainer(body);
  }, []);

  const localAssets = assets.filter((asset) => !asset.global);
  const globalAssets = assets.filter((asset) => asset.global);

  const getAssetKey = (asset: AssetAttributes, index: number) =>
    asset.href || asset.src || `${asset.tagName}-${index}`;

  const checkAssetsLoaded = useCallback(() => {
    const pending = assets.filter(
      (asset, index) =>
        asset.isCheckLoaded && !loadedAssetsRef.current.has(getAssetKey(asset, index)),
    );
    setAssetsLoaded(pending.length === 0);
  }, [assets]);

  useEffect(() => {
    checkAssetsLoaded();
  }, [checkAssetsLoaded]);

  const handleAssetLoad = (asset: AssetAttributes, index: number) => {
    if (asset.isCheckLoaded) {
      loadedAssetsRef.current.add(getAssetKey(asset, index));
      checkAssetsLoaded();
    }
  };

  const renderAssets = (list: AssetAttributes[]) =>
    list.map((asset) => {
      const index = assets.indexOf(asset);
      const { tagName: TagName, isCheckLoaded, global, ...attrs } = asset;
      return (
        <TagName
          {...attrs}
          key={`${asset.tagName}-${index}`}
          onLoad={() => handleAssetLoad(asset, index)}
          onError={() => console.error('Asset failed to load:', asset, 'at index:', index)}
        />
      );
    });

  const isReady = Boolean(shadowRoot && container && assetsLoaded);

  useEffect(() => {
    if (onLoad && isReady) {
      onLoad();
    }
  }, [onLoad, isReady]);

  const setStyle = useCallback((style: string) => {
    if (hostRef.current) {
      hostRef.current.style.cssText = style;
    }
  }, []);

  const hostDocument = hostRef.current?.ownerDocument;

  return (
    <>
      <div className={className} ref={composedRefs} />

      {shadowRoot && createPortal(renderAssets(localAssets), shadowRoot)}

      {hostDocument &&
        globalAssets.length > 0 &&
        createPortal(renderAssets(globalAssets), hostDocument.head)}

      {isReady &&
        createPortal(
          <FrameContext.Provider
            value={{
              document: container!.ownerDocument,
              window: container!.ownerDocument.defaultView,
              setStyle,
              host: hostRef.current!,
              scope: shadowRoot!,
              container: container!,
            }}
          >
            {children}
          </FrameContext.Provider>,
          container!,
        )}
    </>
  );
});

ShadowFrame.displayName = 'ShadowFrame';
