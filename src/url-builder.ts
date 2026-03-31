import type { FitMode, OutputFormat, WmPosition } from './types.js';

/**
 * Fluent builder for Pixault image transformation URLs.
 *
 * @example
 * ```ts
 * // Named transform with overrides:
 * const url = pixault.image('tattoo', 'img_01JKABC')
 *   .transform('gallery')
 *   .width(800)
 *   .build();
 * // => "https://img.pixault.io/tattoo/img_01JKABC/t_gallery,w_800.webp"
 *
 * // Direct parameters:
 * const url = pixault.image('tattoo', 'img_01JKABC')
 *   .width(400)
 *   .quality(85)
 *   .format('avif')
 *   .build();
 * // => "https://img.pixault.io/tattoo/img_01JKABC/w_400,q_85.avif"
 * ```
 */
export class UrlBuilder {
  private readonly _baseUrl: string;
  private readonly _project: string;
  private readonly _imageId: string;
  private readonly _params: string[] = [];
  private _format: string = 'webp';
  private _transform?: string;

  /** @internal Use `Pixault.image()` instead. */
  constructor(baseUrl: string, project: string, imageId: string) {
    this._baseUrl = baseUrl.replace(/\/+$/, '');
    this._project = project;
    this._imageId = imageId;
  }

  /** Apply a named transform preset. */
  transform(name: string): this {
    this._transform = name;
    return this;
  }

  /** Set the output width in pixels. */
  width(w: number): this {
    this._params.push(`w_${w}`);
    return this;
  }

  /** Set the output height in pixels. */
  height(h: number): this {
    this._params.push(`h_${h}`);
    return this;
  }

  /** Set the resize fit mode. */
  fit(mode: FitMode): this {
    this._params.push(`fit_${mode}`);
    return this;
  }

  /** Set the output quality (1-100). */
  quality(q: number): this {
    this._params.push(`q_${q}`);
    return this;
  }

  /** Apply a Gaussian blur with the given radius. */
  blur(radius: number): this {
    this._params.push(`blur_${radius}`);
    return this;
  }

  /** Apply a watermark overlay. */
  watermark(id: string, position: WmPosition = 'br', opacity: number = 30): this {
    this._params.push(`wm_${id}`);
    this._params.push(`wm_pos_${position}`);
    this._params.push(`wm_opacity_${opacity}`);
    return this;
  }

  /** Set the output format. Default is "webp". */
  format(fmt: OutputFormat | string): this {
    this._format = fmt.replace(/^\./, '');
    return this;
  }

  /** Build the final CDN URL. */
  build(): string {
    const allParams: string[] = [];

    if (this._transform) {
      allParams.push(`t_${this._transform}`);
    }

    allParams.push(...this._params);

    if (allParams.length === 0) {
      return `${this._baseUrl}/${this._project}/${this._imageId}/original.${this._format}`;
    }

    return `${this._baseUrl}/${this._project}/${this._imageId}/${allParams.join(',')}.${this._format}`;
  }

  /**
   * Generate a single `<img>` tag with `srcset` using auto-format negotiation.
   * The browser picks the best width; the CDN picks the best format via `Vary: Accept`.
   */
  toImgTag(options: {
    alt: string;
    widths?: number[];
    sizes?: string;
    loading?: 'lazy' | 'eager';
    class?: string;
  }): string {
    const widths = (options.widths ?? [400, 800, 1200]).sort((a, b) => a - b);
    const maxWidth = widths[widths.length - 1];
    const tp = this._buildTransformParams();
    const sizes = this._escapeAttr(options.sizes ?? '100vw');
    const alt = this._escapeAttr(options.alt);
    const loading = options.loading ?? 'lazy';
    const cls = options.class ? ` class="${this._escapeAttr(options.class)}"` : '';

    const srcset = widths
      .map(w => `${this._baseUrl}/${this._project}/${this._imageId}/${tp}w_${w}.auto ${w}w`)
      .join(', ');
    const src = `${this._baseUrl}/${this._project}/${this._imageId}/${tp}w_${maxWidth}.auto`;

    return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${alt}" width="${maxWidth}" loading="${loading}" decoding="async"${cls}>`;
  }

  /**
   * Generate a `<picture>` element with AVIF and WebP `<source>` elements
   * and a JPEG fallback `<img>`. Provides both format negotiation and responsive sizing.
   */
  toPictureTag(options: {
    alt: string;
    widths?: number[];
    sizes?: string;
    loading?: 'lazy' | 'eager';
    class?: string;
  }): string {
    const widths = (options.widths ?? [400, 800, 1200]).sort((a, b) => a - b);
    const maxWidth = widths[widths.length - 1];
    const tp = this._buildTransformParams();
    const sizes = this._escapeAttr(options.sizes ?? '100vw');
    const alt = this._escapeAttr(options.alt);
    const loading = options.loading ?? 'lazy';
    const cls = options.class ? ` class="${this._escapeAttr(options.class)}"` : '';

    const avifSrcset = widths
      .map(w => `${this._baseUrl}/${this._project}/${this._imageId}/${tp}w_${w}.avif ${w}w`)
      .join(', ');
    const webpSrcset = widths
      .map(w => `${this._baseUrl}/${this._project}/${this._imageId}/${tp}w_${w}.webp ${w}w`)
      .join(', ');
    const fallback = `${this._baseUrl}/${this._project}/${this._imageId}/${tp}w_${maxWidth}.jpg`;

    return `<picture>` +
      `<source srcset="${avifSrcset}" type="image/avif" sizes="${sizes}">` +
      `<source srcset="${webpSrcset}" type="image/webp" sizes="${sizes}">` +
      `<img src="${fallback}" alt="${alt}" width="${maxWidth}" loading="${loading}" decoding="async"${cls}>` +
      `</picture>`;
  }

  private _buildTransformParams(): string {
    const parts: string[] = [];
    if (this._transform) parts.push(`t_${this._transform}`);
    parts.push(...this._params);
    return parts.length > 0 ? parts.join(',') + ',' : '';
  }

  private _escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  toString(): string {
    return this.build();
  }
}
