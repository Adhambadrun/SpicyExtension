export interface HeaderArt {
  coverage: number;
  redShare: number;
  lightShare: number;
  offBrandPixels: number;
  width: number;
  height: number;
}

export declare const MASTER_WIDTH: number;
export declare const MASTER_HEIGHT: number;
export declare const PACKAGED_SCALE: number;

export declare function renderMaster(): Promise<Buffer>;
export declare function derivePackaged(master: Uint8Array): Promise<Buffer>;
export declare function auditHeader(buffer: Uint8Array): Promise<HeaderArt>;
