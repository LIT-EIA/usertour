import { EyeNoneIcon } from '@usertour-packages/icons';
import * as SharedPopper from '@usertour-packages/sdk';
import { ChecklistContainer, ChecklistDropdown } from '@usertour-packages/sdk';
import { ChecklistProgress } from '@usertour-packages/sdk';
import { ChecklistItems } from '@usertour-packages/sdk';
import { ChecklistDismiss } from '@usertour-packages/sdk';
import { PopperMadeWith } from '@usertour-packages/sdk';
import { ChecklistStaticPopper } from '@usertour-packages/sdk';
import { ChecklistRoot } from '@usertour-packages/sdk';
import { LauncherContainer, LauncherView } from '@usertour-packages/sdk/src/launcher';
import { LauncherRoot } from '@usertour-packages/sdk/src/launcher';
import { ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { convertSettings, convertToCssVars } from '@usertour/helpers';
import { ChecklistData, ContentVersion, LauncherData, Step, Theme } from '@usertour/types';
import { cn } from '@usertour/helpers';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMeasure } from 'react-use';

// Interactive things a disabled <fieldset> does NOT disable natively (links, ARIA widgets,
// editable regions). These are announced, so they get aria-disabled.
const NON_NATIVE_WIDGETS = [
  'a[href]',
  'area[href]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  ...[
    'button',
    'link',
    'checkbox',
    'radio',
    'switch',
    'tab',
    'menuitem',
    'option',
    'slider',
    'spinbutton',
    'textbox',
    'combobox',
  ].map((role) => `[role="${role}"]`),
].join(',');
// Anything else that can take focus (custom tabindex, embeds): only removed from the tab order,
// since aria-disabled is not valid on generic elements.
const FOCUSABLE = `${NON_NATIVE_WIDGETS},[tabindex],iframe`;

const setAttr = (el: Element, name: string, value: string) => {
  // Only write on change so the MutationObserver below doesn't loop on its own writes
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

// Native form controls. The disabled fieldset already disables them per the HTML spec, but the
// attribute is also set on each one so the DOM states it explicitly (and audit tools that only
// read the element's own attribute see it).
const NATIVE_CONTROLS = 'button,input,select,textarea,optgroup,option';

const disablePreviewControls = (root: HTMLElement) => {
  for (const el of root.querySelectorAll(NATIVE_CONTROLS)) {
    setAttr(el, 'disabled', '');
  }
  for (const el of root.querySelectorAll(FOCUSABLE)) {
    setAttr(el, 'tabindex', '-1');
    if (el.matches(NON_NATIVE_WIDGETS)) setAttr(el, 'aria-disabled', 'true');
    if (el.hasAttribute('contenteditable')) setAttr(el, 'contenteditable', 'false');
  }
};

// Previews render real end-user widgets (close X, step buttons, NPS scale, inputs, links…). They
// are pictures of the content, so every control is exposed to assistive tech but disabled
// (WCAG 2.1.1, 4.1.2):
// - every button/input/select/textarea gets the `disabled` attribute (backed by a disabled
//   <fieldset>), so they are announced as "dimmed/unavailable" and skipped by Tab;
// - anything else interactive (links, ARIA widgets…) gets aria-disabled + tabindex=-1;
// - both are re-applied whenever the preview content changes (React re-renders, new elements),
//   so anything added later is covered too;
// - pointer events are off so mouse clicks fall through to the surrounding card.
// The fieldset is a named group so screen-reader users know why the controls are unavailable.
// The SDK styles `:disabled` with reduced opacity; that is undone to keep the preview faithful.
const DisabledPreview = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    disablePreviewControls(root);
    const observer = new MutationObserver(() => disablePreviewControls(root));
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'href', 'tabindex', 'role', 'contenteditable', 'aria-disabled'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <fieldset
      ref={ref}
      disabled
      aria-label={t('contents.overview.previewCard.previewAriaLabel')}
      className="m-0 min-w-0 border-0 p-0 pointer-events-none [&_*]:pointer-events-none [&_:disabled]:!opacity-100"
    >
      {children}
    </fieldset>
  );
};

