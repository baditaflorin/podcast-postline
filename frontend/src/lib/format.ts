export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${unit}`;
}

export function shortCommit(commit: string) {
  if (commit === "dev") return "commit dev";
  return `commit ${commit.slice(0, 7)}`;
}
