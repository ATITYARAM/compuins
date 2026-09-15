import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export type Product = {
  title: string;
  thumbnail: string | null;
};

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const PRODUCTS_DIR = path.resolve(process.cwd(), 'Products');

const IMAGE_MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
};

function findEndOfCentralDirectory(buffer: Buffer): number {
  // EOCD is at most 65,557 bytes from the end for a non-ZIP64 archive.
  const start = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('Invalid ZIP: end of central directory not found.');
}

function decodeFileName(bytes: Buffer, utf8: boolean): string {
  if (utf8) return new TextDecoder('utf-8').decode(bytes);
  return new TextDecoder('windows-1252').decode(bytes);
}

function readEntries(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocd + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocd + 16);

  if (centralDirectoryOffset + centralDirectorySize > buffer.length) {
    throw new Error('Invalid ZIP: central directory is outside the archive.');
  }

  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid ZIP: malformed central directory entry.');
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);

    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd + extraLength + commentLength > buffer.length) {
      throw new Error('Invalid ZIP: malformed entry lengths.');
    }

    const name = decodeFileName(buffer.subarray(nameStart, nameEnd), Boolean(flags & 0x0800));
    entries.push({ name, compression, compressedSize, uncompressedSize, localHeaderOffset });

    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function extractEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;

  if (dataEnd > buffer.length) throw new Error(`Invalid ZIP data for ${entry.name}`);

  const compressed = buffer.subarray(dataStart, dataEnd);

  if (entry.compression === 0) return compressed;
  if (entry.compression === 8) return zlib.inflateRawSync(compressed);

  throw new Error(`Unsupported ZIP compression method ${entry.compression} for ${entry.name}`);
}

function thumbnailFromZip(zipPath: string): string | null {
  const archive = fs.readFileSync(zipPath);
  const entries = readEntries(archive);
  const thumbnail = entries.find((entry) => {
    if (entry.name.endsWith('/')) return false;
    const fileName = path.posix.basename(entry.name.replaceAll('\\', '/'));
    const extension = path.posix.extname(fileName).toLowerCase();
    return fileName.slice(0, -extension.length).toLowerCase() === 'thumbnail' && Boolean(IMAGE_MIME[extension]);
  });

  if (!thumbnail) return null;

  const extension = path.posix.extname(thumbnail.name.replaceAll('\\', '/')).toLowerCase();
  const data = extractEntry(archive, thumbnail);
  return `data:${IMAGE_MIME[extension]};base64,${data.toString('base64')}`;
}

export function getProducts(): Product[] {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];

  return fs
    .readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.zip'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    .map((entry) => {
      const zipPath = path.join(PRODUCTS_DIR, entry.name);
      let thumbnail: string | null = null;

      try {
        thumbnail = thumbnailFromZip(zipPath);
      } catch (error) {
        console.warn(`[Products] Could not read ${entry.name}:`, error);
      }

      return {
        title: entry.name,
        thumbnail,
      };
    });
}
