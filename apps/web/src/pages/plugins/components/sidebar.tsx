import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { BookmarkIcon, CubeIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface PluginsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const PluginsSidebar = ({ activeView, onViewChange }: PluginsSidebarProps) => {
  const { t } = useTranslation();
  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-2xl font-semibold">{t('plugins.sidebar.title')}</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>{t('plugins.sidebar.webExtensions')}</AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={() => onViewChange('bookmarklets')}
          variant={activeView === 'bookmarklets' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-1 ${
            activeView === 'bookmarklets' ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
          }`}
        >
          <BookmarkIcon className="w-4 h-4" />
          {t('plugins.sidebar.bookmarklets')}
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={() => onViewChange('browser-extension')}
          variant={activeView === 'browser-extension' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-1 ${
            activeView === 'browser-extension' ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
          }`}
        >
          <CubeIcon className="w-4 h-4" />
          {t('plugins.sidebar.browserExtension')}
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

PluginsSidebar.displayName = 'PluginsSidebar';
