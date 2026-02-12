import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import { PagesIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

// Local validation function for page name condition
const getPageNameError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (data.logic !== 'any' && data.logic !== 'empty' && data.value === '') {
    ret.showError = true;
    ret.errorInfo = 'Please enter a value';
  }
  return ret;
};

export interface RulesPageNameProps {
  index: number;
  type: string;
  data: {
    logic: string;
    value: string;
  };
}

const conditions = [
  { value: 'is', name: 'is' },
  { value: 'not', name: 'is not' },
  { value: 'contains', name: 'contains' },
  { value: 'notContain', name: 'does not contain' },
  { value: 'startsWith', name: 'starts with' },
  { value: 'endsWith', name: 'ends with' },
  { value: 'match', name: 'matches regular expression' },
  { value: 'unmatch', name: 'does not match regular expression' },
  { value: 'any', name: 'has any value' },
  { value: 'empty', name: 'is empty' },
];

interface RulesPageNameContextValue {
  conditionValue: string;
  setConditionValue: Dispatch<SetStateAction<string>>;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
}

const RulesPageNameContext = createContext<RulesPageNameContextValue | undefined>(undefined);

function useRulesPageNameContext(): RulesPageNameContextValue {
  const context = useContext(RulesPageNameContext);
  if (!context) {
    throw new Error('useRulesPageNameContext must be used within a RulesPageNameContext.');
  }
  return context;
}

const RulesPageNameInput = () => {
  const { inputValue, setInputValue, conditionValue } = useRulesPageNameContext();
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

const RulesPageNameCondition = () => {
  const { conditionValue, setConditionValue } = useRulesPageNameContext();
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

export const RulesPageName = (props: RulesPageNameProps) => {
  const { index, data, type } = props;
  const [conditionValue, setConditionValue] = useState(data.logic ?? 'is');
  const [inputValue, setInputValue] = useState(data.value ?? '');

  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const { disabled } = useRulesContext();

  useEffect(() => {
    const updates = {
      logic: conditionValue,
      value: inputValue,
    };
    const { showError, errorInfo } = getPageNameError(updates);
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [conditionValue, inputValue, open, setErrorInfo, setOpenError]);

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
        value: inputValue,
      };
      const { showError, errorInfo } = getPageNameError(updates);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      updateConditionData(index, updates);
    },
    [conditionValue, inputValue, open, setErrorInfo, setOpenError, index, updateConditionData],
  );

  const value = {
    conditionValue,
    setConditionValue,
    inputValue,
    setInputValue,
  };

  return (
    <RulesPageNameContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <PagesIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
                <RulesPopoverTrigger className="space-y-1">
                  <div className="grow pr-6 text-sm text-wrap break-all">Page name </div>
                  <div>
                    {conditions.find((c) => c.value === conditionValue)?.name}{' '}
                    {conditionValue !== 'empty' && conditionValue !== 'any' && (
                      <span className="font-bold">{inputValue}</span>
                    )}
                  </div>
                </RulesPopoverTrigger>
                <RulesPopoverContent side="right">
                  <div className=" flex flex-col space-y-2">
                    <div>If the page name...</div>
                    <RulesPageNameCondition />
                    <RulesPageNameInput />
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesPageNameContext.Provider>
  );
};

RulesPageName.displayName = 'RulesPageName';
