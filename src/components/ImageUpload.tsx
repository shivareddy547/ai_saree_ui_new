import React, { useRef, useEffect } from "react";
import { Upload, X, Search, Loader2, Plus, Check, Image as ImageIcon } from "lucide-react";
interface ImageUploadProps {
  images: File[];
  previews: string[];
  imageKitUrls: string[];
  imageUploadingStates: boolean[];
  imageUploadErrors: string[];
  activeImageTab: "upload" | "unsplash";
  setActiveImageTab: (value: "upload" | "unsplash") => void;
  unsplashQuery: string;
  setUnsplashQuery: (value: string) => void;
  unsplashResults: any[];
  isSearchingUnsplash: boolean;
  unsplashError: string | null;
  downloadingUnsplashIds: Set<string>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  handleUploadToImageKit: (index: number) => void;
  handleUnsplashSearch: () => void;
  handleDownloadUnsplash: (photo: any) => void;
}
const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  previews,
  imageKitUrls,
  imageUploadingStates,
  imageUploadErrors,
  activeImageTab,
  setActiveImageTab,
  unsplashQuery,
  setUnsplashQuery,
  unsplashResults,
  isSearchingUnsplash,
  unsplashError,
  downloadingUnsplashIds,
  handleImageUpload,
  removeImage,
  handleUploadToImageKit,
  handleUnsplashSearch,
  handleDownloadUnsplash,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Log to debug image loading
  useEffect(() => {
    console.log('ImageUpload - previews:', previews);
    console.log('ImageUpload - imageKitUrls:', imageKitUrls);
    console.log('ImageUpload - images length:', images.length);
  }, [previews, imageKitUrls, images]);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <ImageIcon size={22} className="text-purple-600" />
        Upload Images
      </h2>
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveImageTab("upload")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeImageTab === "upload"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload size={16} className="inline mr-1.5" />
          Upload
        </button>
        <button
          onClick={() => setActiveImageTab("unsplash")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeImageTab === "unsplash"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Search size={16} className="inline mr-1.5" />
          Unsplash
        </button>
      </div>
      {activeImageTab === "upload" && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-600">Click or drag images here</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
      {activeImageTab === "unsplash" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
              placeholder="Search for images..."
              className="input-field flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") handleUnsplashSearch(); }}
            />
            <button
              onClick={handleUnsplashSearch}
              disabled={isSearchingUnsplash}
              className="btn-primary flex items-center gap-2 px-4"
            >
              {isSearchingUnsplash ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              Search
            </button>
          </div>
          {unsplashError && (
            <p className="text-sm text-red-500">{unsplashError}</p>
          )}
          {unsplashResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unsplashResults.map((photo: any) => (
                <div
                  key={photo.id}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[4/3]"
                >
                  <img
                    src={photo.urls?.small}
                    alt={photo.alt_description || "Unsplash"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDownloadUnsplash(photo)}
                      disabled={downloadingUnsplashIds.has(photo.id)}
                      className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {downloadingUnsplashIds.has(photo.id) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {(previews.length > 0 || imageKitUrls.filter(url => url && url.startsWith('http')).length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Selected Images ({Math.max(previews.length, imageKitUrls.filter(url => url && url.startsWith('http')).length)})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Show previews from uploaded files */}
            {previews.map((url, index) => {
              if (!url) return null;
              return (
                <div
                  key={`preview-${index}`}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[4/3] bg-gray-100"
                >
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`Failed to load image at index ${index}:`, url);
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                  {!imageKitUrls[index] && images[index] && !imageKitUrls[index]?.startsWith('http') && (
                    <button
                      onClick={() => handleUploadToImageKit(index)}
                      disabled={imageUploadingStates[index]}
                      className="absolute bottom-1.5 left-1.5 right-1.5 bg-purple-600 text-white text-xs py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      {imageUploadingStates[index] ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          Upload to CDN
                        </>
                      )}
                    </button>
                  )}
                  {(imageKitUrls[index] && imageKitUrls[index].startsWith('http')) && (
                    <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check size={10} /> Uploaded
                    </span>
                  )}
                  {imageUploadErrors[index] && (
                    <span className="absolute bottom-1.5 left-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {imageUploadErrors[index]}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Show existing images from edit mode */}
            {imageKitUrls.map((url, index) => {
              // Skip if already showing in previews or if url is empty
              if (!url || !url.startsWith('http') || index < previews.length) return null;
              return (
                <div
                  key={`existing-${index}`}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[4/3] bg-gray-100"
                >
                  <img
                    src={url}
                    alt={`Existing ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`Failed to load existing image at index ${index}:`, url);
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                  <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check size={10} /> Uploaded
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default ImageUpload;
