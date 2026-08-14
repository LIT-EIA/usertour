import { Attribute, Content, ContentVersion, RulesCondition, Segment, Step } from '@usertour/types';
import { ReactNode, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

export interface ContentActionsProviderProps {
  onDataChange?: (conds: RulesCondition[], hasError: boolean) => void;
  defaultConditions: RulesCondition[];
  isHorizontal?: boolean;
  isShowIf?: boolean;
  isShowLogic?: boolean;
  filterItems?: string[];
  addButtonText?: string;
  attributes?: Attribute[] | undefined;
  segments?: Segment[] | undefined;
  contents?: Content[] | undefined;
  currentContent?: Content | undefined;
  currentVersion?: ContentVersion | undefined;
  currentStep?: Step | undefined;
  saveBuildUrl?: () => boolean;
  token?: string;
  children?: ReactNode;
  zIndex: number;
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
}

// export interface ContentActionsContextValue {
//   isHorizontal: boolean;
//   isShowIf: boolean;
//   isShowLogic?: boolean;
//   filterItems: string[];
//   addButtonText: string;
//   attributes: Attribute[] | undefined;
//   segments: Segment[] | undefined;
//   contents: Content[];
//   currentContent?: Content | undefined;
//   saveBuildUrl?: () => boolean;
//   token: string;
// }
export type ContentActionsContextValue = ContentActionsProviderProps & {};
export const ContentActionsContext = createContext<ContentActionsContextValue | undefined>(
  undefined,
);

export function ContentActionsProvider(props: ContentActionsProviderProps) {
  const { t } = useTranslation();
  const {
    isHorizontal = false,
    isShowIf = true,
    addButtonText = t('actions.actions.addAction'),
    attributes,
    segments,
    contents,
    token = '',
    isShowLogic = true,
    children,
  } = props;

  const value = {
    ...props,
    isHorizontal,
    isShowIf,
    addButtonText,
    attributes,
    segments,
    contents,
    token,
    isShowLogic,
  };

  return <ContentActionsContext.Provider value={value}>{children}</ContentActionsContext.Provider>;
}

export function useContentActionsContext(): ContentActionsContextValue {
  const context = useContext(ContentActionsContext);
  if (!context) {
    throw new Error('useContentActionsContext must be used within a ContentActionsProvider.');
  }
  return context;
}
