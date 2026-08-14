import { CompanyIcon, EventIcon2, UserIcon, UserIcon2 } from '@usertour-packages/icons';
import { Separator } from '@usertour-packages/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { useTranslation } from 'react-i18next';
import { SettingsContent } from '../components/content';
import { AttributeListContent } from './components/attribute-list-content';
import { AttributeListHeader } from './components/attribute-list-header';

export const SettingsAttributeList = () => {
  const { t } = useTranslation();
  return (
    <SettingsContent>
      <AttributeListHeader />
      <Separator />
      <Tabs defaultValue="user" className="h-full space-y-6 ">
        <div className="space-between flex items-center">
          <TabsList>
            <TabsTrigger value="user" className="relative">
              <UserIcon width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.user')}
            </TabsTrigger>
            <TabsTrigger value="company">
              <CompanyIcon width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.company')}
            </TabsTrigger>
            <TabsTrigger value="membership">
              <UserIcon2 width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.membership')}
            </TabsTrigger>
            <TabsTrigger value="event">
              <EventIcon2 width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.event')}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="user" className="border-none p-0 outline-none">
          <AttributeListContent bizType={1} />
        </TabsContent>
        <TabsContent
          value="company"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={2} />
        </TabsContent>
        <TabsContent
          value="membership"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={3} />
        </TabsContent>
        <TabsContent
          value="event"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={4} />
        </TabsContent>
      </Tabs>
    </SettingsContent>
  );
};

SettingsAttributeList.displayName = 'SettingsAttributeList';
