export function isIOS() { return /iPad|iPhone|iPod/i.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1; }
const urls = new Set();
export function releaseDownloads() { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); }
export async function saveFile(blob, filename) {
  if (isIOS()) {
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    if (!navigator.canShare || !navigator.share || !navigator.canShare({ files: [file] })) throw Error("当前浏览器不支持文件分享，请在 Safari 中重试。");
    try { await navigator.share({ files: [file] }); return true; }
    catch (error) { if (error?.name === "AbortError") return false; throw Error("系统分享失败，当前卷仍保留，可以再次保存。"); }
  }
  const url = URL.createObjectURL(blob);
  urls.add(url);
  try {
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.rel = "noopener"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  } finally { setTimeout(() => { if (urls.delete(url)) URL.revokeObjectURL(url); }, 1000); }
  return true;
}
