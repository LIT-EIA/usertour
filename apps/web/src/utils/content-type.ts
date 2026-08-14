// Content-type nouns that are grammatically feminine in French (checklist -> liste de
// tâches, banner -> bannière, announcement -> annonce). Everything else in
// ContentDataType (flow, launcher, nps, survey, tracker, event) is masculine, which is
// the i18next default context, so it needs no entry here.
//
// This lives in the web app (rather than @usertour/helpers) because apps/web currently
// depends on a stale published snapshot of @usertour/helpers (pinned to ^0.0.1 instead
// of workspace:*), so additions to the workspace package's source aren't picked up here
// without a separate dependency-wiring fix.
const FEMININE_CONTENT_TYPES: ReadonlySet<string> = new Set(['checklist', 'banner', 'announcement']);

export const getContentTypeGenderContext = (
  contentType?: string | null,
): 'feminine' | undefined => (contentType && FEMININE_CONTENT_TYPES.has(contentType) ? 'feminine' : undefined);
