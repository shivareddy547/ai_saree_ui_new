interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  assetId: string;
  versionId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  duration: number;
  etag: string;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "lovecart";
const CLOUDINARY_UPLOAD_PRESET = "product_videos";

export const uploadToCloudinary = async (
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult | null> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "product_videos");
    
    // For video uploads, add specific parameters
//     formData.append("resource_type", "video");
//     formData.append("overwrite", "false");
//     formData.append("unique_filename", "true");
//     formData.append("access_mode", "public");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `Upload failed with status ${response.status}`
      );
    }

    const data = await response.json();

    return {
      publicId: data.public_id,
      url: data.url,
      secureUrl: data.secure_url,
      assetId: data.asset_id,
      versionId: data.version_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      duration: data.duration || 0,
      etag: data.etag,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export const getCloudinaryVideoUrl = (publicId: string): string => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}.webm`;
};

export const getCloudinaryVideoThumbnail = (publicId: string): string => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/so_0/${publicId}.jpg`;
};

export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Note: This requires a server-side API call as the delete API requires API key and secret
    // which should not be exposed on the client side
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/cloudinary/delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId, resourceType: "video" }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete from Cloudinary");
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};
