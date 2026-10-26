export type JsonObject = Record<string, unknown>;

export type StatusBarIcon = {
  id?: string | null;
};

export type StatusBarStyle = {
  label?: string;
  icon?: StatusBarIcon;
  color?: string;
  backgroundColor?: string;
  detail?: string;
  hide?: boolean;
  fileGlob?: string;
  running?: StatusBarStyle;
};

export type TaskOptions = {
  cwd?: string;
  statusbar?: StatusBarStyle;
};

export type TaskConfig = JsonObject & {
  type?: string;
  label?: string;
  detail?: string;
  script?: string;
  path?: string;
  command?: string | string[];
  args?: unknown[];
  options?: TaskOptions;
  windows?: JsonObject;
  osx?: JsonObject;
  linux?: JsonObject;
  dependsOn?: unknown;
  isBackground?: boolean;
};

export type TasksFile = JsonObject & {
  version?: string;
  tasks?: TaskConfig[];
  windows?: JsonObject;
  osx?: JsonObject;
  linux?: JsonObject;
  options?: TaskOptions;
};

export type TaskLike = {
  name: string;
  source?: string;
  detail?: string;
  definition: JsonObject & { type: string };
  scope?: unknown;
  isBackground?: boolean;
};

export type RunKind = "once" | "background";

export type ColorValue =
  | { type: "hex"; value: string }
  | { type: "theme"; value: string };

export type ResolvedAttrs = {
  label: string;
  icon?: string;
  color?: ColorValue;
  backgroundColor?: string;
  detail?: string;
  hide: boolean;
  runKind?: RunKind;
  fileGlob?: string;
  fileGlobError?: string;
};

export type StatusBarDefaults = {
  hide: boolean;
  color: string;
};

export type SelectSettings = {
  label: string;
  color: string;
  icon: string;
  showLabel: boolean;
};

export type RunningControlSettings = {
  indicator: boolean;
  highlight: boolean;
};

export type StatusBarSettings = {
  defaults: StatusBarDefaults;
  limit: number;
  compact: boolean;
  select: SelectSettings;
  running: RunningControlSettings;
};
