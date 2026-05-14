import { File } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync } from "expo-crypto";

const AES_KEY_PREFIX = "parkguide.secureFileKey.";
const getSecureKeyName = (keyId) => `${AES_KEY_PREFIX}${keyId}`;
export const ensureDirectoryAsync = async (directoryUri) => {
  if (!directoryUri) return;
  const info = await LegacyFileSystem.getInfoAsync(directoryUri);
  if (!info.exists) {
    await LegacyFileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
  }
};
const getOrCreateEncryptionKey = async (keyId) => {
  const secureKeyName = getSecureKeyName(keyId);
  let keyHex = await SecureStore.getItemAsync(secureKeyName);
  if (!keyHex) {
    const key = await AESEncryptionKey.generate(256);
    keyHex = await key.encoded("hex");
    await SecureStore.setItemAsync(secureKeyName, keyHex);
    return key;
  }
  return AESEncryptionKey.import(keyHex, "hex");
};
const getExistingEncryptionKey = async (keyId) => {
  const keyHex = await SecureStore.getItemAsync(getSecureKeyName(keyId));
  if (!keyHex) {
    throw new Error("Missing local encryption key.");
  }
  return AESEncryptionKey.import(keyHex, "hex");
};

export const encryptFileToUri = async ({ sourceUri, encryptedUri, keyId, deleteSource = false }) => {
  if (!sourceUri || !encryptedUri || !keyId) {
    throw new Error("Missing sourceUri, encryptedUri, or keyId.");
  }
  const key = await getOrCreateEncryptionKey(keyId);
  const sourceFile = new File(sourceUri);
  const plaintextBytes = await sourceFile.bytes();
  const sealedData = await aesEncryptAsync(plaintextBytes, key);
  const encryptedBytes = await sealedData.combined();
  const encryptedFile = new File(encryptedUri);
  encryptedFile.create({ overwrite: true });
  encryptedFile.write(encryptedBytes);
  if (deleteSource && sourceUri.startsWith("file://")) {
    await deleteLocalFile(sourceUri);
  }
  return encryptedUri;
};

export const decryptFileToUri = async ({ encryptedUri, outputUri, keyId }) => {
  if (!encryptedUri || !outputUri || !keyId) {
    throw new Error("Missing encryptedUri, outputUri, or keyId.");
  }
  const key = await getExistingEncryptionKey(keyId);
  const encryptedFile = new File(encryptedUri);
  const encryptedBytes = await encryptedFile.bytes();
  const sealedData = AESSealedData.fromCombined(encryptedBytes);
  const plaintextBytes = await aesDecryptAsync(sealedData, key);
  const outputFile = new File(outputUri);
  outputFile.create({ overwrite: true });
  outputFile.write(plaintextBytes);
  return outputUri;
};

export const deleteSecureFileKey = async (keyId) => {
  if (!keyId) return;
  await SecureStore.deleteItemAsync(getSecureKeyName(keyId));
};

export const deleteLocalFile = async (uri) => {
  if (!uri) return;
  try {
    await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
  }
};

export const listDirectoryAsync = async (directoryUri) => {
  try {
    return await LegacyFileSystem.readDirectoryAsync(directoryUri);
  } catch {
    return [];
  }
};