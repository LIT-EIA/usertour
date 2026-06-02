import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Button } from '@usertour-packages/button';
import { Card, CardContent } from '@usertour-packages/card';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { useEffect, useMemo, useState } from 'react';
import { PluginsSidebar } from './components/sidebar';

export const InstallPlugins = () => {
  const { environmentList } = useEnvironmentListContext();
  const [testEnvironmentId, setTestEnvironmentId] = useState<string>('');
  const [prodEnvironmentId, setProdEnvironmentId] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('bookmarklets');

  const generateBookmarklet = useMemo(() => {
    if (!testEnvironmentId || !prodEnvironmentId || !environmentList) {
      return '#';
    }

    const testEnvironment = environmentList.find((env) => env.id === testEnvironmentId);
    const prodEnvironment = environmentList.find((env) => env.id === prodEnvironmentId);

    if (!testEnvironment?.token || !prodEnvironment?.token) {
      return '#';
    }

    const url =
      typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
    const baseCode = `const iframe = document.createElement("iframe");

iframe.style.display = "none";

document.body.appendChild(iframe);

window.URL = iframe.contentWindow.URL;

document.body.removeChild(iframe);

!function(){var e="undefined"==typeof window?{}:window,r=e.usertour;if(console.log("enter npm backage, usertour:",r),!r){var t="/libraries/usertour/js/";console.log("enter npm backage: ",t);var n=null;r=e.usertour={_stubbed:!0,load:function(){return n||(n=new Promise((function(r,o){var s=document.createElement("script");s.async=!0;var a=e.USERTOURJS_ENV_VARS||{};"es2020"===(a.USERTOURJS_BROWSER_TARGET||function(e){for(var r=[[/Edg\\//,/Edg\\/(\\d+)/,80],[/OPR\\//,/OPR\\/(\\d+)/,67],[/Chrome\\//,/Chrome\\/(\\d+)/,80],[/CriOS\\//,/CriOS\\/(\\d+)/,100],[/Safari\\//,/Version\\/(\\d+)/,14],[/Firefox\\//,/Firefox\\/(\\d+)/,74]],t=0;t<r.length;t++){var n=r[t],o=n[0],s=n[1],a=n[2];if(e.match(o)){var i=e.match(new RegExp(s));if(i&&parseInt(i[1],10)>=a)return"es2020";break}}return"legacy"}(navigator.userAgent))?(s.type="module",s.src=a.USERTOURJS_ES2020_URL||t+"es2020/usertour.js"):s.src=a.USERTOURJS_LEGACY_URL||t+"legacy/usertour.iife.js",s.onload=function(){r()},s.onerror=function(){document.head.removeChild(s),n=null;var e=new Error("Could not load Usertour.js");console.warn(e.message),o(e)},document.head.appendChild(s)}))),n}};var o=e.USERTOURJS_QUEUE=e.USERTOURJS_QUEUE||[],s=function(e){r[e]=function(){var t=Array.prototype.slice.call(arguments);r.load(),o.push([e,null,t])}},a=function(e){r[e]=function(){var t,n=Array.prototype.slice.call(arguments);r.load();var s=new Promise((function(e,r){t={resolve:e,reject:r}}));return o.push([e,t,n]),s}},i=function(e,t){r[e]=function(){return t}};s("init"),s("off"),s("on"),s("reset"),s("setBaseZIndex"),s("setSessionTimeout"),s("setTargetMissingSeconds"),s("setCustomInputSelector"),s("setCustomNavigate"),s("setCustomScrollIntoView"),s("setInferenceAttributeFilter"),s("setInferenceAttributeNames"),s("setInferenceClassNameFilter"),s("setScrollPadding"),s("setServerEndpoint"),s("setShadowDomEnabled"),s("setPageTrackingDisabled"),s("setUrlFilter"),s("setLinkUrlDecorator"),a("endAll"),a("group"),a("identify"),a("identifyAnonymous"),a("start"),a("track"),a("updateGroup"),a("updateUser"),i("isIdentified",!1),i("isStarted",!1)}}();

!function(){function e(e){var t=localStorage.getItem("ut-configurator"),o=JSON.parse(t)||{};return o&&o[e]?o[e]:null}!function(e,t,o){t=t||100,o=o||5e3;var r=Date.now();!function n(){window.usertour&&"function"==typeof window.usertour.init?e():Date.now()-r<o?setTimeout(n,t):console.warn("Usertour object not ready after timeout")}()}(function(){usertour.enableUserTour=function(t){var o=e("testMode")?window.USERTOURJS_ENV_VARS.ENVIRONMENT_TEST:window.USERTOURJS_ENV_VARS.ENVIRONMENT_LIVE;usertour.init(o);var r=t&&t.role||usertour._app&&usertour._app.userInfo&&usertour._app.userInfo.data&&usertour._app.userInfo.data.role||null;usertour.identifyAnonymous({role:r}),function(){var t=e("testMode"),o=document.querySelector(".vertical-banner");o&&o.remove();var r=document.querySelector("style[data-testmode-style]");if(r&&r.remove(),t){var n=document.createElement("div");n.className="vertical-banner",n.innerHTML='<span class="vertical-text">Usertour Mode: Test</span>';var a=document.createElement("style");a.setAttribute("data-testmode-style","true"),a.textContent="body {  padding-left: 15px!important;}.vertical-banner {  width: 15px;  height: 100%;  background-color: rgb(255, 0, 90);  display: flex;  align-items: center;  justify-content: center;  position: fixed;  top: 0;  left: 0;  z-index: 9999;}.vertical-text {  writing-mode: vertical-lr;  text-orientation: mixed;  color: white;  font-size: 12px;  font-weight: bold;}",document.body.appendChild(a),document.body.appendChild(n)}}()}})}();

if (usertour && !usertour.isIdentified()) {

  window.USERTOURJS_ENV_VARS = {

    WS_URI:

      "${url}",

    ASSETS_URI:

      "${url}/sdk/",

    USERTOURJS_ES2020_URL:

      "${url}/sdk/es2020/usertour.js",

    USERTOURJS_LEGACY_URL:

      "${url}/sdk/legacy/usertour.iife.js",

    ENVIRONMENT_TEST: "${testEnvironment.token}",

    ENVIRONMENT_LIVE: "${prodEnvironment.token}"

  };

  usertour.enableUserTour({ role: "insert" });

}`;

    return `javascript:(function(){${baseCode}})();`;
  }, [testEnvironmentId, prodEnvironmentId, environmentList]);

  useEffect(() => {
    if (environmentList && environmentList.length > 0) {
      const firstEnvironmentId = environmentList[0]?.id ?? '';
      if (firstEnvironmentId && !testEnvironmentId && !prodEnvironmentId) {
        setTestEnvironmentId(firstEnvironmentId);
        setProdEnvironmentId(firstEnvironmentId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentList]);

  return (
    <>
      <PluginsSidebar activeView={activeView} onViewChange={setActiveView} />
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col flex-shrink min-w-0 px-4 pt-[5px] pb-6 lg:px-8 grow justify-center">
          {activeView === 'bookmarklets' && (
            <div className="flex flex-col gap-1 w-full">
              <Card className="border-0 bg-card text-card-foreground shadow-none">
                <CardContent className="p-0">
                  <div className="w-full overflow-hidden">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 1120 615.7"
                      className="h-auto ml-[40%] mr-[15.5%]"
                      preserveAspectRatio="xMidYMid meet"
                      xmlSpace="preserve"
                      version="1.1"
                    >
                      <g>
                        <title>Layer 1</title>
                        <g id="svg_1">
                          <path
                            id="svg_2"
                            fill="hsl(var(--border))"
                            d="m107.6566,75.25718c6.4,74.8 26.5,153.4 84.9,204.7c83.6,73.8 218.9,76.9 325.6,78.7c19.3,0 38.9,-0.1 58.2,2.2c57.2,5.7 120.7,31.3 143.6,88.1c21.9,51.7 -2.9,122.1 -64.5,126.5c-25.9,1.8 -52.3,-7.3 -68.5,-28.3c-25.4,-33 -24.1,-79.1 -11.8,-117c33.4,-101.7 143.2,-150.2 244,-125.6c58.3,14.5 106.5,54.5 143.7,100.1c42.8,53.1 74.2,114.4 97.5,178.2c3.3,9.1 6.4,18.3 9.1,27.6c0.3,1.1 -0.3,2.2 -1.4,2.5c-1,0.3 -2.1,-0.3 -2.5,-1.3c-32.8,-86.6 -82.3,-177.5 -152.6,-239.1c-35.2,-30.4 -78.4,-52.9 -125.1,-56.9c-85.9,-7.5 -167.8,36.7 -197.8,119.5c-14.9,40.4 -15.9,98 25.6,122.6c15.5,8.7 35.5,11.1 52.8,7.2c27.5,-6.3 46.7,-31.9 51.6,-58.9c11.1,-60.7 -33.7,-108.9 -88.8,-126.2c-27.1,-8.9 -55.8,-12.2 -84.3,-12.2c-28.8,0.5 -57.9,1.4 -86.8,0.8c-67.9,-1.3 -137.4,-6.7 -201.1,-32.2c-81.7,-32.5 -130.2,-96 -147.4,-181.4c0,0 -1.4,-7.2 -1.4,-7.2s-0.7,-3.6 -0.7,-3.6s-0.6,-3.6 -0.6,-3.6c-3.5,-21.5 -5.1,-43.5 -5.4,-65.3c0,-1.1 0.9,-2 2,-2c1.1,0.2 2,1.1 2.1,2.1l0,0z"
                          />
                        </g>
                        <g id="svg_3">
                          <path
                            id="svg_4"
                            fill="hsl(var(--border))"
                            d="m42.1566,128.85718c4.2,-3.6 7,-8.9 9.9,-13.6c2.8,-5 5.4,-10.2 7.9,-15.4c10,-20.9 18.9,-42.4 27.6,-63.9c3.2,-7.9 8.6,-21.5 11.7,-29.4c0,0 0.2,-0.5 0.2,-0.5s0.1,-0.3 0.1,-0.3c0.7,-2 2.7,-3.7 4.8,-4c3,-0.6 6.4,1.4 7.2,4.4c0.1,0.5 1.3,4.5 1.5,5.1c9.3,30.3 18.8,61.2 30.5,90.7c4.4,10.6 8.7,21.4 15.5,30.7c0.4,0.5 0.3,1.3 -0.2,1.7c-0.5,0.4 -1.2,0.3 -1.6,-0.1c-4.1,-4.4 -7.3,-9.4 -10.2,-14.5c-8.7,-15.3 -15.4,-31.7 -21.8,-48c-7.9,-20.7 -14.9,-41.9 -21.3,-63c0.3,1.1 2.2,1.7 3,0.1c0,0 -0.7,1.7 -0.7,1.7c-1,2.5 -3.8,9.6 -4.9,12.2c-11,27.1 -22.7,53.9 -36.8,79.5c-4.4,7.7 -8.8,15.4 -14.4,22.3c-1.9,2.3 -3.9,4.6 -6.6,6.3c-0.6,0.4 -1.3,0.2 -1.7,-0.3c-0.4,-0.6 -0.3,-1.4 0.3,-1.7l0,0z"
                          />
                        </g>
                      </g>
                    </svg>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-4">
                <Card className="rounded-md border bg-card text-card-foreground shadow-none flex-1">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <p className="text-md">
                        Select your environments, then drag the buttons to your{' '}
                        <em>Bookmarks Bar</em>.
                      </p>
                      <p className="text-sm">
                        If the bar is hidden, press{' '}
                        <img
                          src="/images/plugins/keyboard-shortcut.png"
                          alt="Shift + Ctrl + B"
                          className="h-9 inline-block align-middle"
                        />{' '}
                        to display it.
                      </p>

                      <div className="flex flex-col min-[971px]:flex-row gap-4">
                        <div className="space-y-2 flex-1">
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
                        <div className="space-y-2 flex-1">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-md border bg-card text-card-foreground shadow-none w-[35%] min-w-[200px]">
                  <CardContent className="h-full flex items-center justify-center p-0">
                    <div className="flex flex-col gap-4">
                      <Button
                        asChild
                        className="w-full text-center whitespace-normal break-words p-5"
                      >
                        <a
                          href="javascript:(function(){  var s=document.createElement('script');  s.src='https://cdn.jsdelivr.net/gh/lit-eia/usertour-extended/dist/bookmarklet.min.js?_='+Date.now();  s.type='text/javascript';  s.async=true;  document.body.appendChild(s);})();"
                          draggable
                          className="text-center"
                        >
                          UserTour Helper
                        </a>
                      </Button>
                      <Button
                        asChild
                        className="w-full text-center whitespace-normal break-words p-5"
                      >
                        <a href={generateBookmarklet} draggable className="text-center">
                          Start UserTour
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {activeView === 'browser-extension' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-lg text-muted-foreground">Not available yet.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

InstallPlugins.displayName = 'InstallPlugins';
