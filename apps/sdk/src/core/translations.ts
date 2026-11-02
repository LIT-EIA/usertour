import { ChecklistStrings } from '@usertour-packages/sdk';
import { document as hostDocument } from '../utils/globals';

// To add a language: extend Language and TRANSLATIONS, and map its tags in getPageLanguage
export type Language = 'en' | 'fr';

export type TargetType =
  | 'button'
  | 'link'
  | 'textField'
  | 'searchField'
  | 'checkbox'
  | 'radio'
  | 'comboBox'
  | 'listBox'
  | 'slider'
  | 'switch'
  | 'tab'
  | 'menuItem'
  | 'image'
  | 'heading'
  | 'navigation'
  | 'table'
  | 'list'
  | 'form'
  | 'text'
  | 'element';

export interface TourStrings {
  // e.g. "Step 2 of 5"
  stepLabel: (stepNumber: number, totalSteps: number) => string;
  // e.g. "Step 2 of 5: Welcome"
  stepWithHeading: (stepLabel: string, heading: string) => string;
  escapeHint: string;
  targetHint: string;
}

export interface TargetIntroStrings {
  types: Record<Exclude<TargetType, 'heading'>, string>;
  heading: (level: number) => string;
  intro: (type: string, label: string) => string;
  tabHint: (type: string) => string;
}

export interface LauncherStrings {
  // e.g. "Help: Save"
  label: (targetLabel: string) => string;
  tooltipHint: string;
}

interface Translation {
  bypassBlock: string;
  tour: TourStrings;
  targetIntro: TargetIntroStrings;
  launcher: LauncherStrings;
  checklist: ChecklistStrings;
  taskCompleted: (taskName: string, progress: string) => string;
}

export interface Translations extends Translation {
  lang?: string;
}

