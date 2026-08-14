import { EXTENSION_CONTENT_RULES, RulesType } from '@usertour-packages/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { PlusIcon, TaskClickedIcon } from '@usertour-packages/icons';
import {
  ContentIcon,
  ElementIcon,
  GroupIcon,
  PagesIcon,
  SegmentIcon,
  TextFillIcon,
  TextInputIcon,
  TimeIcon,
  UserIcon,
} from '@usertour-packages/icons';
import { RulesCondition } from '@usertour/types';
import { deepClone } from '@usertour/helpers';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useState } from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useRulesContext } from './rules-context';
import { RulesGroupContext } from '../contexts/rules-group-context';
import { RulesContent } from './rules-content';
import { RulesCurrentTime } from './rules-current-time';
import { RulesElement } from './rules-element';
import { RulesLogic } from './rules-logic';
import { RulesRemove } from './rules-remove';
import { RulesSegment } from './rules-segment';
import { RulesTextInput } from './rules-text-input';
import { RulesPageName } from './rules-page-name';
import { RulesUrlPattern } from './rules-url-pattern';
import { RulesUserAttribute } from './rules-user-attribute';
import { RulesUserFills } from './rules-user-fills';
import { RulesTaskIsClicked } from './task-clicked';
import isEqual from 'fast-deep-equal';

const buildRulesItems = (t: TFunction) => [
  {
    type: RulesType.USER_ATTR,
    text: t('conditions.types.userAttr.label'),
    IconElement: UserIcon,
    RulesElement: RulesUserAttribute,
  },
  {
    type: RulesType.COMPANY_ATTR,
    text: t('conditions.types.userAttr.groups.company'),
    IconElement: UserIcon,
    RulesElement: RulesUserAttribute,
  },
  {
    type: RulesType.CURRENT_PAGE,
    text: t('conditions.types.currentPage.label'),
    IconElement: PagesIcon,
    RulesElement: RulesUrlPattern,
  },
  // {
  //   type: "event",
  //   text: "Event",
  //   IconElement: EventIcon,
  //   RulesElement: null,
  // },
  {
    type: RulesType.SEGMENT,
    text: t('conditions.types.segment.label'),
    IconElement: SegmentIcon,
    RulesElement: RulesSegment,
  },
  {
    type: RulesType.CONTENT,
    text: t('conditions.types.content.flow'),
    IconElement: ContentIcon,
    RulesElement: RulesContent,
  },
  {
    type: RulesType.TASK_IS_CLICKED,
    text: t('conditions.types.taskClicked.label'),
    IconElement: TaskClickedIcon,
    RulesElement: RulesTaskIsClicked,
  },
  {
    type: RulesType.ELEMENT,
    text: t('conditions.types.element.label'),
    IconElement: ElementIcon,
    RulesElement: RulesElement,
  },
  {
    type: RulesType.TEXT_INPUT,
    text: t('conditions.types.textInput.label'),
    IconElement: TextInputIcon,
    RulesElement: RulesTextInput,
  },
  {
    type: RulesType.PAGE_NAME,
    text: t('conditions.types.pageName.label'),
    IconElement: PagesIcon,
    RulesElement: RulesPageName,
  },
  {
    type: RulesType.TEXT_FILL,
    text: t('conditions.types.textFill.label'),
    IconElement: TextFillIcon,
    RulesElement: RulesUserFills,
  },
  {
    type: RulesType.TIME,
    text: t('conditions.types.time.label'),
    IconElement: TimeIcon,
    RulesElement: RulesCurrentTime,
  },
  {
    type: RulesType.GROUP,
    text: t('conditions.types.group.label'),
    IconElement: GroupIcon,
    RulesElement: null,
  },
];

type RulesItems = ReturnType<typeof buildRulesItems>;

interface RulesAddDropdownProps {
  children: ReactNode;
  onSelect: (type: string) => void;
  items: RulesItems;
  disabled?: boolean;
}

