const PUBLIC_KEY = "public_/dmcMYuJx7RA75Gf3KYeC8DT1g0=";
const PRIVATE_KEY = "private_QJxtfIzuCyPUqmu1Vi/aTe3aMLI=";
const UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuffer = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyBuffer,
    encoder.encode(data)
  );
  const hex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

function generateToken(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function uploadToImageKit(file: File): Promise<string> {
  const token = generateToken();
  const expire = Math.floor(Date.now() / 1000) + 300; // 5 minutes
  const signature = await hmacSha1(PRIVATE_KEY, token + expire.toString());

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", PUBLIC_KEY);
  formData.append("token", token);
  formData.append("expire", expire.toString());
  formData.append("signature", signature);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ImageKit upload failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("ImageKit upload succeeded but no URL returned");
  }
  return data.url as string;
}
