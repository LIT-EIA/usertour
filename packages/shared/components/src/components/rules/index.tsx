import { hasError } from '@usertour/helpers';
import { Attribute, Content, RulesCondition, Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { RulesContext } from './rules-context';
import { RulesGroup } from './rules-group';

interface RulesProps {
  onDataChange?: (conds: RulesCondition[], hasError: boolean) => void;
  defaultConditions: RulesCondition[];
  isHorizontal?: boolean;
  isShowIf?: boolean;
  filterItems?: string[];
  addButtonText?: string;
  attributes?: Attribute[] | undefined;
  segments?: Segment[] | undefined;
  contents?: Content[] | undefined;
  currentContent?: Content | undefined;
  saveBuildUrl?: () => boolean;
  token?: string;
  onElementChange?: (conditionIndex: number, type: string) => void;
  disabled?: boolean;
}

export const defaultRulesItems: string[] = [
  'user-attr',
  'current-page',
  'event',
  'segment',
  'content',
  'element',
  'text-input',
  'page-name',
  'text-fill',
  'time',
  'group',
];

export const Rules = (props: RulesProps) => {
  const {
    onDataChange,
    defaultConditions,
    isHorizontal = false,
    isShowIf = true,
    filterItems = [...defaultRulesItems],
    addButtonText,
    attributes = [],
    segments = [],
    contents = [],
    currentContent,
    saveBuildUrl,
    token = '',
    onElementChange,
    disabled = false,
  } = props;
  const { t } = useTranslation();

  const handleOnChange = (conds: RulesCondition[]) => {
    const isHasError = hasError(conds, attributes);
    if (onDataChange) {
      onDataChange(conds, isHasError);
    }
  };

  const value = {
    isHorizontal,
    isShowIf,
    filterItems,
    addButtonText: addButtonText ?? t('conditions.actions.addCondition'),
    attributes,
    segments,
    contents,
    currentContent,
    saveBuildUrl,
    token,
    onElementChange,
    disabled,
  };

  return (
    <RulesContext.Provider value={value}>
      <RulesGroup defaultConditions={defaultConditions} onChange={handleOnChange} />
    </RulesContext.Provider>
  );
};

Rules.displayName = 'Rules';
