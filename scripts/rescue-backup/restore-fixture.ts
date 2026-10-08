// Test-only: actual existing backup/import implementations, no replacement restore.
import JSZip from "jszip";
import { readBackupManifest, importBackupBlob, createBackupBlob } from "../../lib/data-management/backup";
import { hydrateKvDb } from "../../lib/kv-db";
import { serializeValue, serializeStorageString, createMediaCollector } from "../../lib/data-management/serializers";
import { sha256BlobHex } from "../../lib/sha256-stream";
declare global {
  interface Window {
    rescueRestore: {
      JSZip: typeof JSZip;
      readBackupManifest: typeof readBackupManifest;
      importBackupBlob: typeof importBackupBlob;
      createBackupBlob: typeof createBackupBlob;
      hydrateKvDb: typeof hydrateKvDb;
      serializeValue: typeof serializeValue;
      serializeStorageString: typeof serializeStorageString;
      createMediaCollector: typeof createMediaCollector;
      sha256BlobHex: typeof sha256BlobHex;
    };
  }
}
window.rescueRestore = { JSZip, readBackupManifest, importBackupBlob, createBackupBlob, hydrateKvDb, serializeValue, serializeStorageString, createMediaCollector, sha256BlobHex };
