// Test entry: the launcher widget with a fake core
import {
  DEFAULT_LAUNCHER_DATA,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  LauncherFocusTrap,
  defaultSettings,
} from '@usertour/types';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LauncherWidgetCore } from '../src/components/launcher';
import { setEnvironmentLauncherFocus, setLauncherFocusTiming } from '../src/core/launcher-focus';

const params = new URLSearchParams(location.search);
// ?side=top|right|bottom|left &action=1 (runs actions instead of a tooltip) &button=1 &target=<id>
const side = (params.get('side') ?? 'right') as 'top' | 'right' | 'bottom' | 'left';
const target = document.getElementById(params.get('target') ?? 'target') as HTMLElement;
// ?environmentTrap= &tabWindowMs= &holdFocusMs= &maxHoldCount=
if (params.has('environmentTrap')) {
  setEnvironmentLauncherFocus({ trap: params.get('environmentTrap') as LauncherFocusTrap });
}
setLauncherFocusTiming(
  Object.fromEntries(
    ['tabWindowMs', 'holdFocusMs', 'maxHoldCount']
      .filter((key) => params.has(key))
      .map((key) => [key, Number(params.get(key))]),
  ),
);

const events = { actions: 0, active: 0 };

const data: LauncherData = {
  ...DEFAULT_LAUNCHER_DATA,
  type: params.get('button') === '1' ? LauncherDataType.BUTTON : LauncherDataType.ICON,
  buttonText: 'Learn more',
  target: {
    ...DEFAULT_LAUNCHER_DATA.target,
    alignment: { ...DEFAULT_LAUNCHER_DATA.target.alignment, side },
  },
  behavior: {
    ...DEFAULT_LAUNCHER_DATA.behavior,
    actionType:
      params.get('action') === '1'
        ? LauncherActionType.PERFORM_ACTION
        : LauncherActionType.SHOW_TOOLTIP,
  },
};

const useTargetInView = () => {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return inView;
};

const Harness = () => (
  <LauncherWidgetCore
    visible={useTargetInView()}
    data={data}
    handleActions={() => {
      events.actions++;
    }}
    el={target}
    target={target}
    themeSettings={defaultSettings}
    zIndex={1000}
    handleOnClick={async () => {}}
    userInfo={{} as never}
    handleActive={() => {
      events.active++;
    }}
    removeBranding={false}
    assets={[{ tagName: 'link', rel: 'stylesheet', href: '/launcher.css', isCheckLoaded: true }]}
  />
);

createRoot(document.getElementById('usertour-widget')!).render(<Harness />);

(window as Window & { launcherTest?: unknown }).launcherTest = { events };
