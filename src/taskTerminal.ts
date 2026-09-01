export function terminalNameMatchesTask(
  terminalName: string,
  taskName: string,
): boolean {
  if (terminalName === taskName) {
    return true;
  }
  if (terminalName === `Task - ${taskName}`) {
    return true;
  }
  if (terminalName.startsWith(`${taskName} (`)) {
    return true;
  }
  return terminalName.endsWith(`: ${taskName}`);
}
