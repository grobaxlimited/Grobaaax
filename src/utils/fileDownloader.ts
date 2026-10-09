/**
 * Robust cross-browser file downloader with iframe-safe fallback and automatic clipboard copy
 */
export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function downloadFile(
  url: string,
  filename: string
): Promise<{ success: boolean; blobSuccess?: boolean; copiedToClipboard?: boolean; fullUrl: string }> {
  const fullUrl = getAbsoluteDownloadUrl(url);

  // Always attempt to copy link to clipboard as a safety net in case iframe blocks download
  let copiedToClipboard = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullUrl);
      copiedToClipboard = true;
    }
  } catch {
    // Clipboard permission may be denied; proceed with download attempt
  }

  try {
    // 1. Direct anchor click with relative or absolute target
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 1500);

    return { success: true, blobSuccess: false, copiedToClipboard, fullUrl };
  } catch (directError) {
    console.warn('Direct anchor download failed, attempting blob fetch:', directError);

    try {
      // 2. Fetch as Blob fallback
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 2000);

      return { success: true, blobSuccess: true, copiedToClipboard, fullUrl };
    } catch (fallbackError) {
      console.error('All download attempts encountered restrictions:', fallbackError);
      return { success: false, copiedToClipboard, fullUrl };
    }
  }
}

/**
 * Returns the absolute URL for any path relative to the current origin
 */
export function getAbsoluteDownloadUrl(relativePath: string): string {
  if (typeof window === 'undefined') return relativePath;
  const origin = window.location.origin;
  return `${origin}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

