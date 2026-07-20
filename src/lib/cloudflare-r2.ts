import { AwsClient } from "aws4fetch";
import { getCloudflareR2Config } from "@/lib/env";

export function isR2Configured() {
  return Boolean(getCloudflareR2Config());
}

function getR2Client() {
  const cfg = getCloudflareR2Config();
  if (!cfg) {
    throw new Error(
      "Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET in Vercel.",
    );
  }
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  return { client, cfg };
}

/** Upload a file/blob to Cloudflare R2. Returns public URL when R2_PUBLIC_URL is set. */
export async function uploadToR2(key: string, body: ArrayBuffer | Blob | string, contentType: string) {
  const { client, cfg } = getR2Client();
  const url = `${cfg.endpoint}/${cfg.bucket}/${key.replace(/^\//, "")}`;
  const res = await client.fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${text}`);
  }
  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`
    : url;
  return { key, url: publicUrl };
}

export async function deleteFromR2(key: string) {
  const { client, cfg } = getR2Client();
  const url = `${cfg.endpoint}/${cfg.bucket}/${key.replace(/^\//, "")}`;
  const res = await client.fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed (${res.status})`);
  }
  return { ok: true };
}
