const FORMAT_ALIASES = new Map([
  ["Power Apps", "Power Apps"], ["Power Automate", "Power Automate"], ["Copilot Studio", "Copilot Studio"],
  ["Dataverse solution／PCF", "Dataverse solution／PCF"], ["Web アプリ", "Web アプリ"], ["Web", "Web アプリ"],
  ["モバイル／デスクトップアプリ", "モバイル／デスクトップアプリ"], ["モバイル／デスクトップ", "モバイル／デスクトップアプリ"],
  ["デスクトップアプリ", "モバイル／デスクトップアプリ"], ["モバイルアプリ", "モバイル／デスクトップアプリ"],
  ["AI ツール", "AI ツール"], ["AI", "AI ツール"], ["OSS", "OSS"], ["テンプレート／部品", "テンプレート／部品"],
]);
const USES = ["仕事効率化", "暮らし・家計", "学習", "クリエイター支援", "コミュニケーション", "開発者ツール"];

function choices(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  const text = String(value ?? "").trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).map((v) => v.trim()).filter(Boolean);
    } catch {
      // Keep the normal delimiter path so malformed input is rejected as unknown.
    }
  }
  return text.split(/[;；,、\r\n]+/).map((v) => v.trim()).filter(Boolean);
}

export function normalizeTypesAndUses(value) {
  const selected = choices(value);
  const unknown = selected.filter((v) => v !== "その他" && !FORMAT_ALIASES.has(v) && !USES.includes(v));
  if (unknown.length) return { status: "要確認", unknown };
  const hasOther = selected.includes("その他");
  const tags = [...new Set(selected.filter((v) => FORMAT_ALIASES.has(v)).map((v) => FORMAT_ALIASES.get(v)))];
  if (hasOther && !tags.includes("その他")) tags.push("その他");
  const categories = [...new Set(selected.filter((v) => USES.includes(v)))];
  if (hasOther && !categories.includes("その他")) categories.push("その他");
  return { status: "ok", type: tags.length ? tags.join(" / ") : "その他", tags, categories: categories.length ? categories : ["その他"] };
}

export function normalizeRelatedUrls(value) {
  const lines = String(value ?? "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  if (!lines.length) return { status: "ok", sourceUrl: null, instructionsUrl: null };
  const result = { sourceUrl: null, instructionsUrl: null };
  const seen = new Set();
  for (const line of lines) {
    const match = /^(ソース|手順):\s*(\S+)$/.exec(line);
    if (!match || seen.has(match[1])) return { status: "要確認" };
    let url;
    try { url = new URL(match[2]); } catch { return { status: "要確認" }; }
    if (url.protocol !== "https:") return { status: "要確認" };
    seen.add(match[1]);
    result[match[1] === "ソース" ? "sourceUrl" : "instructionsUrl"] = url.href;
  }
  return { status: "ok", ...result };
}
