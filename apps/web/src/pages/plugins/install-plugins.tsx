import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { useState } from 'react';
import { PluginsSidebar } from './components/sidebar';

export const InstallPlugins = () => {
  const { environmentList } = useEnvironmentListContext();
  const [testEnvironmentId, setTestEnvironmentId] = useState<string>('');
  const [prodEnvironmentId, setProdEnvironmentId] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('bookmarklets');

  return (
    <>
      <PluginsSidebar activeView={activeView} onViewChange={setActiveView} />
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow justify-center">
          {activeView === 'bookmarklets' && (
            <div className="grid gap-4 md:grid-cols-2 items-center">
              <Card className="rounded-md border bg-card text-card-foreground shadow-none">
                <CardHeader>
                  <CardTitle>Section 1</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Content for section 1</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border bg-card text-card-foreground shadow-none">
                <CardHeader>
                  <CardTitle>Section 2</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-environment">Test Environment</Label>
                    <Select value={testEnvironmentId} onValueChange={setTestEnvironmentId}>
                      <SelectTrigger id="test-environment" className="w-full">
                        <SelectValue placeholder="Select test environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {environmentList?.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prod-environment">Prod Environment</Label>
                    <Select value={prodEnvironmentId} onValueChange={setProdEnvironmentId}>
                      <SelectTrigger id="prod-environment" className="w-full">
                        <SelectValue placeholder="Select prod environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {environmentList?.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeView === 'browser-extension' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-lg text-muted-foreground">Coming soon.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

InstallPlugins.displayName = 'InstallPlugins';
