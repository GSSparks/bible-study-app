/**
 * Resize an image file client-side so that neither dimension exceeds maxSize.
 * Returns the original File if already within bounds.
 */
export async function resizeImage(file, maxSize = 1200) {
    // Skip non-images
    if (!file.type.startsWith('image/')) return file;

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Already small enough — return original
    if (width <= maxSize && height <= maxSize) {
        bitmap.close();
        return file;
    }

    // Compute new dimensions (preserve aspect ratio)
    const ratio = Math.min(maxSize / width, maxSize / height);
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    bitmap.close();

    // Keep PNG if source is PNG (transparency), otherwise JPEG
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.85));

    const ext = mime === 'image/png' ? 'png' : 'jpg';
    const name = file.name.replace(/\.\w+$/, `.${ext}`);
    return new File([blob], name, { type: mime, lastModified: Date.now() });
}
