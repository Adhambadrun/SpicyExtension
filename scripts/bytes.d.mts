export interface ZipEntry {
  name: string;
  method: number;
  crc: number;
  size: number;
  compressed: number;
  local: number;
}

export function crc32(bytes: Uint8Array): number;
export function zipEntries(buffer: Buffer): ZipEntry[];
export function zipData(buffer: Buffer, entry: ZipEntry): Buffer;