const EmptyContentPreview = () => {
  // Decorative placeholder: the card title already identifies the content
  return <img src="/images/empty.png" alt="" className="h-[160px]" />;
};

interface ScaledPreviewContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

const ScaledPreviewContainer = forwardRef<HTMLDivElement, ScaledPreviewContainerProps>(
  (
    {
      children,
      maxWidth = 300,
      maxHeight = 160,
      className = 'origin-[center_center]',
      onContentRectChange,
    },
    ref,
  ) => {
    const [scale, setScale] = useState<number>(1);
    const [contentRef, contentRect] = useMeasure<HTMLDivElement>();

    // Calculate scale when content dimensions change
    useEffect(() => {
      if (!contentRect) return;

      const widthScale = maxWidth / contentRect.width;
      const heightScale = maxHeight / contentRect.height;
      const newScale = Math.min(widthScale, heightScale, 1);

      setScale(newScale);
    }, [contentRect]);

    useEffect(() => {
      if (onContentRectChange) {
        onContentRectChange(contentRect as DOMRect, scale);
      }
    }, [contentRect, scale]);

    return (
      <div
        ref={ref}
        style={{
          scale: `${scale}`,
        }}
        className={cn('[&_iframe]:pointer-events-none', className)}
      >
        <DisabledPreview>
          <div ref={contentRef as any}>{children}</div>
        </DisabledPreview>
      </div>
    );
  },
);

// Add display name for better debugging
ScaledPreviewContainer.displayName = 'ScaledPreviewContainer';

interface FlowPreviewProps {
  currentTheme: Theme;
  currentStep: Step;
}
const FlowPreview = ({ currentTheme, currentStep }: FlowPreviewProps) => {
  const isHidddenStep = currentStep.type === 'hidden';
  if (isHidddenStep) {
    return (
      <div className="w-40 h-32 flex  flex-none items-center justify-center">
        <EyeNoneIcon className="w-8 h-8" />
      </div>
    );
  }

  return (
    <SharedPopper.Popper
      open={true}
      zIndex={1}
      globalStyle={convertToCssVars(convertSettings(currentTheme.settings))}
    >
      <SharedPopper.PopperStaticContent
        arrowSize={{ width: 20, height: 10 }}
        side="bottom"
        showArrow={false}
        width={`${currentStep.setting.width}px`}
        height={'auto'}
      >
        {currentStep.setting.skippable && <SharedPopper.PopperClose />}
        <ContentEditorSerialize contents={currentStep.data} />
      </SharedPopper.PopperStaticContent>
    </SharedPopper.Popper>
  );
};

const LauncherPreview = ({
  currentTheme,
  currentVersion,
}: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const data = currentVersion.data as LauncherData;
  const themeSettings = currentTheme.settings;

  return (
    <LauncherRoot themeSettings={themeSettings} data={data}>
      <LauncherContainer>
        <LauncherView
          type={data.type}
          iconType={data.iconType}
          iconSource={data.iconSource}
          iconUrl={data.iconUrl}
          buttonText={data.buttonText}
          style={{
            zIndex: 1,
          }}
        />
      </LauncherContainer>
    </LauncherRoot>
  );
};

const ChecklistPreview = (props: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const { currentTheme, currentVersion } = props;
  const data = currentVersion.data as ChecklistData;
  const themeSettings = currentTheme.settings;

  return (
    <ChecklistRoot data={data} themeSettings={themeSettings} zIndex={10000}>
      <ChecklistContainer>
        <ChecklistStaticPopper>
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems />
          <ChecklistDismiss />
          <PopperMadeWith />
        </ChecklistStaticPopper>
      </ChecklistContainer>
    </ChecklistRoot>
  );
};

export {
  DisabledPreview,
  FlowPreview,
  LauncherPreview,
  ChecklistPreview,
  EmptyContentPreview,
  ScaledPreviewContainer,
};
