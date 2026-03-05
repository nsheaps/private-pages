/**
 * Intercepts <a> clicks in rendered pages for client-side navigation.
 * Internal links trigger hash navigation; external links pass through.
 */
export class LinkInterceptor {
  private iframe: HTMLIFrameElement;
  private onNavigate: (path: string) => void;
  private basePath: string;
  private cleanup: (() => void) | null = null;

  constructor(
    iframe: HTMLIFrameElement,
    basePath: string,
    onNavigate: (path: string) => void,
  ) {
    this.iframe = iframe;
    this.basePath = basePath;
    this.onNavigate = onNavigate;
  }

  attach(): void {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external links, anchors, javascript:, mailto:, etc.
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      event.preventDefault();

      // Resolve relative path
      const resolvedPath = href.startsWith('/')
        ? href
        : this.resolveRelative(href);

      this.onNavigate(`${this.basePath}${resolvedPath}`);
    };

    const doc = this.iframe.contentDocument;
    if (doc) {
      doc.addEventListener('click', handler);
      this.cleanup = () => doc.removeEventListener('click', handler);
    }
  }

  detach(): void {
    this.cleanup?.();
    this.cleanup = null;
  }

  private resolveRelative(href: string): string {
    // Get current page path from the iframe's location or srcdoc context
    const currentPath = this.iframe.contentWindow?.location.pathname ?? '/';
    const dir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    return new URL(href, `http://localhost${dir}`).pathname;
  }
}
