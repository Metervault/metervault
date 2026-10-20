import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AcceptedJob = { id: string; at: string; body: unknown };
export type AcceptedPhoto = { id: string; at: string; file: string; bytes: number };

type InboxFile = {
  jobs: Record<string, AcceptedJob>;
  photos: Record<string, AcceptedPhoto>;
};

function empty(): InboxFile {
  return { jobs: {}, photos: {} };
}

export function createInbox(directory: string) {
  const file = path.join(directory, "inbox.json");

  async function read(): Promise<InboxFile> {
    try {
      return JSON.parse(await readFile(file, "utf8")) as InboxFile;
    } catch {
      return empty();
    }
  }

  async function write(inbox: InboxFile) {
    await mkdir(directory, { recursive: true });
    await writeFile(file, JSON.stringify(inbox, null, 2));
  }

  return {
    async acceptJob(idempotencyKey: string, body: unknown) {
      const inbox = await read();
      const existing = inbox.jobs[idempotencyKey];
      if (existing) return { id: existing.id, duplicate: true };
      const accepted = { id: crypto.randomUUID(), at: new Date().toISOString(), body };
      inbox.jobs[idempotencyKey] = accepted;
      await write(inbox);
      return { id: accepted.id, duplicate: false };
    },
    async acceptPhoto(idempotencyKey: string, bytes: Buffer) {
      const inbox = await read();
      const existing = inbox.photos[idempotencyKey];
      if (existing) return { id: existing.id, duplicate: true };
      await mkdir(path.join(directory, "photos"), { recursive: true });
      const filename = `${idempotencyKey}.jpg`;
      await writeFile(path.join(directory, "photos", filename), bytes);
      const accepted = { id: crypto.randomUUID(), at: new Date().toISOString(), file: filename, bytes: bytes.byteLength };
      inbox.photos[idempotencyKey] = accepted;
      await write(inbox);
      return { id: accepted.id, duplicate: false };
    },
  };
}

export const devInbox = createInbox(path.join(process.cwd(), "data"));
