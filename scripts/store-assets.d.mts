export interface StoreAssetSpec {
  file: string;
  width: number;
  height: number;
  kind: 'store-icon' | 'small-promo-tile' | 'marquee-promo-tile';
}

/** Measured geometry of the finished store icon, checked against Chrome's image guidelines. */
export interface StoreIconGeometry {
  /** Box of the fully opaque artwork; null when nothing is opaque. */
  opaqueBox: { x: number; y: number; width: number; height: number } | null;
  /** Highest alpha found in the outer ring, which Chrome requires to stay fully transparent. */
  ringMaxAlpha: number;
  /** Highest alpha found in the transparent padding, i.e. the strength of the outer glow. */
  paddingMaxAlpha: number;
}

export declare const SPECS: readonly StoreAssetSpec[];
export declare const ICON_GLOW_CEILING: number;
export declare function auditStoreIconGeometry(buffer: Uint8Array): Promise<StoreIconGeometry>;
export declare function generate(options?: { check?: boolean }): Promise<void>;
