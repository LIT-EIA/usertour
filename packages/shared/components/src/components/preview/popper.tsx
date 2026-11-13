import { EyeNoneIcon } from '@usertour-packages/icons';
import * as SharedPopper from '@usertour-packages/sdk';
import { ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { convertSettings, convertToCssVars } from '@usertour/helpers';
import { ThemeTypesSetting, defaultSettings } from '@usertour/types';
import { useRef } from 'react';

type CreatePopperContentProps = {
  text: string;
  data: any;
  type: string;
  key: number;
  settings: ThemeTypesSetting;
  onClick: (type: string, data: string) => void;
  width: string;
  height: string;
  scale: number;
};

export const PopperPreview = (props: CreatePopperContentProps) => {
  const { width, height, text, data, type, onClick, scale = 1 } = props;
  const handleOnClick = () => {
    onClick(type, data);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOnClick();
    }
  };
  const ref = useRef(null);
  // const serialize = data ? serializeData(JSON.parse(data)) : [];
  return (
    // Card contains a live widget preview (with its own buttons), so it cannot be a <button>;
    // expose button semantics + keyboard activation and make the preview inert (WCAG 2.1.1, 4.1.2)
    // biome-ignore lint/a11y/useSemanticElements: preview content cannot be nested in a <button>
    <div
      role="button"
      tabIndex={0}
      aria-label={text}
      className="rounded-lg bg-background-700 w-52 h-52 flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleOnClick}
      onKeyDown={handleKeyDown}
    >
      <div
        {...({ inert: '' } as React.HTMLAttributes<HTMLDivElement>)}
        className="flex-none justify-center flex flex-col items-center h-44	"
        // style={{ transform: `scale(${scale})` }}
      >
        {type !== 'hidden' && (
          <SharedPopper.Popper
            triggerRef={ref}
            open={true}
            zIndex={1111}
            globalStyle={convertToCssVars(convertSettings(defaultSettings))}
          >
            <SharedPopper.PopperStaticContent
              arrowSize={{
                width: 20,
                height: 10,
              }}
              customStyle={{ zoom: scale }}
              side="bottom"
              showArrow={type === 'tooltip'}
              width={width}
              height={height}
              arrowColor={defaultSettings?.mainColor.background}
            >
              <SharedPopper.PopperClose />
              {/* {...serialize} */}
              <ContentEditorSerialize contents={data} />
            </SharedPopper.PopperStaticContent>
          </SharedPopper.Popper>
        )}
        {type === 'hidden' && <EyeNoneIcon className="w-6 h-6" />}
      </div>
      <div className="bg-background-400 flex-none leading-8 text-foreground text-center rounded-b-lg">
        {text}
      </div>
    </div>
  );
};

PopperPreview.displayName = 'PopperPreview';
