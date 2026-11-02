// Test entry: the checklist widget with a fake core
import {
  ChecklistCompletionOrder,
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  defaultSettings,
} from '@usertour/types';
import type { ChecklistFocusHandle } from '@usertour-packages/sdk';
import { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ChecklistWidgetCore } from '../src/components/checklist';
import { announceCompletedTasks } from '../src/core/checklist-announcer';
import { mountLiveRegion } from '../src/core/live-region';
import { BypassBlock } from '../src/core/bypass-block';
import { StepFocusManager } from '../src/core/step-focus-manager';

const params = new URLSearchParams(location.search);

const item = (id: string, name: string, extra: Partial<ChecklistItemType> = {}) =>
  ({
    id,
    name,
    isCompleted: false,
    isVisible: true,
    clickedActions: [],
    completeConditions: [],
    onlyShowTask: false,
    ...extra,
  }) as ChecklistItemType;

const initialItems = [
  item('done', 'Create a project', { isCompleted: true }),
  item('invite', 'Invite your team', { description: 'Add people to the project' }),
  item('report', 'Run a report'),
];

type State = {
  expanded: boolean;
  dismissed: boolean;
  items: ChecklistItemType[];
};

const events = { itemClicks: [] as string[], dismissed: 0 };
let state: State = {
  expanded: params.get('expanded') === '1',
  dismissed: false,
  items: initialItems,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
};
const store = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
};

const focusRef: { current: ChecklistFocusHandle | null } = { current: null };

const Harness = () => {
  const { expanded, dismissed, items } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [completionOrder] = useState(
    params.get('ordered') === '1' ? ChecklistCompletionOrder.ORDERED : ChecklistCompletionOrder.ANY,
  );
  if (dismissed) {
    return null;
  }
  const data: ChecklistData = {
    buttonText: 'Get started',
    initialDisplay: ChecklistInitialDisplay.BUTTON,
    completionOrder,
    preventDismissChecklist: false,
    autoDismissChecklist: false,
    items,
    content: [],
  };
  return (
    <ChecklistWidgetCore
      data={data}
      themeSettings={defaultSettings}
      userInfo={{} as never}
      assets={[]}
      handleItemClick={(clicked) => {
        events.itemClicks.push(clicked.id);
        if (!clicked.isCompleted) {
          setState({ expanded: false });
        }
      }}
      handleOnClick={async () => {}}
      handleDismiss={async () => {
        events.dismissed++;
        setState({ dismissed: true });
      }}
      handleExpandedChange={(value) => setState({ expanded: value })}
      reportExpandedChangeEvent={async () => {}}
      removeBranding={true}
      zIndex={1000}
      expanded={expanded}
      focusTargetId="checklist:test"
      focusRef={focusRef}
    />
  );
};

mountLiveRegion();
new BypassBlock().mount();
createRoot(document.getElementById('usertour-widget')!).render(<Harness />);

const startTour = () => {
  const host = document.createElement('div');
  host.id = 'tour-step';
  const scope = host.attachShadow({ mode: 'open' });
  scope.innerHTML =
    '<div id="root" role="dialog" aria-label="Step 1 of 1" tabindex="-1"><button id="next">Next</button></div>';
  document.getElementById('usertour-widget')!.appendChild(host);
  const manager = new StepFocusManager();
  const end = () => {
    manager.destroy(true);
    host.remove();
  };
  manager.activate({
    mode: 'modal',
    tooltipHost: host,
    tooltipScope: scope,
    tooltipRoot: scope.getElementById('root') as HTMLElement,
    label: 'Step 1 of 1',
    targetHint: '',
    zIndex: 1000,
    onEscape: end,
  });
  return end;
};

(window as Window & { checklistTest?: unknown }).checklistTest = {
  events,
  setState,
  completeTask: (id: string) => {
    const previous = state.items;
    const items = previous.map((i) => (i.id === id ? { ...i, isCompleted: true } : i));
    setState({ items });
    announceCompletedTasks(items, previous);
  },
  startTour,
};
