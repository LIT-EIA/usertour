import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import { TextInputIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { getTextInputError } from '@usertour/helpers';
import { ElementSelectorPropsData } from '@usertour/types';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { ElementSelector } from '../selector/element-selector';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

export interface RulesTextInputProps {
  index: number;
  type: string;
  data: {
    elementData: ElementSelectorPropsData;
    logic: string;
    value: string;
  };
}

const buildConditions = (t: TFunction) => [
  { value: 'is', name: t('conditions.operators.is') },
  { value: 'not', name: t('conditions.operators.isNot') },
  { value: 'contains', name: t('conditions.operators.contains') },
  { value: 'notContain', name: t('conditions.operators.doesNotContain') },
  { value: 'startsWith', name: t('conditions.operators.startsWith') },
  { value: 'endsWith', name: t('conditions.operators.endsWith') },
  { value: 'match', name: t('conditions.operators.matchesRegex') },
  { value: 'unmatch', name: t('conditions.operators.doesNotMatchRegex') },
  { value: 'any', name: t('conditions.operators.hasAnyValue') },
  { value: 'empty', name: t('conditions.operators.isEmpty') },
];

interface RulesTextInputContextValue {
  conditionValue: string;
  setConditionValue: Dispatch<SetStateAction<string>>;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  elementData: ElementSelectorPropsData;
  setElementData: Dispatch<SetStateAction<ElementSelectorPropsData>>;
  conditions: ReturnType<typeof buildConditions>;
}

const RulesTextInputContext = createContext<RulesTextInputContextValue | undefined>(undefined);

function useRulesTextInputContext(): RulesTextInputContextValue {
  const context = useContext(RulesTextInputContext);
  if (!context) {
    throw new Error('useRulesTextInputContext must be used within a RulesTextInputContext.');
  }
  return context;
}

const RulesTextInputInput = () => {
  const { inputValue, setInputValue, conditionValue } = useRulesTextInputContext();
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  return (
    <>
      {conditionValue !== 'empty' && conditionValue !== 'any' && (
        <Input type="text" value={inputValue} onChange={handleOnChange} placeholder={''} />
      )}
    </>
  );
};

const RulesTextInputCondition = () => {
  const { conditionValue, setConditionValue, conditions } = useRulesTextInputContext();
  return (
    <>
      <Select defaultValue={conditionValue} onValueChange={setConditionValue}>
        <SelectTrigger className="justify-start flex h-9">
          <div className="grow text-left">
            <SelectValue placeholder={''} />
          </div>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent
            style={{
              zIndex: EXTENSION_CONTENT_RULES,
            }}
          >
            {conditions.map((item, index) => {
              return (
                <SelectItem key={index} value={item.value} className="cursor-pointer">
                  {item.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </>
  );
};

export const RulesTextInput = (props: RulesTextInputProps) => {
  const { index, data, type } = props;
  const { t } = useTranslation();
  const conditions = useMemo(() => buildConditions(t), [t]);
  const [conditionValue, setConditionValue] = useState(data.logic ?? 'is');
  const [inputValue, setInputValue] = useState(data.value ?? '');

  const [elementData, setElementData] = useState<ElementSelectorPropsData>(
    data.elementData || {
      type: 'auto',
      precision: 'strict',
      isDynamicContent: false,
      sequence: '1st',
    },
  );
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const { currentContent, token, onElementChange, disabled } = useRulesContext();

  useEffect(() => {
    const updates = {
      logic: conditionValue,
      elementData,
      value: inputValue,
    };
    const { showError, errorInfo } = getTextInputError(updates);
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [conditionValue, elementData, inputValue, open, setErrorInfo, setOpenError]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const updates = {
        logic: conditionValue,
        elementData,
        value: inputValue,
      };
      const { showError, errorInfo } = getTextInputError(updates);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      updateConditionData(index, updates);
    },
    [
      conditionValue,
      elementData,
      inputValue,
      open,
      setErrorInfo,
      setOpenError,
      index,
      updateConditionData,
    ],
  );

  const value = {
    conditionValue,
    setConditionValue,
    elementData,
    setElementData,
    inputValue,
    setInputValue,
    conditions,
  };

  return (
    <RulesTextInputContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <TextInputIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
                <RulesPopoverTrigger className="space-y-1">
                  <div className="grow pr-6 text-sm text-wrap break-all">
                    {t('conditions.types.textInput.prefix')}{' '}
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
                  <div>
                    {conditions.find((c) => c.value === conditionValue)?.name}{' '}
                    {conditionValue !== 'empty' && conditionValue !== 'any' && (
                      <span className="font-bold">{inputValue}</span>
                    )}
                  </div>
                </RulesPopoverTrigger>
                <RulesPopoverContent side="right">
                  <div className=" flex flex-col space-y-2">
                    <div>{t('conditions.types.textInput.editorTitle')}</div>
                    {/* <RulesTextInputSelector /> */}
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
                    <RulesTextInputCondition />
                    <RulesTextInputInput />
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesTextInputContext.Provider>
  );
};

RulesTextInput.displayName = 'RulesTextInput';
