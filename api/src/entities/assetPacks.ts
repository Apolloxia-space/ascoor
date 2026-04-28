// Domain entity for generated assetPack asset info
export interface GeneratedAssetPackInfo {
  bucket: string;
  filename: string; // object path within bucket
  gcsUri: string;
  content: string;
}
