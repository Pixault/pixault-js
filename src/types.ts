/** Resize fit mode. */
export type FitMode = 'cover' | 'contain' | 'fill' | 'pad';

/** Watermark position. */
export type WmPosition = 'tl' | 'tr' | 'bl' | 'br' | 'c' | 'tile';

/** Output image format. */
export type OutputFormat = 'jpg' | 'png' | 'webp' | 'avif' | 'svg';

/** Configuration for the Pixault client. */
export interface PixaultConfig {
  /** Base URL for the Pixault CDN (e.g. "https://img.pixault.io"). */
  baseUrl: string;
  /** Default project ID used when not specified per-request. */
  defaultProject?: string;
  /** Client ID for identifying the API key pair (e.g. "px_cl_a1b2c3d4"). */
  clientId?: string;
  /** Client secret for authenticating API requests (shown once at key creation). */
  clientSecret?: string;
  /**
   * Legacy API key for upload and management operations.
   * @deprecated Use `clientId` + `clientSecret` instead.
   */
  apiKey?: string;
}

/** Response from an image upload. */
export interface UploadResponse {
  imageId: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

/** Image metadata aligned with Schema.org ImageObject. */
export interface ImageMetadata {
  imageId: string;
  projectId: string;
  originalFileName: string;
  uploadedAt: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  name?: string;
  description?: string;
  caption?: string;
  category?: string;
  keywords?: string[];
  author?: string;
  copyrightHolder?: string;
  copyrightYear?: number;
  license?: string;
  dateCreated?: string;
  datePublished?: string;
  dateModified?: string;
  representativeOfPage?: boolean;
  exifData?: Record<string, string>;
  locationLatitude?: number;
  locationLongitude?: number;
  locationName?: string;
  tags?: Record<string, string>;
}

/** Fields that can be updated on image metadata. All optional — only provided fields are applied. */
export interface MetadataUpdate {
  name?: string;
  description?: string;
  caption?: string;
  category?: string;
  keywords?: string[];
  author?: string;
  copyrightHolder?: string;
  copyrightYear?: number;
  license?: string;
  dateCreated?: string;
  datePublished?: string;
  representativeOfPage?: boolean;
  exifData?: Record<string, string>;
  locationLatitude?: number;
  locationLongitude?: number;
  locationName?: string;
  tags?: Record<string, string>;
}

/** Filter criteria for listing images. */
export interface ImageListFilter {
  /** Free-text search across name, filename, and imageId. */
  search?: string;
  /** Exact category match (case-insensitive). */
  category?: string;
  /** Keyword contains match (case-insensitive). */
  keyword?: string;
  /** Author contains match (case-insensitive). */
  author?: string;
  /** Filter to videos only (true) or images only (false). */
  isVideo?: boolean;
}

/** Paginated response from listing images. */
export interface ImageListResponse {
  images: ImageMetadata[];
  nextCursor: string | null;
  totalCount: number;
}

/** Options for the upload method. */
export interface UploadOptions {
  /** Optional Schema.org metadata to attach on upload. */
  name?: string;
  description?: string;
  caption?: string;
  category?: string;
  keywords?: string;
  author?: string;
}

/** A derived asset (rasterized PNG, SVG extraction, split design) from an EPS parent. */
export interface DerivedAsset {
  imageId: string;
  derivationType: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

/** Processing status for an EPS job (rasterize, split, or SVG extraction). */
export interface ProcessingStatus {
  id: string;
  source: string;
  status: string;
  totalAssets: number;
  processedAssets: number;
  succeededAssets: number;
  failedAssets: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
