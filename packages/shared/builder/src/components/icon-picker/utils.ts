import { LauncherIconSource } from '@usertour/types';
import { IconsList } from '@usertour-packages/sdk';
import { TAB_VALUES } from './constants';

export const getInitialTab = (iconSource: LauncherIconSource): string => {
  if (iconSource === LauncherIconSource.NONE) {
    return TAB_VALUES.NONE;
  }
  if (iconSource === LauncherIconSource.UPLOAD) {
    return TAB_VALUES.UPLOAD;
  }
  if (iconSource === LauncherIconSource.URL) {
    return TAB_VALUES.URL;
  }
  return TAB_VALUES.BUILTIN;
};

export const getActiveText = (iconSource: LauncherIconSource, iconType: string): string => {
  if (iconSource === LauncherIconSource.NONE) {
    return 'No icon';
  }
  if (iconSource === LauncherIconSource.UPLOAD) {
    return 'Uploaded icon';
  }
  if (iconSource === LauncherIconSource.URL) {
    return 'URL icon';
  }
  return IconsList.find((item) => item.name === iconType)?.text ?? iconType;
};

export const getActiveIcon = (iconType: string) => {
  return IconsList.find((item) => item.name === iconType)?.ICON;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
