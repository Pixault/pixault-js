# @pixault/sdk

JavaScript/TypeScript SDK for the [Pixault](https://pixault.io) image processing CDN and API.

## Features

- **Fluent URL builder** — generate optimized image URLs with transforms (`width`, `height`, `fit`, `format`, `watermark`, etc.)
- **Upload client** — upload images with optional metadata
- **Image management** — list, search, delete, and update metadata
- **TypeScript-first** — full type definitions included
- **Works everywhere** — Node.js 18+ and modern browsers

## Installation

```bash
npm install @pixault/sdk
```

## Quick Start

```ts
import { Pixault } from '@pixault/sdk';

const pixault = new Pixault({
  baseUrl: 'https://img.pixault.io',
  defaultProject: 'my-project',
  clientId: 'px_cl_a1b2c3d4',
  clientSecret: 'pk_...',
});

// Generate an optimized image URL
const url = pixault.image('img_01JKABC')
  .width(800)
  .height(600)
  .fit('cover')
  .quality(85)
  .format('webp')
  .build();
// => "https://img.pixault.io/my-project/img_01JKABC/w_800,h_600,fit_cover,q_85.webp"

// Upload an image
const result = await pixault.upload('my-project', file);
console.log(result.imageId);

// List images
const images = await pixault.listImages('my-project', { category: 'hero' });

// Get metadata
const meta = await pixault.getMetadata('my-project', 'img_01JKABC');
```

## URL Builder

```ts
// Named transform with overrides
const url = pixault.image('my-project', 'img_01JKABC')
  .transform('gallery')
  .width(400)
  .build();

// Watermark
const url = pixault.image('img_01JKABC')
  .width(1200)
  .watermark('logo', 'br', 30)
  .build();
```

## Configuration

| Option | Description | Required |
|--------|-------------|----------|
| `baseUrl` | Pixault CDN base URL | Yes |
| `defaultProject` | Default project ID | No |
| `clientId` | API key client ID (`px_cl_...`) | No |
| `clientSecret` | API key secret (`pk_...`) | No |

## Documentation

Full documentation at [pixault.dev](https://pixault.dev).

## License

[MIT](LICENSE)
