import { getAdapter } from "$lib/request-manager";

export async function getAboutServer() {
  return getAdapter().getAboutServer();
}

export async function getAboutWebUI() {
  return getAdapter().getAboutWebUI();
}