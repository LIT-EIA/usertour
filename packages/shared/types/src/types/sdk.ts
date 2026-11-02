import { ContentVersion } from './contents';
import { BizSession } from './statistics';
import { PlanType } from './subscription';
import { Theme } from './theme';

export type ContentSession = {
  contentId: string;
  latestSession?: BizSession;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

export type SDKContent = ContentVersion &
  ContentSession & {
    name: string;
  };

export enum contentEndReason {
  USER_CLOSED = 'user_closed',
  TOOLTIP_TARGET_MISSING = 'tooltip_target_missing',
  SYSTEM_CLOSED = 'system_closed',
  AUTO_DISMISSED = 'auto_dismissed',
  CONTENT_NOT_FOUND = 'content_not_found',
  SESSION_TIMEOUT = 'session_timeout',
  URL_START_CLOSED = 'url_start_closed',
  USER_STARTED_OTHER_CONTENT = 'user_started_other_content',
  PROGRAM_STARTED_OTHER_CONTENT = 'program_started_other_content',
  STEP_NOT_FOUND = 'step_not_found',
  UNPUBLISHED_CONTENT = 'unpublished_content',
}

export enum contentStartReason {
  START_CONDITION = 'start_condition',
  START_FROM_URL = 'start_from_url',
  START_FROM_SESSION = 'start_from_session',
  MANUAL_START = 'manual_start',
  START_FROM_PROGRAM = 'start_from_program',
  START_FROM_CONTENT_ID = 'start_from_content_id',
  ACTION = 'action',
}

export const flowReasonTitleMap = {
  [contentStartReason.START_CONDITION]: 'Matched auto-start condition',
  [contentStartReason.START_FROM_URL]: 'Started from URL',
  [contentStartReason.START_FROM_SESSION]: 'Started from session',
  [contentStartReason.START_FROM_PROGRAM]: 'Started from program',
  [contentStartReason.START_FROM_CONTENT_ID]: 'Started from content id',
  [contentStartReason.MANUAL_START]: 'Manually started',
  [contentStartReason.ACTION]: 'Button clicked',
  [contentEndReason.USER_CLOSED]: 'User closed',
  [contentEndReason.TOOLTIP_TARGET_MISSING]: 'Tooltip target missing',
  [contentEndReason.CONTENT_NOT_FOUND]: 'Content not found',
  [contentEndReason.SESSION_TIMEOUT]: 'Session timeout',
  [contentEndReason.SYSTEM_CLOSED]: 'System closed',
  [contentEndReason.URL_START_CLOSED]: 'Closed due to URL start',
  [contentEndReason.USER_STARTED_OTHER_CONTENT]: 'User started other content',
  [contentEndReason.PROGRAM_STARTED_OTHER_CONTENT]: 'Program started other content',
  [contentEndReason.STEP_NOT_FOUND]: 'Step not found',
  [contentEndReason.AUTO_DISMISSED]: 'Auto dismissed',
  [contentEndReason.UNPUBLISHED_CONTENT]: 'Unpublished content',
};

export interface SDKConfig {
  planType: PlanType;
  removeBranding: boolean;
  // Missing on older servers
  launcherFocus?: LauncherFocusSettings;
}

export interface GetProjectSettingsResponse {
  config: SDKConfig;
  themes: Theme[];
}

// Host page focus trap a launcher may sit in (see apps/sdk/LAUNCHER_FOCUS_TRAPS.md)
export type LauncherFocusTrap =
  | 'auto'
  | 'focus-trap'
  | 'radix'
  | 'mui'
  | 'dojo'
  | 'cached'
  | 'carbon'
  | 'slow'
  | 'custom-adapter';

export interface LauncherFocusTiming {
  tabWindowMs: number;
  holdFocusMs: number;
  maxHoldCount: number;
}

export interface LauncherFocusPreset extends LauncherFocusTiming {
  fix: boolean;
}

export const LAUNCHER_FOCUS_TRAPS: LauncherFocusTrap[] = [
  'auto',
  'focus-trap',
  'radix',
  'mui',
  'dojo',
  'cached',
  'carbon',
  'slow',
  'custom-adapter',
];

const DEFAULT_LAUNCHER_FOCUS_PRESET: LauncherFocusPreset = {
  fix: true,
  tabWindowMs: 100,
  holdFocusMs: 500,
  maxHoldCount: 3,
};

// Traps that list their controls on each Tab already include the launcher
export const LAUNCHER_FOCUS_PRESETS: Record<LauncherFocusTrap, LauncherFocusPreset> = {
  auto: DEFAULT_LAUNCHER_FOCUS_PRESET,
  'focus-trap': { ...DEFAULT_LAUNCHER_FOCUS_PRESET, fix: false },
  radix: { ...DEFAULT_LAUNCHER_FOCUS_PRESET, fix: false },
  mui: { ...DEFAULT_LAUNCHER_FOCUS_PRESET, fix: false },
  dojo: { ...DEFAULT_LAUNCHER_FOCUS_PRESET, fix: false },
  cached: { ...DEFAULT_LAUNCHER_FOCUS_PRESET, holdFocusMs: 0, maxHoldCount: 0 },
  carbon: DEFAULT_LAUNCHER_FOCUS_PRESET,
  slow: { ...DEFAULT_LAUNCHER_FOCUS_PRESET, tabWindowMs: 400, holdFocusMs: 1000 },
  'custom-adapter': { ...DEFAULT_LAUNCHER_FOCUS_PRESET, fix: false },
};

// Empty timing values use the trap's preset
export interface LauncherFocusSettings {
  trap: LauncherFocusTrap;
  tabWindowMs?: number | null;
  holdFocusMs?: number | null;
  maxHoldCount?: number | null;
}
