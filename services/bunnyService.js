// // const axios = require("axios");

// // const getConfig = () => ({
// //   zone: process.env.BUNNY_STORAGE_ZONE,
// //   password: process.env.BUNNY_STORAGE_PASSWORD,
// //   hostname: process.env.BUNNY_STORAGE_HOSTNAME,
// //   cdn: process.env.BUNNY_CDN_URL,
// // });

 
// // exports.uploadFromUrl = async (sourceUrl, destPath) => {
// //   const { zone, password, hostname, cdn } = getConfig();

// //   const download = await axios.get(sourceUrl, {
// //     responseType: "stream",
// //     timeout: 0,
// //   });

// //   const uploadUrl = `https://${hostname}/${zone}/${destPath}`;

// //   await axios.put(uploadUrl, download.data, {
// //     headers: {
// //       AccessKey: password,
// //       "Content-Type": "application/octet-stream",
// //     },
// //     maxBodyLength: Infinity,
// //     maxContentLength: Infinity,
// //     timeout: 0,
// //   });

// //   return `${cdn.replace(/\/$/, "")}/${destPath}`;
// // };

// // exports.deleteFile = async (destPath) => {
// //   const { zone, password, hostname } = getConfig();

// //   await axios.delete(`https://${hostname}/${zone}/${destPath}`, {
// //     headers: { AccessKey: password },
// //   });
// // };


// const axios = require("axios");

// const getConfig = () => ({
//   zone: process.env.BUNNY_STORAGE_ZONE,
//   password: process.env.BUNNY_STORAGE_PASSWORD,
//   hostname: process.env.BUNNY_STORAGE_HOSTNAME,
//   cdn: process.env.BUNNY_CDN_URL,
// });

// /**
//  * Kisi bhi readable stream (jaise express req) ko seedha Bunny Storage par PUT karta hai.
//  * File server ki RAM ya disk me save nahi hoti.
//  * Return: Bunny CDN link
//  */
// exports.uploadFromStream = async (stream, destPath, contentLength) => {
//   const { zone, password, hostname, cdn } = getConfig();

//   if (!zone || !password || !hostname || !cdn) {
//     throw new Error("Bunny env variables missing");
//   }

//   const headers = {
//     AccessKey: password,
//     "Content-Type": "application/octet-stream",
//   };
//   if (contentLength) headers["Content-Length"] = contentLength;

//   await axios.put(`https://${hostname}/${zone}/${destPath}`, stream, {
//     headers,
//     maxBodyLength: Infinity,
//     maxContentLength: Infinity,
//     timeout: 0,
//   });

//   return `${cdn.replace(/\/$/, "")}/${destPath}`;
// };

// /** Bunny se file delete. File pehle se na ho (404) to error nahi deta. */
// exports.deleteFile = async (destPath) => {
//   const { zone, password, hostname } = getConfig();

//   try {
//     await axios.delete(`https://${hostname}/${zone}/${destPath}`, {
//       headers: { AccessKey: password },
//     });
//   } catch (error) {
//     if (error.response?.status !== 404) throw error;
//   }
// };


const axios = require("axios");

const getConfig = () => ({
  zone: process.env.BUNNY_STORAGE_ZONE,
  password: process.env.BUNNY_STORAGE_PASSWORD,
  hostname: process.env.BUNNY_STORAGE_HOSTNAME,
  cdn: process.env.BUNNY_CDN_URL,
});

/**
 * Kisi bhi readable stream (jaise express req) ko seedha Bunny Storage par PUT karta hai.
 * File server ki RAM ya disk me save nahi hoti.
 * contentType: audio/webm, audio/mp4 etc. (sahi type se browser audio seedha play karta hai)
 * Return: Bunny CDN link
 */
exports.uploadFromStream = async (
  stream,
  destPath,
  contentLength,
  contentType = "application/octet-stream"
) => {
  const { zone, password, hostname, cdn } = getConfig();

  if (!zone || !password || !hostname || !cdn) {
    throw new Error("Bunny env variables missing");
  }

  const headers = {
    AccessKey: password,
    "Content-Type": contentType,
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  await axios.put(`https://${hostname}/${zone}/${destPath}`, stream, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 0,
  });

  return `${cdn.replace(/\/$/, "")}/${destPath}`;
};

/** Bunny se file delete. File pehle se na ho (404) to error nahi deta. */
exports.deleteFile = async (destPath) => {
  const { zone, password, hostname } = getConfig();

  try {
    await axios.delete(`https://${hostname}/${zone}/${destPath}`, {
      headers: { AccessKey: password },
    });
  } catch (error) {
    if (error.response?.status !== 404) throw error;
  }
};