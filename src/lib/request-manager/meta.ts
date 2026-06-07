import { getAdapter } from "$lib/request-manager";
import type { ValidateBackupResult, RestoreStatus } from "$lib/server-adapters/types";

export async function getAboutServer() {
  return getAdapter().getAboutServer();
}

export async function getAboutWebUI() {
  return getAdapter().getAboutWebUI();
}

export async function restoreBackup(file: File): Promise<{ id: string; status: RestoreStatus }> {
  return getAdapter().restoreBackup(file);
}

export async function validateBackup(file: File): Promise<ValidateBackupResult> {
  return getAdapter().validateBackup(file);
}