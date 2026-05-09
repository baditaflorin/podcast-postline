import { ProcessPreferences } from "./types";

export function curlSnippet(filename: string, preferences: ProcessPreferences) {
  return [
    "curl -fS \\",
    `  -F file=@${shellQuote(filename)} \\`,
    `  -F target_lufs=${preferences.targetLufs} \\`,
    `  -F format=${preferences.format} \\`,
    `  -F trim_silence=${preferences.trimSilence} \\`,
    `  -F denoise=${preferences.denoise} \\`,
    `  -F normalize=${preferences.normalize} \\`,
    `  -F preserve_stereo=${preferences.preserveStereo} \\`,
    `  ${preferences.apiBaseUrl.replace(/\/$/, "")}/api/process \\`,
    `  -o ${shellQuote(outputName(filename, preferences.format))}`,
  ].join("\n");
}

export function pythonSnippet(
  filename: string,
  preferences: ProcessPreferences,
) {
  return [
    "import requests",
    "",
    `url = ${JSON.stringify(`${preferences.apiBaseUrl.replace(/\/$/, "")}/api/process`)}`,
    "data = {",
    `    "target_lufs": ${JSON.stringify(String(preferences.targetLufs))},`,
    `    "format": ${JSON.stringify(preferences.format)},`,
    `    "trim_silence": ${JSON.stringify(String(preferences.trimSilence))},`,
    `    "denoise": ${JSON.stringify(String(preferences.denoise))},`,
    `    "normalize": ${JSON.stringify(String(preferences.normalize))},`,
    `    "preserve_stereo": ${JSON.stringify(String(preferences.preserveStereo))},`,
    "}",
    `with open(${JSON.stringify(filename)}, "rb") as audio:`,
    `    response = requests.post(url, data=data, files={"file": audio}, timeout=600)`,
    "response.raise_for_status()",
    `with open(${JSON.stringify(outputName(filename, preferences.format))}, "wb") as exported:`,
    "    exported.write(response.content)",
  ].join("\n");
}

function outputName(filename: string, format: string) {
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${stem || "episode"}-postline.${format}`;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
