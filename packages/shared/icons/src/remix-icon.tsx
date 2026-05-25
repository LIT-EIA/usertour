import type { RemixiconComponentType } from '@remixicon/react';

export type { RemixiconComponentType };

export type IconRegistry = Record<string, RemixiconComponentType>;

const iconRegistry: IconRegistry = {};

export const registerIcon = (name: string, icon: RemixiconComponentType): void => {
  iconRegistry[name] = icon;
};

export const registerIcons = (icons: Record<string, RemixiconComponentType>): void => {
  Object.assign(iconRegistry, icons);
};

export const getIcon = (name: string): RemixiconComponentType | undefined => {
  return iconRegistry[name];
};

export const getRegisteredIconNames = (): string[] => {
  return Object.keys(iconRegistry);
};

export { iconRegistry };
