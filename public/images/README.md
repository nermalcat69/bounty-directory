# Images Directory

This directory contains static images that are served directly by Next.js.

## Usage

- Place images here that need to be publicly accessible
- Images can be referenced in your code as `/images/filename.ext`
- Supported formats: PNG, JPG, JPEG, SVG, WebP, etc.

## Examples

```jsx
// In your React components
<img src="/images/logo.png" alt="Logo" />

// Or with Next.js Image component
import Image from 'next/image'
<Image src="/images/hero.jpg" alt="Hero" width={800} height={600} />
```

## Organization

Consider organizing images in subdirectories:
- `/images/logos/` - Company and project logos
- `/images/icons/` - UI icons and small graphics
- `/images/banners/` - Hero images and banners
- `/images/avatars/` - User profile pictures