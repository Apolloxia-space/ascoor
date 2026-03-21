// Domain entity for generated design asset info
export interface GeneratedDesignInfo {
  bucket: string;
  filename: string; // object path within bucket
  gcsUri: string;
  content: string;
}