const TRANSLATIONS: Record<Language, Translation> = {
  en: {
    bypassBlock: 'Skip to interactive help menu',
    tour: {
      stepLabel: (stepNumber, totalSteps) => `Step ${stepNumber} of ${totalSteps}`,
      stepWithHeading: (stepLabel, heading) => `${stepLabel}: ${heading}`,
      escapeHint: 'Press Escape to close the tour.',
      targetHint: 'Press Tab to move to the tour step. Press Escape to close the tour.',
    },
    targetIntro: {
      types: {
        button: 'button',
        link: 'link',
        textField: 'text field',
        searchField: 'search field',
        checkbox: 'checkbox',
        radio: 'radio button',
        comboBox: 'combo box',
        listBox: 'list box',
        slider: 'slider',
        switch: 'switch',
        tab: 'tab',
        menuItem: 'menu item',
        image: 'image',
        navigation: 'navigation',
        table: 'table',
        list: 'list',
        form: 'form',
        text: 'text',
        element: 'element',
      },
      heading: (level) => `heading level ${level}`,
      intro: (type, label) => `Tooltip pointing to ${type}${label ? ` ${label}` : ''}`,
      tabHint: (type) => `Use Tab to navigate between the tooltip and the ${type}.`,
    },
    launcher: {
      label: (targetLabel) => (targetLabel ? `Help: ${targetLabel}` : 'Help'),
      tooltipHint: 'Press Escape to close the tooltip.',
    },
    checklist: {
      launcherLabel: (buttonText, remaining) =>
        remaining === 0
          ? `${buttonText}, all tasks completed`
          : `${buttonText}, ${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`,
      collapse: 'Collapse checklist',
      panelHint: 'Press Escape to collapse the checklist.',
      tasks: 'Tasks',
      completed: 'completed',
      notCompleted: 'not completed',
      locked: 'Complete the previous tasks first.',
      progressLabel: 'Progress',
      progress: (done, total) => `${done} of ${total} tasks completed`,
      dismiss: 'Dismiss checklist',
      dismissConfirm: 'Dismiss checklist?',
      confirmDismiss: 'Yes, dismiss',
      cancel: 'Cancel',
    },
    taskCompleted: (taskName, progress) => `Task completed: ${taskName}. ${progress}`,
  },
  // French typography: non-breaking space before ":" and "?"
  fr: {
    bypassBlock: "Aller au menu d'aide interactif",
    tour: {
      stepLabel: (stepNumber, totalSteps) => `Étape ${stepNumber} sur ${totalSteps}`,
      stepWithHeading: (stepLabel, heading) => `${stepLabel}\u00a0: ${heading}`,
      escapeHint: 'Appuyez sur Échap pour fermer la visite guidée.',
      targetHint:
        "Appuyez sur Tab pour aller à l'étape de la visite guidée. Appuyez sur Échap pour fermer la visite guidée.",
    },
    targetIntro: {
      types: {
        button: 'le bouton',
        link: 'le lien',
        textField: 'le champ de texte',
        searchField: 'le champ de recherche',
        checkbox: 'la case à cocher',
        radio: 'le bouton radio',
        comboBox: 'la liste déroulante',
        listBox: 'la zone de liste',
        slider: 'le curseur',
        switch: "l'interrupteur",
        tab: "l'onglet",
        menuItem: "l'élément de menu",
        image: "l'image",
        navigation: 'la navigation',
        table: 'le tableau',
        list: 'la liste',
        form: 'le formulaire',
        text: 'le texte',
        element: "l'élément",
      },
      heading: (level) => `le titre de niveau ${level}`,
      intro: (type, label) => `Infobulle pointant vers ${type}${label ? ` ${label}` : ''}`,
      tabHint: (type) => `Utilisez Tab pour naviguer entre l'infobulle et ${type}.`,
    },
    launcher: {
      label: (targetLabel) => (targetLabel ? `Aide\u00a0: ${targetLabel}` : 'Aide'),
      tooltipHint: "Appuyez sur Échap pour fermer l'infobulle.",
    },
    checklist: {
      launcherLabel: (buttonText, remaining) =>
        remaining === 0
          ? `${buttonText}, toutes les tâches sont terminées`
          : `${buttonText}, ${remaining} ${remaining === 1 ? 'tâche restante' : 'tâches restantes'}`,
      collapse: 'Réduire la liste de tâches',
      panelHint: 'Appuyez sur Échap pour réduire la liste de tâches.',
      tasks: 'Tâches',
      completed: 'terminée',
      notCompleted: 'non terminée',
      locked: "Terminez d'abord les tâches précédentes.",
      progressLabel: 'Progression',
      progress: (done, total) =>
        `${done} ${done > 1 ? 'tâches terminées' : 'tâche terminée'} sur ${total}`,
      dismiss: 'Masquer la liste de tâches',
      dismissConfirm: 'Masquer la liste de tâches\u00a0?',
      confirmDismiss: 'Oui, masquer',
      cancel: 'Annuler',
    },
    taskCompleted: (taskName, progress) => `Tâche terminée\u00a0: ${taskName}. ${progress}`,
  },
};

/** Any fr-* tag gets French, else English. Read on each call to follow runtime changes. */
export const getPageLanguage = (
  doc: Document | undefined = hostDocument,
): { lang?: string; language: Language } => {
  const lang = doc?.documentElement?.getAttribute('lang')?.trim() || undefined;
  const primary = lang?.split(/[-_]/)[0].toLowerCase();
  return { lang, language: primary === 'fr' ? 'fr' : 'en' };
};

export const getTranslations = (doc: Document | undefined = hostDocument): Translations => {
  const { lang, language } = getPageLanguage(doc);
  const translation = TRANSLATIONS[language];
  return { ...translation, lang, checklist: { ...translation.checklist, lang } };
};

export const getTourStrings = (
  doc: Document | undefined = hostDocument,
): TourStrings & { lang?: string } => {
  const { lang, tour } = getTranslations(doc);
  return { ...tour, lang };
};

/** @param currentStepIndex - 0-based */
export const getStepLabel = (
  currentStepIndex: number,
  totalSteps: number,
  strings: TourStrings = getTourStrings(),
): string => strings.stepLabel(currentStepIndex + 1, totalSteps);
