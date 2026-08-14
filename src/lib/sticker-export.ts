import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { isTelegramMiniApp } from "@/lib/client-auth";
import { A4_LANDSCAPE_MM } from "@/lib/sticker-layout";

function telegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp as
    | {
        platform?: string;
        initData?: string;
        downloadFile?: (
          params: { url: string; file_name: string },
          cb?: (ok: boolean) => void,
        ) => void;
      }
    | undefined;
}

/** window.print is unavailable or broken in Telegram WebViews. */
export function stickerPrintNeedsExport(): boolean {
  if (typeof window === "undefined") return false;
  if (isTelegramMiniApp()) return true;
  const platform = telegramWebApp()?.platform;
  return platform === "ios" || platform === "android";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function sharePdf(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const payload = { files: [file], title, text: title };

  if (typeof navigator !== "undefined" && "share" in navigator) {
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
    };
    const can =
      typeof nav.canShare === "function" ? nav.canShare({ files: [file] }) : true;
    if (can) {
      try {
        await nav.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
  }

  downloadBlob(blob, filename);
}

function waitFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });
}

async function nodeToImage(node: HTMLElement): Promise<string> {
  const options = {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    skipFonts: true,
  };
  try {
    return await toPng(node, options);
  } catch {
    return await toJpeg(node, { ...options, quality: 0.92 });
  }
}

async function capturePages(pageNodes: HTMLElement[]): Promise<string[]> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:2147483000",
    "pointer-events:none",
    "opacity:1",
    "background:#fff",
  ].join(";");
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }
    const images: string[] = [];
    for (const node of pageNodes) {
      const clone = node.cloneNode(true) as HTMLElement;
      host.replaceChildren(clone);
      await waitFrames(2);
      images.push(await nodeToImage(clone));
    }
    return images;
  } finally {
    host.remove();
  }
}

export async function exportStickerPdf(
  pageNodes: HTMLElement[],
  title: string,
): Promise<void> {
  if (pageNodes.length === 0) return;

  const images = await capturePages(pageNodes);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  images.forEach((dataUrl, i) => {
    if (i > 0) pdf.addPage("a4", "landscape");
    pdf.addImage(
      dataUrl,
      dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG",
      0,
      0,
      A4_LANDSCAPE_MM.width,
      A4_LANDSCAPE_MM.height,
      undefined,
      "FAST",
    );
  });

  const blob = pdf.output("blob");
  const safeName = title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const filename = `${safeName || "nakleyka"}-A4.pdf`;
  await sharePdf(blob, filename, `Наклейка: ${title}`);
}
