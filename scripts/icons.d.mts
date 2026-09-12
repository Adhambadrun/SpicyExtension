export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RegionStats {
  greyFraction: number;
  redPixels: number;
  meanLuminance: number;
  meanRgb: number[];
}

export declare const sizes: readonly number[];
export declare const SIMPLIFIED_SIZES: readonly number[];
export declare const SIGNATURE_REGION: Region;
export declare const SAMPLE_REGION: Region;

export declare function regionRect(region: Region, size: number, pad?: number): { left: number; top: number; width: number; height: number };
export declare function regionStats(source: Uint8Array, region: Region): Promise<RegionStats>;
export declare function verifyIconSource(source: Uint8Array): Promise<{ signature: RegionStats; sample: RegionStats }>;
export declare function deriveIcon(source: Uint8Array, size: number): Promise<Buffer>;
export declare function generateIcons(options?: { check?: boolean }): Promise<void>;
