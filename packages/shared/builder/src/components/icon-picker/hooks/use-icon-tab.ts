import { useCallback, useState, useEffect, useMemo } from 'react';
import { LauncherIconSource } from '@usertour/types';
import { getInitialTab } from '../utils';

interface UseIconTabProps {
  iconSource: LauncherIconSource;
}

export const useIconTab = ({ iconSource }: UseIconTabProps) => {
  const initialTab = useMemo(() => getInitialTab(iconSource), [iconSource]);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    setActiveTab(getInitialTab(iconSource));
  }, [iconSource]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  return { activeTab, handleTabChange };
};
