import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async function (localFilePath) {
  try {
    // Upload an image
    if (!localFilePath) return null;
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // Delete the file from local server (publid folder) after uploading
    fs.unlinkSync(localFilePath);
    return uploadResult;
  } catch (error) {
    // Delete the file from local server (publid folder) if there is an error
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
