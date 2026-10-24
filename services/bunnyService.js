const axios = require("axios");

const getConfig = () => {
  const endpoint = (
    process.env.BUNNY_STORAGE_ENDPOINT || "https://storage.bunnycdn.com"
  ).trim();

  return {
    zone: process.env.BUNNY_STORAGE_ZONE?.trim(),
    password: process.env.BUNNY_ACCESS_KEY?.trim(),
    hostname: endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    cdn: process.env.BUNNY_CDN_URL?.trim(),
  };
};

const encodePath = (path) =>
  String(path)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const getUploadUrl = (hostname, zone, destPath) =>
  `https://${hostname}/${encodeURIComponent(zone)}/${encodePath(
    destPath.replace(/^\/+/, "")
  )}`;

const validateConfig = ({ zone, password, hostname, cdn }) => {
  const missing = [];

  if (!zone) missing.push("BUNNY_STORAGE_ZONE");
  if (!password) missing.push("BUNNY_ACCESS_KEY");
  if (!hostname) missing.push("BUNNY_STORAGE_ENDPOINT");
  if (!cdn) missing.push("BUNNY_CDN_URL");

  if (missing.length) {
    throw new Error(`Bunny env variables missing: ${missing.join(", ")}`);
  }
};

// Bunny ke error ko readable Error me badalta hai
const toBunnyError = (action, err) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const detail =
    (data && typeof data === "object" && data.Message) ||
    (typeof data === "string" && data) ||
    err.message;

  let hint = "";
  if (status === 401) {
    hint =
      " | AccessKey galat hai: Storage Zone ka Password use karo (Account API key nahi), aur endpoint region sahi rakho.";
  } else if (status === 404) {
    hint = " | Storage zone name ya endpoint galat ho sakta hai.";
  }

  const e = new Error(
    `Bunny ${action} failed (${status || "no response"}): ${detail}${hint}`
  );
  e.status = status;
  return e;
};

/**
 * Upload a readable stream directly to Bunny Storage.
 * Returns the Bunny CDN URL.
 */
exports.uploadFromStream = async (
  stream,
  destPath,
  contentLength,
  contentType = "application/octet-stream"
) => {
  const config = getConfig();
  validateConfig(config);

  const { zone, password, hostname, cdn } = config;

  if (!destPath || typeof destPath !== "string") {
    throw new Error("Bunny upload destination path is required");
  }

  const headers = {
    AccessKey: password,
    "Content-Type": contentType,
  };

  if (contentLength != null) {
    headers["Content-Length"] = contentLength;
  }

  try {
    await axios.put(getUploadUrl(hostname, zone, destPath), stream, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 0,
    });
  } catch (err) {
    throw toBunnyError("upload", err);
  }

  return `${cdn.replace(/\/+$/, "")}/${encodePath(
    destPath.replace(/^\/+/, "")
  )}`;
};

/**
 * Delete a file from Bunny Storage.
 * Ignores 404 when the file does not exist.
 */
exports.deleteFile = async (destPath) => {
  const config = getConfig();
  validateConfig(config);

  const { zone, password, hostname } = config;

  const url = getUploadUrl(hostname, zone, destPath);

  try {
    await axios.delete(url, {
      headers: { AccessKey: password },
    });
  } catch (error) {
    if (error.response?.status !== 404) {
      throw toBunnyError("delete", error);
    }
  }
};
