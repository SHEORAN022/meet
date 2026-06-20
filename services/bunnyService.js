// // services/bunnyService.js
// const axios = require("axios");
// const FormData = require("form-data");

// const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
// const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
// const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;
// const BUNNY_STORAGE_ENDPOINT = process.env.BUNNY_STORAGE_ENDPOINT;

// // ─── Upload File to Bunny ────────────────────────────────
// exports.uploadToBunny = async (fileBuffer, fileName, mimeType) => {
//   try {
//     const bunnyPath = `recordings/${fileName}`;
//     const uploadUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

//     const response = await axios.put(uploadUrl, fileBuffer, {
//       headers: {
//         AccessKey: BUNNY_ACCESS_KEY,
//         "Content-Type": mimeType || "video/webm",
//       },
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//     });

//     if (response.status === 201) {
//       return {
//         success: true,
//         cdnUrl: `${BUNNY_CDN_URL}/${bunnyPath}`,
//         bunnyPath,
//       };
//     }

//     throw new Error("Bunny upload failed");
//   } catch (error) {
//     console.log("BUNNY UPLOAD ERROR:", error.message);
//     throw error;
//   }
// };

// // ─── Delete File from Bunny ──────────────────────────────
// exports.deleteFromBunny = async (bunnyPath) => {
//   try {
//     const deleteUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

//     await axios.delete(deleteUrl, {
//       headers: {
//         AccessKey: BUNNY_ACCESS_KEY,
//       },
//     });

//     return { success: true };
//   } catch (error) {
//     console.log("BUNNY DELETE ERROR:", error.message);
//     throw error;
//   }
// };

// // ─── Get File from Bunny (download stream) ───────────────
// exports.getFileStream = async (bunnyPath) => {
//   try {
//     const fileUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

//     const response = await axios.get(fileUrl, {
//       headers: {
//         AccessKey: BUNNY_ACCESS_KEY,
//       },
//       responseType: "stream",
//     });

//     return response;
//   } catch (error) {
//     console.log("BUNNY GET FILE ERROR:", error.message);
//     throw error;
//   }
// };

const axios = require("axios");

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;
const BUNNY_STORAGE_ENDPOINT = process.env.BUNNY_STORAGE_ENDPOINT;

// ─── Upload File to Bunny ────────────────────────────────
exports.uploadToBunny = async (fileBuffer, fileName, mimeType, folder = "recordings") => {
  try {
    const bunnyPath = `${folder}/${fileName}`;
    const uploadUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        AccessKey: BUNNY_ACCESS_KEY,
        "Content-Type": mimeType || "application/octet-stream",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (response.status === 201) {
      return {
        success: true,
        cdnUrl: `${BUNNY_CDN_URL}/${bunnyPath}`,
        bunnyPath,
      };
    }

    throw new Error("Bunny upload failed");
  } catch (error) {
    console.log("BUNNY UPLOAD ERROR:", error.message);
    throw error;
  }
};

// ─── Delete File from Bunny ──────────────────────────────
exports.deleteFromBunny = async (bunnyPath) => {
  try {
    const deleteUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

    await axios.delete(deleteUrl, {
      headers: {
        AccessKey: BUNNY_ACCESS_KEY,
      },
    });

    return { success: true };
  } catch (error) {
    console.log("BUNNY DELETE ERROR:", error.message);
    throw error;
  }
};

// ─── Get File from Bunny (download stream) ───────────────
exports.getFileStream = async (bunnyPath) => {
  try {
    const fileUrl = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;

    const response = await axios.get(fileUrl, {
      headers: {
        AccessKey: BUNNY_ACCESS_KEY,
      },
      responseType: "stream",
    });

    return response;
  } catch (error) {
    console.log("BUNNY GET FILE ERROR:", error.message);
    throw error;
  }
};