import { TextFillIcon } from '@usertour-packages/icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTextFillError } from '@usertour/helpers';
import { ElementSelectorPropsData } from '@usertour/types';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { ElementSelector } from '../selector/element-selector';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

interface RulesUserFillsProps {
  index: number;
  type: string;
  data: {
    elementData: ElementSelectorPropsData;
    logic: string;
    value: string;
  };
}

export const RulesUserFills = (props: RulesUserFillsProps) => {
  const { index, data, type } = props;
  const { t } = useTranslation();
  const [elementData, setElementData] = useState<ElementSelectorPropsData>(
    data.elementData || {
      type: 'auto',
      precision: 'strict',
      isDynamicContent: false,
      sequence: '1st',
    },
  );
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const [errorInfo, setErrorInfo] = useState('');
  const { currentContent, token, onElementChange, disabled } = useRulesContext();

  useEffect(() => {
    const updates = {
      elementData,
    };
    const { showError, errorInfo } = getTextFillError(updates);
    if (showError && !open) {
      setOpenError(showError);
      setErrorInfo(errorInfo);
      return;
    }
  }, [elementData, open, setErrorInfo, setOpenError]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const updates = {
        elementData,
      };
      const { showError, errorInfo } = getTextFillError(updates);
      if (showError) {
        setOpenError(showError);
        setErrorInfo(errorInfo);
        return;
      }
      updateConditionData(index, updates);
    },
    [elementData, index, updateConditionData, setErrorInfo, setOpenError],
  );

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <RulesLogic index={index} disabled={disabled} />
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesConditionIcon>
              <TextFillIcon width={16} height={16} />
            </RulesConditionIcon>
            <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
              <RulesPopoverTrigger className="space-y-1">
                <div className="grow pr-6 text-sm text-wrap break-all">
                  {t('conditions.types.textFill.prefix')}{' '}
                </div>
                <div>
                  {elementData && elementData.type === 'auto' && elementData.screenshot && (
                    <img
                      className="max-w-32	max-h-16 border rounded"
                      src={elementData.screenshot}
                    />
                  )}
                  {elementData &&
                    elementData.type === 'manual' &&
                    (elementData.content || elementData.customSelector) && (
                      <span className="font-bold space-x-1">
                        {elementData.content} {elementData.customSelector}
                      </span>
                    )}
                  {elementData &&
                    elementData.type === 'manual' &&
                    elementData.content === '' &&
                    elementData.customSelector === '' && (
                      <span className="font-bold text-destructive">
                        {t('conditions.types.element.notSelected')}
                      </span>
                    )}
                </div>
              </RulesPopoverTrigger>
              <RulesPopoverContent side="right">
                <div className=" flex flex-col space-y-2">
                  <div>{t('conditions.types.textFill.editorTitle')}</div>
                  {/* <RulesUserFillsSelector /> */}
                  <ElementSelector
                    data={{
                      ...elementData,
                      type: elementData?.type || 'auto',
                    }}
                    onDataChange={setElementData}
                    isInput={true}
                    currentContent={currentContent}
                    token={token}
                    onElementChange={
                      onElementChange
                        ? () => {
                            if (onElementChange) onElementChange(index, type);
                          }
                        : undefined
                    }
                  />
                </div>
              </RulesPopoverContent>
            </RulesPopover>
            <RulesRemove index={index} />
          </RulesConditionRightContent>
        </RulesErrorAnchor>
        <RulesErrorContent>{errorInfo}</RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesUserFills.displayName = 'RulesUserFills';
