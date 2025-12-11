import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { BookmarkIcon, CubeIcon } from '@radix-ui/react-icons';

interface PluginsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const PluginsSidebar = ({ activeView, onViewChange }: PluginsSidebarProps) => {
  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-2xl font-semibold">Plugins</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>Web Extensions</AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={() => onViewChange('bookmarklets')}
          variant={activeView === 'bookmarklets' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-1 ${
            activeView === 'bookmarklets' ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
          }`}
        >
          <BookmarkIcon className="w-4 h-4" />
          Bookmarklets
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={() => onViewChange('browser-extension')}
          variant={activeView === 'browser-extension' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-1 ${
            activeView === 'browser-extension' ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
          }`}
        >
          <CubeIcon className="w-4 h-4" />
          Browser Extension
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

PluginsSidebar.displayName = 'PluginsSidebar';
