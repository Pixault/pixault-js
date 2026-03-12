import type {
  ImageListFilter,
  ImageListResponse,
  ImageMetadata,
  MetadataUpdate,
  PixaultConfig,
  UploadOptions,
  UploadResponse,
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
