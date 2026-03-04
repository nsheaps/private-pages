import type { RenderContext } from './types';

/**
 * Renders fetched HTML content in the browser.
 *
 * Two strategies:
 * 1. SW mode: iframe src points to /__pages__/ URL pattern intercepted by SW
 * 2. Fallback: iframe srcdoc with blob URL rewriting
 */
export class PageRenderer {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Render using Service Worker interception.
   * The SW intercepts /__pages__/* requests and serves from OPFS.
   */
  renderWithServiceWorker(context: RenderContext, path: string): void {
    this.cleanup();
    const iframe = document.createElement('iframe');
    iframe.className = 'pp-rendered-page';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    const pagePath = path.startsWith('/') ? path : `/${path}`;
    iframe.src = `/__pages__/${context.owner}/${context.repo}/${context.branch}${pagePath}`;

    this.container.appendChild(iframe);
    this.iframe = iframe;
  }

  /**
   * Fallback: render HTML directly via srcdoc.
   * Relative URLs won't resolve unless rewritten to blob URLs.
   */
  renderWithSrcdoc(htmlContent: string, baseHref?: string): void {
    this.cleanup();
    const iframe = document.createElement('iframe');
    iframe.className = 'pp-rendered-page';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.sandbox.add(
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-forms',
    );

    let html = htmlContent;
    if (baseHref) {
      // Inject <base> tag so relative URLs resolve
      html = html.replace(
        /(<head[^>]*>)/i,
        `$1<base href="${baseHref}">`,
      );
    }

    iframe.srcdoc = html;
    this.container.appendChild(iframe);
    this.iframe = iframe;
  }

  cleanup(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  getIframe(): HTMLIFrameElement | null {
    return this.iframe;
  }
}