const RulesAddDropdown = (props: RulesAddDropdownProps) => {
  const { children, onSelect, items, disabled = false } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ zIndex: EXTENSION_CONTENT_RULES }}>
        {items?.map(({ type, text, IconElement }, index) => (
          <DropdownMenuItem
            key={index}
            className="cursor-pointer min-w-[180px]"
            onSelect={() => {
              onSelect(type);
            }}
          >
            <IconElement width={16} height={16} className="mx-1" />
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export type RulesGroupItemProps = {
  index: number;
};

interface RulesGroupProps {
  isSubItems?: boolean;
  defaultConditions: RulesCondition[];
  onChange?: (conditions: RulesCondition[]) => void;
}
export const RulesGroup = (props: RulesGroupProps) => {
  const { isSubItems = false, onChange, defaultConditions } = props;
  const { isHorizontal, filterItems, addButtonText, disabled } = useRulesContext();
  const { t } = useTranslation();

  const [conditions, setConditions] = useState<RulesCondition[]>(deepClone(defaultConditions));
  const rulesItems = useMemo<RulesItems>(
    () =>
      buildRulesItems(t).filter((item) => {
        if (filterItems.length > 0) {
          return filterItems.includes(item.type);
        }
        return true;
      }),
    [t, filterItems],
  );

  const [conditionType, setConditionType] = useState(
    (defaultConditions.length > 0 && defaultConditions[0].operators
      ? defaultConditions[0].operators
      : 'and') ?? 'and',
  );

  const setNewConditions = (newConditions: RulesCondition[]) => {
    setConditions((prev) => {
      if (isEqual(prev, newConditions)) {
        return prev;
      }
      if (onChange) {
        onChange(newConditions);
      }
      return newConditions;
    });
  };

  const handleOnSelect = useCallback(
    (type: string) => {
      if (type === 'group') {
        setNewConditions([...conditions, { type, data: {}, conditions: [] }]);
      } else {
        setNewConditions([...conditions, { type, data: {}, operators: conditionType }]);
      }
    },
    [conditionType, conditions],
  );
  const handleOnChange = (index: number, conds: RulesCondition[]) => {
    const newConds = conditions.map((condition, i) => {
      if (i === index) {
        return {
          ...condition,
          conditions: [...conds],
        };
      }
      return condition;
    });
    setNewConditions(newConds);
  };

  useEffect(() => {
    setNewConditions(
      conditions.map((cond) => ({
        ...cond,
        operators: conditionType,
      })),
    );
  }, [conditionType]);

  const updateConditionData = useCallback(
    (index: number, data: any) => {
      const newConds = conditions.map((condition, i) => {
        if (i === index) {
          return {
            ...condition,
            ...(data && { data }),
            operators: conditionType,
          };
        }
        return condition;
      });
      setNewConditions(newConds);
    },
    [conditionType, conditions],
  );

  const value = {
    conditionType,
    setConditionType,
    conditions,
    setNewConditions,
    updateConditionData,
  };

  return (
    <RulesGroupContext.Provider value={value}>
      <div className={isHorizontal ? 'flex flex-row flex-wrap	' : 'flex flex-col space-y-2'}>
        {conditions.map((condition, i) => {
          const ITEM = rulesItems.find((item) => condition.type === item.type);
          if (condition.type === 'group' && condition.conditions) {
            return (
              <div
                className={
                  isHorizontal
                    ? 'flex flex-row space-x-1 w-full mr-1 mb-1'
                    : 'flex flex-col space-y-2'
                }
                key={i}
              >
                <RulesLogic index={i} disabled={disabled} />
                <div className="p-2 pr-6 border border-input border-dashed rounded-md w-fit relative">
                  <RulesGroup
                    isSubItems={true}
                    defaultConditions={condition.conditions}
                    onChange={(conditions: RulesCondition[]) => {
                      handleOnChange(i, conditions);
                    }}
                  />
                  {<RulesRemove index={i} />}
                </div>
              </div>
            );
          }
          if (ITEM?.RulesElement) {
            return <ITEM.RulesElement key={i} index={i} data={condition.data} type={ITEM.type} />;
          }
          return null;
        })}
        <div className="flex flex-row space-x-3">
          <RulesLogic index={conditions.length} disabled={conditions.length > 0 || disabled} />
          <RulesAddDropdown
            onSelect={handleOnSelect}
            disabled={disabled}
            items={
              isSubItems
                ? rulesItems.filter(
                    (item) => item.type !== RulesType.GROUP && item.type !== RulesType.WAIT,
                  )
                : rulesItems
            }
          >
            <div className="h-8 text-primary items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer">
              <PlusIcon width={16} height={16} />
              {addButtonText}
            </div>
          </RulesAddDropdown>
        </div>
      </div>
    </RulesGroupContext.Provider>
  );
};

RulesGroup.displayName = 'RulesGroup';
