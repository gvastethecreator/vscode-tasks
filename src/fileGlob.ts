const MAX_GLOB_LENGTH = 256;
const MAX_CACHE_SIZE = 128;

export type CompiledFileGlob = {
  pattern: string;
  regex?: RegExp;
  error?: string;
};

const cache = new Map<string, CompiledFileGlob>();

export function normalizeRelativePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function compileFileGlob(value: string | undefined): CompiledFileGlob {
  const pattern = normalizeRelativePath(value?.trim() ?? "");
  const cached = cache.get(pattern);
  if (cached) {
    return cached;
  }
  let result: CompiledFileGlob;
  if (!pattern) {
    result = { pattern };
  } else if (pattern.length > MAX_GLOB_LENGTH) {
    result = { pattern, error: `File glob must be ${MAX_GLOB_LENGTH} characters or fewer.` };
  } else if (/\p{Cc}/u.test(pattern)) {
    result = { pattern, error: "File glob cannot contain control characters." };
  } else {
    result = { pattern, regex: new RegExp(`^${globSource(pattern)}$`, "u") };
  }
  remember(pattern, result);
  return result;
}

export function matchesFileGlob(
  pattern: string | undefined,
  relativePath: string | undefined,
): boolean {
  const compiled = compileFileGlob(pattern);
  if (!compiled.pattern) {
    return true;
  }
  if (!compiled.regex || !relativePath) {
    return false;
  }
  return compiled.regex.test(normalizeRelativePath(relativePath));
}

export function fileGlobCacheSize(): number {
  return cache.size;
}

export function clearFileGlobCache(): void {
  cache.clear();
}

function remember(pattern: string, compiled: CompiledFileGlob): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const first = cache.keys().next().value as string | undefined;
    if (first !== undefined) {
      cache.delete(first);
    }
  }
  cache.set(pattern, compiled);
}

function globSource(pattern: string): string {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (character === "?") {
      source += "[^/]";
      continue;
    }
    source += escapeRegExp(character);
  }
  return source;
}

function escapeRegExp(value: string): string {
  return /[\\^$.*+?()[\]{}|]/.test(value) ? `\\${value}` : value;
}
