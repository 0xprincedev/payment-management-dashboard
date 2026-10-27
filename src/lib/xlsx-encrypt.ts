import "server-only";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import CFB from "cfb";

const PROVIDER_NAME = "Microsoft Enhanced RSA and AES Cryptographic Provider (Prototype)";

// Excel reads this name as a null-terminated string. A truncated name makes the
// local app reject the workbook before the password dialog, while other viewers still open it.
function encryptionInfo(key: Buffer, salt: Buffer) {
  const provider = Buffer.from(`${PROVIDER_NAME}\0`, "utf16le");
  const headerSize = 32 + provider.length;
  const verifier = Buffer.alloc(16);
  randomBytes(16).copy(verifier);
  const encryptedVerifier = aesEcb(key, verifier);
  const hash = Buffer.alloc(32);
  createHash("sha1").update(verifier).digest().copy(hash);
  const encryptedVerifierHash = aesEcb(key, hash);

  const blob = Buffer.alloc(12 + headerSize + 72);
  let offset = 0;
  const write16 = (value: number) => {
    blob.writeUInt16LE(value, offset);
    offset += 2;
  };
  const write32 = (value: number) => {
    blob.writeUInt32LE(value, offset);
    offset += 4;
  };

  write16(0x0004);
  write16(0x0002);
  write32(0x24);
  write32(headerSize);
  write32(0x24);
  write32(0);
  write32(0x660e);
  write32(0x8004);
  write32(0x80);
  write32(0x18);
  write32(0);
  write32(0);
  provider.copy(blob, offset);
  offset += provider.length;
  write32(16);
  salt.copy(blob, offset);
  offset += 16;
  encryptedVerifier.copy(blob, offset);
  offset += 16;
  write32(20);
  encryptedVerifierHash.copy(blob, offset);
  offset += 32;
  if (offset !== blob.length) throw new Error("Encryption header size is wrong.");
  return blob;
}

function passwordKey(password: string, salt: Buffer) {
  const passwordBytes = Buffer.from(password, "utf16le");
  let hashed = createHash("sha1").update(salt).update(passwordBytes).digest();
  for (let index = 0; index < 50000; index += 1) {
    const counter = Buffer.alloc(4);
    counter.writeUInt32LE(index, 0);
    hashed = createHash("sha1").update(counter).update(hashed).digest();
  }
  const block = Buffer.alloc(4);
  const finalHash = createHash("sha1").update(hashed).update(block).digest();
  const first = Buffer.alloc(64, 0x36);
  for (let index = 0; index < finalHash.length; index += 1) first[index] ^= finalHash[index];
  const second = Buffer.alloc(64, 0x5c);
  for (let index = 0; index < finalHash.length; index += 1) second[index] ^= finalHash[index];
  return Buffer.concat([createHash("sha1").update(first).digest(), createHash("sha1").update(second).digest()]).subarray(0, 16);
}

function aesEcb(key: Buffer, input: Buffer) {
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(input), cipher.final()]);
}

function encryptPackage(key: Buffer, input: Buffer) {
  const chunks: Buffer[] = [];
  for (let start = 0; start < input.length; start += 4096) {
    const end = Math.min(start + 4096, input.length);
    const remainder = (end - start) % 16;
    const chunk = remainder === 0 ? input.subarray(start, end) : Buffer.concat([input.subarray(start, end), Buffer.alloc(16 - remainder)]);
    chunks.push(aesEcb(key, chunk));
  }
  const size = Buffer.alloc(8);
  size.writeUInt32LE(input.length, 0);
  return Buffer.concat([size, ...chunks]);
}

export function encryptXlsx(input: Buffer, password: string) {
  const salt = randomBytes(16);
  const key = passwordKey(password, salt);
  const container = CFB.utils.cfb_new();
  CFB.utils.cfb_add(container, "EncryptionInfo", encryptionInfo(key, salt));
  CFB.utils.cfb_add(container, "EncryptedPackage", encryptPackage(key, input));
  CFB.utils.cfb_del(container, "\u0001Sh33tJ5");
  const written = CFB.write(container);
  return Buffer.isBuffer(written) ? written : Buffer.from(written);
}
