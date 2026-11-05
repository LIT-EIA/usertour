import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { HelpTooltip } from '@usertour-packages/shared-components';
import { ChangeEvent, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentError, ContentErrorAnchor, ContentErrorContent } from '../content-error';
import { useContentPlacement } from './content-placement-context';
import { SelectorButtons } from './selector-buttons';
import { SequenceSelect } from './sequence-select';

export const ContentPlacementManual = () => {
  const { target, onTargetChange, zIndex, isShowError } = useContentPlacement();
  const { t } = useTranslation();
  const errorId = useId();
  const hasError = Boolean(isShowError && !target?.customSelector);

  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTargetChange({ content: e.target.value });
    },
    [onTargetChange],
  );

  const handleSelectorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTargetChange({ customSelector: e.target.value });
    },
    [onTargetChange],
  );

  const handleSelectorSelect = useCallback(
    (selector: string) => {
      onTargetChange({ customSelector: selector });
    },
    [onTargetChange],
  );

  const handleSequenceChange = useCallback(
    (value: number | string) => {
      onTargetChange({ sequence: String(value) });
    },
    [onTargetChange],
  );

  return (
    <ContentError open={hasError}>
      <div className="flex flex-col space-y-2">
        {/* <h2 className="text-sm">{subTitle}</h2> */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-start items-center space-x-1">
            <Label htmlFor="element-text">{t('contentBuilder.shared.elementText')}</Label>
            <HelpTooltip>{t('contentBuilder.shared.elementTextTooltip')}</HelpTooltip>
          </div>
          <Input id="element-text" value={target?.content ?? ''} onChange={handleContentChange} />
          <div className="flex justify-start items-center space-x-1	">
            <Label htmlFor="css-selector">{t('contentBuilder.shared.cssSelector')}</Label>
            <HelpTooltip>{t('contentBuilder.shared.cssSelectorTooltip')}</HelpTooltip>
          </div>

          <ContentErrorAnchor>
            <Input
              id="css-selector"
              value={target?.customSelector ?? ''}
              onChange={handleSelectorChange}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? errorId : undefined}
            />
          </ContentErrorAnchor>

          <SelectorButtons selectors={target?.selectorsList} onSelect={handleSelectorSelect} />

          <SequenceSelect
            value={target?.sequence}
            onChange={handleSequenceChange}
            zIndex={zIndex + EXTENSION_SELECT}
          />
        </div>
      </div>
      <ContentErrorContent id={errorId} style={{ zIndex: zIndex + EXTENSION_SELECT }}>
        {t('contentBuilder.shared.cssSelectorRequired')}
      </ContentErrorContent>
    </ContentError>
  );
};
