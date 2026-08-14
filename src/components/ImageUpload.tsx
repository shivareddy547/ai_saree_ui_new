import React, { useRef, useState, useCallback } from 'react';
import {
  Upload,
  Search,
  X,
  Loader2,
  Download,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isCloud?: boolean;
}
interface VariantImageState {
  files: File[];
  previews: string[];
  urls: string[];
  uploading: boolean[];
  errors: string[];
}
interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  costPrice: string;
  stockQuantity: string;
}
interface ImageUploadProps {
  productImages: {
    files: File[];
    previews: string[];
    urls: string[];
    uploading: boolean[];
    errors: string[];
  };
  setProductImages: React.Dispatch<
    React.SetStateAction<{
      files: File[];
      previews: string[];
      urls: string[];
      uploading: boolean[];
      errors: string[];
    }>
  >;
  variants: ProductVariant[];
  variantImages: { [variantId: string]: VariantImageState };
  setVariantImages: React.Dispatch<
    React.SetStateAction<{ [variantId: string]: VariantImageState }>
  >;
  activeTab: 'product' | string;
  setActiveTab: (tab: 'product' | string) => void;
  unsplashQuery: string;
  setUnsplashQuery: (query: string) => void;
  unsplashResults: any[];
  isSearchingUnsplash: boolean;
  unsplashError: string | null;
  downloadingUnsplashIds: Set<string>;
  handleUnsplashSearch: () => void;
  handleDownloadUnsplash: (photo: any, targetVariantId?: string) => void;
  onImageClick?: (url: string, variantId?: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}
const SortableImageItem: React.FC<{
  item: ImageItem;
  index: number;
  onRemove: (index: number) => void;
  onImageClick: (url: string) => void;
  isUploading?: boolean;
  uploadError?: string;
  isCloud?: boolean;
}> = ({
  item,
  index,
  onRemove,
  onImageClick,
  isUploading,
  uploadError,
  isCloud,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white"
    >
      <img
        src={item.url}
        alt={`Image ${index + 1}`}
        className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => onImageClick(item.url)}
      />
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 bg-white/80 rounded-full cursor-grab hover:bg-white transition-colors touch-none"
      >
        <GripVertical size={16} className="text-gray-600" />
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={() => onRemove(index)}
          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          title="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      {uploadError && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
          {uploadError}
        </div>
      )}
      {isCloud && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-xs p-1 text-center">
          Uploaded
        </div>
      )}
    </div>
  );
};
const ImageUpload: React.FC<ImageUploadProps> = ({
  productImages,
  setProductImages,
  variants,
  variantImages,
  setVariantImages,
  activeTab,
  setActiveTab,
  unsplashQuery,
  setUnsplashQuery,
  unsplashResults,
  isSearchingUnsplash,
  unsplashError,
  downloadingUnsplashIds,
  handleUnsplashSearch,
  handleDownloadUnsplash,
  onImageClick,
  fileInputRef: externalFileInputRef,
}) => {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const getCurrentImages = useCallback((): ImageItem[] => {
    if (activeTab === 'product') {
      const allUrls = [...productImages.urls, ...productImages.previews];
      const cloudCount = productImages.urls.length;
      return allUrls.map((url, idx) => ({
        id: url,
        url,
        isCloud: idx < cloudCount,
      }));
    } else {
      const variantState = variantImages[activeTab];
      if (!variantState) return [];
      const allUrls = [...variantState.urls, ...variantState.previews];
      const cloudCount = variantState.urls.length;
      return allUrls.map((url, idx) => ({
        id: url,
        url,
        isCloud: idx < cloudCount,
      }));
    }
  }, [activeTab, productImages, variantImages]);
  const getCurrentState = useCallback(() => {
    if (activeTab === 'product') {
      return productImages;
    } else {
      return variantImages[activeTab] || { files: [], previews: [], urls: [], uploading: [], errors: [] };
    }
  }, [activeTab, productImages, variantImages]);
  const setCurrentState = useCallback(
    (newState: any) => {
      if (activeTab === 'product') {
        setProductImages(newState);
      } else {
        setVariantImages((prev) => ({
          ...prev,
          [activeTab]: newState,
        }));
      }
    },
    [activeTab, setProductImages, setVariantImages]
  );
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }
    if (newFiles.length === 0) return;
    const currentState = getCurrentState();
    const updatedState = {
      ...currentState,
      files: [...currentState.files, ...newFiles],
      previews: [...currentState.previews, ...newPreviews],
      uploading: [...currentState.uploading, ...new Array(newFiles.length).fill(false)],
      errors: [...currentState.errors, ...new Array(newFiles.length).fill('')],
    };
    setCurrentState(updatedState);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeImage = (index: number) => {
    const currentState = getCurrentState();
    const newFiles = [...currentState.files];
    const newPreviews = [...currentState.previews];
    const newUrls = [...currentState.urls];
    const newUploading = [...currentState.uploading];
    const newErrors = [...currentState.errors];
    const cloudCount = currentState.urls.length;
    if (index < cloudCount) {
      newUrls.splice(index, 1);
      newUploading.splice(index, 1);
      newErrors.splice(index, 1);
    } else {
      const localIndex = index - cloudCount;
      const url = newPreviews[localIndex];
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      newFiles.splice(localIndex, 1);
      newPreviews.splice(localIndex, 1);
      newUploading.splice(localIndex, 1);
      newErrors.splice(localIndex, 1);
    }
    setCurrentState({
      ...currentState,
      files: newFiles,
      previews: newPreviews,
      urls: newUrls,
      uploading: newUploading,
      errors: newErrors,
    });
  };
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentItems = getCurrentImages();
    const oldIndex = currentItems.findIndex((item) => item.id === active.id);
    const newIndex = currentItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const currentState = getCurrentState();
    const allUrls = [...currentState.urls, ...currentState.previews];
    const cloudCount = currentState.urls.length;
    const movedItem = allUrls.splice(oldIndex, 1)[0];
    allUrls.splice(newIndex, 0, movedItem);
    const newUrls = allUrls.slice(0, cloudCount);
    const newPreviews = allUrls.slice(cloudCount);
    setCurrentState({
      ...currentState,
      urls: newUrls,
      previews: newPreviews,
    });
  };
  const currentImages = getCurrentImages();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Product Images</h2>
      <div className="flex flex-wrap border-b border-gray-200 gap-1">
        <button
          onClick={() => setActiveTab('product')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'product'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Product Images
        </button>
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveTab(v.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === v.id
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.sku || v.color || `Variant ${v.id.slice(0,4)}`}
          </button>
        ))}
      </div>
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
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
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
        {unsplashError && <p className="text-red-500 text-sm">{unsplashError}</p>}
        {unsplashResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
            {unsplashResults.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-lg overflow-hidden shadow-md"
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || 'Unsplash image'}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDownloadUnsplash(photo, activeTab === 'product' ? undefined : activeTab)}
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
      {currentImages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Images ({currentImages.length})
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReorder}
          >
            <SortableContext
              items={currentImages.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {currentImages.map((item, index) => {
                  const currentState = getCurrentState();
                  const cloudCount = currentState.urls.length;
                  const isCloud = index < cloudCount;
                  const isUploading = isCloud
                    ? false
                    : currentState.uploading[index - cloudCount] || false;
                  const error = isCloud
                    ? ''
                    : currentState.errors[index - cloudCount] || '';
                  return (
                    <SortableImageItem
                      key={item.id}
                      item={item}
                      index={index}
                      onRemove={removeImage}
                      onImageClick={(url) => {
                        if (onImageClick) {
                          onImageClick(url, activeTab === 'product' ? undefined : activeTab);
                        }
                      }}
                      isUploading={isUploading}
                      uploadError={error}
                      isCloud={isCloud}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};
export default ImageUpload;
