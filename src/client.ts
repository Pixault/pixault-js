import type {
  DerivedAsset,
  ImageListFilter,
  ImageListResponse,
  ImageMetadata,
  MetadataUpdate,
  PixaultConfig,
  ProcessingStatus,
  UploadOptions,
  UploadResponse,
  Watermark,
} from './types.js';
import { UrlBuilder } from './url-builder.js';

/**
 * Pixault SDK client — URL generation, upload, and image management.
 *
 * @example
 * ```ts
 * import { Pixault } from '@pixault/sdk';
 *
 * const pixault = new Pixault({
 *   baseUrl: 'https://img.pixault.io',
 *   defaultProject: 'barber',
 *   clientId: 'px_cl_a1b2c3d4',
 *   clientSecret: 'pk_...',
 * });
 *
 * // Generate URLs
 * const url = pixault.image('img_01JKABC').width(800).build();
 *
 * // Upload
 * const result = await pixault.upload('barber', file);
 *
 * // Metadata
 * const meta = await pixault.getMetadata('barber', 'img_01JKABC');
 * ```
 */
export class Pixault {
  private readonly _config: PixaultConfig;

  constructor(config: PixaultConfig) {
    this._config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
    };
  }

  // ── URL builder ──

  /**
   * Create a URL builder for a specific project and image.
   */
  image(project: string, imageId: string): UrlBuilder;
  /**
   * Create a URL builder using the default project.
   */
  image(imageId: string): UrlBuilder;
  image(projectOrId: string, imageId?: string): UrlBuilder {
    if (imageId !== undefined) {
      return new UrlBuilder(this._config.baseUrl, projectOrId, imageId);
    }

    if (!this._config.defaultProject) {
      throw new Error(
        'defaultProject must be configured when calling image(imageId) without a project.'
      );
    }
    return new UrlBuilder(this._config.baseUrl, this._config.defaultProject, projectOrId);
  }

  // ── Upload ──

  /**
   * Upload an image file.
   *
   * In Node.js, pass a `Buffer`, `ReadableStream`, or `Blob`.
   * In the browser, pass a `File` or `Blob`.
   */
  async upload(
    project: string,
    file: Blob | File | Buffer,
    fileName?: string,
    options?: UploadOptions
  ): Promise<UploadResponse> {
    const form = new FormData();

    if (typeof File !== 'undefined' && file instanceof File) {
      form.append('file', file, fileName ?? file.name);
    } else {
      form.append('file', file as Blob, fileName ?? 'upload');
    }

    // Attach optional metadata fields
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null) {
          form.append(key, String(value));
        }
      }
    }

    const res = await this._fetch(`/api/${project}/upload`, {
      method: 'POST',
      body: form,
    });

    return res as UploadResponse;
  }

  // ── Delete ──

  /** Delete an image and all its cached variants. */
  async delete(project: string, imageId: string): Promise<void> {
    await this._fetch(`/api/${project}/${imageId}`, { method: 'DELETE' }, false);
  }

  // ── Metadata ──

  /** Get metadata for an image. Returns null if not found. */
  async getMetadata(project: string, imageId: string): Promise<ImageMetadata | null> {
    try {
      return (await this._fetch(`/api/${project}/${imageId}/metadata`)) as ImageMetadata;
    } catch (err) {
      if (err instanceof PixaultError && err.status === 404) return null;
      throw err;
    }
  }

  /** Update metadata fields. Only provided fields are overwritten. */
  async updateMetadata(
    project: string,
    imageId: string,
    update: MetadataUpdate
  ): Promise<ImageMetadata> {
    return (await this._fetch(`/api/${project}/${imageId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })) as ImageMetadata;
  }

  /** Get Schema.org JSON-LD for an image. */
  async getJsonLd(project: string, imageId: string): Promise<Record<string, unknown>> {
    return (await this._fetch(
      `/api/${project}/${imageId}/metadata/jsonld`
    )) as Record<string, unknown>;
  }

  // ── List / Search ──

  /**
   * List images with optional filtering.
   *
   * @example
   * ```ts
   * const result = await pixault.listImages('my-project');
   * const tattoos = await pixault.listImages('my-project', { category: 'tattoo-flash' });
   * const page2 = await pixault.listImages('my-project', {}, 50, result.nextCursor);
   * ```
   */
  async listImages(
    project: string,
    filter?: ImageListFilter,
    limit: number = 50,
    cursor?: string | null,
  ): Promise<ImageListResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    if (filter?.search) params.set('search', filter.search);
    if (filter?.category) params.set('category', filter.category);
    if (filter?.keyword) params.set('keyword', filter.keyword);
    if (filter?.author) params.set('author', filter.author);
    if (filter?.isVideo !== undefined) params.set('isVideo', String(filter.isVideo));

    return (await this._fetch(`/api/${project}/images?${params}`)) as ImageListResponse;
  }

  // ── EPS Operations ──

  /** List derived assets (rasterized PNGs, SVGs, splits) for an EPS parent image. */
  async listDerived(project: string, imageId: string): Promise<DerivedAsset[]> {
    return (await this._fetch(`/api/${project}/${imageId}/derived`)) as DerivedAsset[];
  }

  /** Get the processing status for an EPS file. Returns null if no job found. */
  async getProcessingStatus(project: string, imageId: string): Promise<ProcessingStatus | null> {
    try {
      return (await this._fetch(`/api/${project}/${imageId}/processing-status`)) as ProcessingStatus;
    } catch (err) {
      if (err instanceof PixaultError && err.status === 404) return null;
      throw err;
    }
  }

  /** Trigger auto-split to extract individual designs from an EPS file. */
  async splitDesigns(project: string, imageId: string): Promise<void> {
    await this._fetch(`/api/${project}/${imageId}/split`, { method: 'POST' }, false);
  }

  /** Trigger vector SVG extraction from an EPS file. */
  async extractSvg(project: string, imageId: string): Promise<void> {
    await this._fetch(`/api/${project}/${imageId}/extract-svg`, { method: 'POST' }, false);
  }

  // ── Watermarks ──

  /**
   * List watermarks available in a project.
   *
   * @example
   * ```ts
   * const watermarks = await pixault.listWatermarks('my-project');
   * for (const wm of watermarks) {
   *   console.log(wm.id, wm.sizeBytes);
   * }
   * ```
   */
  async listWatermarks(project: string): Promise<Watermark[]> {
    return (await this._fetch(`/api/${project}/watermarks/`)) as Watermark[];
  }

  /**
   * Upload (or replace) a watermark image. PNG with transparency is recommended.
   *
   * The watermark ID must match `^[a-z0-9][a-z0-9\-_]{0,63}$` (lowercase
   * letters, digits, hyphens, or underscores; max 64 characters).
   *
   * @example
   * ```ts
   * const file = document.querySelector<HTMLInputElement>('#wm').files![0];
   * const wm = await pixault.uploadWatermark('my-project', 'logo', file);
   * ```
   */
  async uploadWatermark(
    project: string,
    watermarkId: string,
    image: Blob | File | Buffer,
    contentType: string = 'image/png',
  ): Promise<Watermark> {
    return (await this._fetch(`/api/${project}/watermarks/${watermarkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: image as BodyInit,
    })) as Watermark;
  }

  /** Delete a watermark by ID. */
  async deleteWatermark(project: string, watermarkId: string): Promise<void> {
    await this._fetch(
      `/api/${project}/watermarks/${watermarkId}`,
      { method: 'DELETE' },
      false,
    );
  }

  // ── Internal ──

  private async _fetch(
    path: string,
    init: RequestInit = {},
    parseJson: boolean = true
  ): Promise<unknown> {
    const headers = new Headers(init.headers);
    if (this._config.clientId) {
      headers.set('X-Client-Id', this._config.clientId);
    }
    if (this._config.clientSecret) {
      headers.set('X-Client-Secret', this._config.clientSecret);
    } else if (this._config.apiKey) {
      // Legacy fallback
      headers.set('X-Api-Key', this._config.apiKey);
    }

    const url = `${this._config.baseUrl}${path}`;
    const res = await fetch(url, { ...init, headers });

    if (!res.ok) {
      let message = `Pixault API error: ${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        // ignore parse error
      }
      throw new PixaultError(message, res.status);
    }

    if (!parseJson) return undefined;
    return res.json();
  }
}

/** Error thrown by Pixault API calls. */
export class PixaultError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'PixaultError';
  }
}
