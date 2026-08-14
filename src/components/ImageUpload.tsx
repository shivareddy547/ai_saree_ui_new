import React, { useRef } from 'react';
import { Upload, Search, X, Loader2, Download } from 'lucide-react';
interface ImageUploadProps {
  images: File[];
  previews: string[];
  imageKitUrls: string[];
  imageUploadingStates: boolean[];
  imageUploadErrors: string[];
  activeImageTab: 'upload' | 'unsplash';
  setActiveImageTab: (tab: 'upload' | 'unsplash') => void;
  unsplashQuery: string;
  setUnsplashQuery: (query: string) => void;
  unsplashResults: any[];
  isSearchingUnsplash: boolean;
  unsplashError: string | null;
  downloadingUnsplashIds: Set<string>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  handleUploadToImageKit: (index: number) => void;
  handleUnsplashSearch: () => void;
  handleDownloadUnsplash: (photo: any) => void;
  onImageClick?: (index: number) => void;
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
  onImageClick
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Combine cloud and local previews for display (cloud first, then local)
  const allImageUrls = [...imageKitUrls, ...previews];
  // Also keep track of which are cloud vs local for status display
  // We'll use the index to determine if it's cloud (index < imageKitUrls.length)
  const cloudCount = imageKitUrls.length;
  const handleImageClick = (index: number) => {
    if (onImageClick) {
      onImageClick(index);
    }
  };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Product Images</h2>
      {/* Image tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveImageTab('upload')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeImageTab === 'upload'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload Files
        </button>
        <button
          onClick={() => setActiveImageTab('unsplash')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeImageTab === 'unsplash'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Unsplash Search
        </button>
      </div>
      {/* Upload tab */}
      {activeImageTab === 'upload' && (
        <div>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
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
      {/* Unsplash tab */}
      {activeImageTab === 'unsplash' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
              placeholder="Search for images..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleUnsplashSearch()}
            />
            <button
              onClick={handleUnsplashSearch}
              disabled={isSearchingUnsplash || !unsplashQuery.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearchingUnsplash ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
          {unsplashError && (
            <p className="text-red-500 text-sm">{unsplashError}</p>
          )}
          {unsplashResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {unsplashResults.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden shadow-md">
                  <img
                    src={photo.urls.small}
                    alt={photo.alt_description || 'Unsplash image'}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDownloadUnsplash(photo)}
                      disabled={downloadingUnsplashIds.has(photo.id)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                      {downloadingUnsplashIds.has(photo.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5 text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Image grid */}
      {allImageUrls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Uploaded Images ({allImageUrls.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allImageUrls.map((url, index) => {
              const isCloud = index < cloudCount;
              return (
                <div key={index} className="relative group rounded-lg overflow-hidden shadow-md border border-gray-200">
                  <img
                    src={url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(index)}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => removeImage(index)}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Show loading/error status for local images only */}
                  {!isCloud && imageUploadingStates[index - cloudCount] && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  {!isCloud && imageUploadErrors[index - cloudCount] && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
                      {imageUploadErrors[index - cloudCount]}
                    </div>
                  )}
                  {/* Cloud indicator */}
                  {isCloud && (
                    <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-xs p-1 text-center">
                      Uploaded
                    </div>
                  )}
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
