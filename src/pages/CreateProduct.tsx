import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Edit,
} from "lucide-react";
import { uploadToImageKit } from "../utils/imageKitUpload";
import { uploadToCloudinary, getCloudinaryVideoUrl } from "../utils/cloudinaryUpload";
import ProductDetails from "../components/ProductDetails";
import ImageUpload from "../components/ImageUpload";
import VideoConfiguration from "../components/VideoConfiguration";
import VideoPreviewComponent from "../components/VideoPreview";
import PostToInstagram from "../components/PostToInstagram";
import ImageLightbox from "../components/ImageLightbox";
import VideoEditor from "../components/VideoEditor";
import { v4 as uuidv4 } from 'uuid';
const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
const UNSPLASH_ACCESS_KEY =
  "bzBups-AqyogXRdO5QpQxSkcu9peuTSc8yZXGMGcGPs";
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
const steps = [
  { id: 1, label: "Product Details" },
  { id: 2, label: "Upload Images" },
  { id: 3, label: "Video Configuration" },
  { id: 4, label: "Preview" },
  { id: 5, label: "Post to Instagram" },
];
interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  costPrice: string;
  stockQuantity: string;
}
interface Subcategory {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}
interface UserVoice {
  id: number;
  name: string;
  sampleAudioUrl: string | null;
  createdAt: string;
}
const createEmptyVariant = (): ProductVariant => ({
  id: uuidv4(),
  sku: "",
  size: "",
  color: "",
  price: "",
  costPrice: "",
  stockQuantity: "",
});
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const length = buffer.length;
  const dataLength = length * numChannels * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  const writeString = (
    v: DataView,
    offset: number,
    s: string
  ) => {
    for (let i = 0; i < s.length; i++) {
      v.setUint8(offset + i, s.charCodeAt(i));
    }
  };
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(
    28,
    sampleRate * numChannels * (bitDepth / 8),
    true
  );
  view.setUint16(
    32,
    numChannels * (bitDepth / 8),
    true
  );
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = Math.max(
        -1,
        Math.min(1, channels[c][i])
      );
      sample =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], {
    type: "audio/wav",
  });
};
const generateFallbackAudio = (
  duration: number = 5,
  frequency: number = 440
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const sampleRate = 44100;
      const numSamples = sampleRate * duration;
      const audioCtx = new AudioContext();
      const buffer = audioCtx.createBuffer(
        1,
        numSamples,
        sampleRate
      );
      const channelData =
        buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        channelData[i] =
          Math.sin(
            2 * Math.PI * frequency * t
          ) * 0.5;
      }
      const wavBlob =
        audioBufferToWav(buffer);
      audioCtx.close();
      resolve(wavBlob);
    } catch (e) {
      reject(e);
    }
  });
};
const pitchShiftBlob = async (
  blob: Blob,
  ratio: number
): Promise<Blob> => {
  const audioCtx = new AudioContext();
  const arrayBuffer =
    await blob.arrayBuffer();
  const sourceBuffer =
    await audioCtx.decodeAudioData(
      arrayBuffer
    );
  const offlineLength = Math.ceil(
    sourceBuffer.length / ratio
  );
  const offlineCtx =
    new OfflineAudioContext(
      sourceBuffer.numberOfChannels,
      offlineLength,
      sourceBuffer.sampleRate
    );
  const bufferSource =
    offlineCtx.createBufferSource();
  bufferSource.buffer = sourceBuffer;
  bufferSource.playbackRate.value = ratio;
  bufferSource.connect(
    offlineCtx.destination
  );
  bufferSource.start();
  const rendered =
    await offlineCtx.startRendering();
  audioCtx.close();
  return audioBufferToWav(rendered);
};
const loopAudioToDuration = async (
  blob: Blob,
  targetDurationSec: number
): Promise<Blob> => {
  const audioCtx = new AudioContext();
  const arrayBuffer =
    await blob.arrayBuffer();
  const source =
    await audioCtx.decodeAudioData(
      arrayBuffer
    );
  const srcDuration =
    source.length / source.sampleRate;
  if (srcDuration >= targetDurationSec) {
    audioCtx.close();
    return blob;
  }
  const totalSamples = Math.round(
    targetDurationSec *
      source.sampleRate
  );
  const offlineCtx =
    new OfflineAudioContext(
      source.numberOfChannels,
      totalSamples,
      source.sampleRate
    );
  const channelData: Float32Array[] = [];
  for (
    let c = 0;
    c < source.numberOfChannels;
    c++
  ) {
    channelData.push(
      source.getChannelData(c)
    );
  }
  const destBuffer =
    offlineCtx.createBuffer(
      source.numberOfChannels,
      totalSamples,
      source.sampleRate
    );
  for (
    let c = 0;
    c < source.numberOfChannels;
    c++
  ) {
    const destData =
      destBuffer.getChannelData(c);
    for (
      let i = 0;
      i < totalSamples;
      i++
    ) {
      const srcIdx =
        i % source.length;
      destData[i] =
        channelData[c][srcIdx];
    }
  }
  const bufferSource =
    offlineCtx.createBufferSource();
  bufferSource.buffer = destBuffer;
  bufferSource.connect(
    offlineCtx.destination
  );
  bufferSource.start();
  const rendered =
    await offlineCtx.startRendering();
  audioCtx.close();
  return audioBufferToWav(rendered);
};
const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    if (!token || !sessionExpiry) {
      navigate('/login');
      return;
    }
    const expiryTime = parseInt(sessionExpiry, 10);
    if (Date.now() >= expiryTime) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('sessionId');
      navigate('/login');
      return;
    }
  }, [navigate]);
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const [currentStep, setCurrentStep] = useState(1);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryError, setNewSubcategoryError] = useState<string | null>(null);
  const [showInFeaturedProducts, setShowInFeaturedProducts] = useState(false);
  const [showInBestSellers, setShowInBestSellers] = useState(false);
  const [showInNewArrivals, setShowInNewArrivals] = useState(false);
  const [showInPremiumProducts, setShowInPremiumProducts] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([
    createEmptyVariant(),
  ]);
  const [productImages, setProductImages] = useState<{
    files: File[];
    previews: string[];
    urls: string[];
    uploading: boolean[];
    errors: string[];
  }>({
    files: [],
    previews: [],
    urls: [],
    uploading: [],
    errors: [],
  });
  const [variantImages, setVariantImages] = useState<{
    [variantId: string]: {
      files: File[];
      previews: string[];
      urls: string[];
      uploading: boolean[];
      errors: string[];
    };
  }>({});
  const [activeImageTabVariant, setActiveImageTabVariant] = useState<'product' | string>('product');
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [downloadingUnsplashIds, setDownloadingUnsplashIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [audioMode, setAudioMode] = useState<"text" | "upload" | "record" | "clone">("text");
  const [audioScript, setAudioScript] = useState("");
  const [audioLanguage, setAudioLanguage] = useState<"en" | "te" | "hi">("en");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [videoLength, setVideoLength] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoKitUrl, setVideoKitUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(false);
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [cloudinaryUploadStatus, setCloudinaryUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [cloudinaryUploadProgress, setCloudinaryUploadProgress] = useState(0);
  const [cloudinaryUploadMessage, setCloudinaryUploadMessage] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editedVideoBlob, setEditedVideoBlob] = useState<Blob | null>(null);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [isUpdatingOnly, setIsUpdatingOnly] = useState(false);
  const [updateOnlyError, setUpdateOnlyError] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [voices, setVoices] = useState<UserVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [clonedAudioBlob, setClonedAudioBlob] = useState<Blob | null>(null);
  const [clonedAudioUrl, setClonedAudioUrl] = useState<string | null>(null);
  const [isGeneratingClonedAudio, setIsGeneratingClonedAudio] = useState(false);
  const [clonedAudioError, setClonedAudioError] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<"generate" | "upload">("generate");
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const response = await apiClient.get('/categories');
      const cats = response.data.map((cat: any) => ({
        id: String(cat.id),
        name: cat.name,
        subcategories: (cat.subCategories || []).map((sub: any) => ({
          id: String(sub.id),
          name: sub.name,
        })),
      }));
      setCategories(cats);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setCategoriesError(err.response?.data?.message || 'Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  const loadAudioFromUrl = useCallback(async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load existing audio");
    }
    return await response.blob();
  }, []);
  const fetchVoices = useCallback(async () => {
    try {
      const response = await apiClient.get('/user-voices');
      const baseUrl = API_BASE.replace('/api', '');
      const voicesWithFullUrl = response.data.map((voice: any) => ({
        ...voice,
        sampleAudioUrl: voice.sampleAudioUrl ? `${baseUrl}${voice.sampleAudioUrl}` : null
      }));
      setVoices(voicesWithFullUrl);
    } catch (err: any) {
      console.error('Failed to fetch voices:', err);
    }
  }, []);
  const createVoice = useCallback(async (name: string, sampleFile: File) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('sample', sampleFile);
    const response = await apiClient.post('/user-voices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }, []);
  const deleteVoice = useCallback(async (voiceId: number) => {
    await apiClient.delete(`/user-voices/${voiceId}`);
  }, []);
  const generateClonedAudio = useCallback(async (voiceId: number, language: string, text: string): Promise<Blob> => {
    const response = await apiClient.post('/user-voices/generate', {
      voiceId,
      language,
      text,
    }, {
      responseType: 'blob',
    });
    return response.data;
  }, []);
  const uploadVideoToCloudinary = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    return new Promise<{ publicId: string }>((resolve, reject) => {
      reject(new Error("Direct upload not implemented"));
    });
  }, []);
  const fetchProductData = async (id: string) => {
    setIsLoadingProduct(true);
    try {
      const response = await apiClient.get(`/products/${id}`);
      if (response.data.success) {
        const product = response.data.data;
        setProductId(id);
        setProductName(product.name || "");
        setPrice(product.basePrice?.toString() || "");
        setCostPrice(product.costPrice?.toString() || "");
        setStockQuantity(product.stockQuantity?.toString() || "");
        setSku(product.defaultSku || "");
        setDescription(product.description || "");
        setSelectedCategoryId(product.categoryId ? String(product.categoryId) : "");
        setSelectedSubcategoryId(product.subcategoryId ? String(product.subcategoryId) : "");
        setShowInFeaturedProducts(product.showInFeaturedProducts || false);
        setShowInBestSellers(product.showInBestSellers || false);
        setShowInNewArrivals(product.showInNewArrivals || false);
        setShowInPremiumProducts(product.showInPremiumProducts || false);
        setAudioMode(product.audioMode || "text");
        setAudioScript(product.audioScript || "");
        setAudioLanguage((product.audioLanguage as "en" | "te" | "hi") || "en");
        setVoiceGender(product.voiceGender || "female");
        setVideoLength(product.videoLength || 30);
        if (product.images && product.images.length > 0) {
          const imageUrls = product.images.map((img: any) => img.url).filter(Boolean);
          setProductImages({
            files: [],
            previews: [],
            urls: imageUrls,
            uploading: imageUrls.map(() => false),
            errors: imageUrls.map(() => ""),
          });
        } else {
          setProductImages({
            files: [],
            previews: [],
            urls: [],
            uploading: [],
            errors: [],
          });
        }
        if (product.variants && product.variants.length > 0) {
          const variantList = product.variants.map((v: any) => ({
            id: v.id,
            sku: v.sku || "",
            size: v.size || "",
            color: v.color || "",
            price: v.price?.toString() || "",
            costPrice: v.costPrice?.toString() || "",
            stockQuantity: v.stockQuantity?.toString() || "",
          }));
          setVariants(variantList);
          const variantImagesMap: { [key: string]: any } = {};
          product.variants.forEach((v: any) => {
            const variantImgUrls = product.images
              ?.filter((img: any) => img.variantId === v.id)
              .map((img: any) => img.url) || [];
            variantImagesMap[v.id] = {
              files: [],
              previews: [],
              urls: variantImgUrls,
              uploading: variantImgUrls.map(() => false),
              errors: variantImgUrls.map(() => ""),
            };
          });
          setVariantImages(variantImagesMap);
        } else {
          setVariants([createEmptyVariant()]);
        }
        if (product.cloudinaryVideoPublicId) {
          const cloudinaryUrl = getCloudinaryVideoUrl(product.cloudinaryVideoPublicId);
          if (cloudinaryUrl) {
            setExistingVideoUrl(cloudinaryUrl);
            setCloudinaryPublicId(product.cloudinaryVideoPublicId);
            setCloudinaryUploadStatus("success");
          }
        } else if (product.videoUrl && product.videoUrl.startsWith('http')) {
          setExistingVideoUrl(product.videoUrl);
        }
        const existingAudioUrl = product.audioUrl || product.audioFileUrl || product.audioKitUrl || null;
        if (existingAudioUrl) {
          setCustomAudioUrl(existingAudioUrl);
        }
        const existingRecordedAudioUrl = product.recordedAudioUrl || null;
        if (existingRecordedAudioUrl) {
          setRecordedAudioUrl(existingRecordedAudioUrl);
        }
        fetchVoices();
      }
    } catch (err: any) {
      console.error("Failed to fetch product:", err);
      setCreateError(err.message || "Failed to load product details");
    } finally {
      setIsLoadingProduct(false);
    }
  };
  useEffect(() => {
    if (editId) {
      fetchProductData(editId);
    }
  }, [editId]);
  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === "__add_new__") {
      setShowAddCategory(true);
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
      setShowAddSubcategory(false);
      setNewSubcategoryName("");
      setNewSubcategoryError(null);
      setErrors((prev) => {
        const { category, subcategory, ...rest } = prev as any;
        return rest;
      });
      return;
    }
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId("");
    setShowAddSubcategory(false);
    setNewSubcategoryName("");
    setNewSubcategoryError(null);
    setShowAddCategory(false);
    setNewCategoryName("");
    setNewCategoryError(null);
    setErrors((prev) => {
      const { category, subcategory, ...rest } = prev as any;
      return rest;
    });
  };
  const handleSubcategoryChange = (subcategoryId: string) => {
    if (subcategoryId === "__add_new__") {
      setShowAddSubcategory(true);
      setSelectedSubcategoryId("");
      return;
    }
    setSelectedSubcategoryId(subcategoryId);
    setShowAddSubcategory(false);
    setNewSubcategoryError(null);
    setErrors((prev) => {
      const { subcategory, ...rest } = prev;
      return rest;
    });
  };
  const handleAddNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setNewCategoryError("Category name cannot be empty");
      return;
    }
    const existing = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setNewCategoryError("A category with this name already exists");
      return;
    }
    setNewCategoryError(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', '');
      formData.append('order', '0');
      formData.append('isActive', 'true');
      formData.append('showInCategoryGrid', 'true');
      formData.append('showInHero', 'false');
      const response = await apiClient.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newCat = response.data;
      await fetchCategories();
      setSelectedCategoryId(String(newCat.id));
      setSelectedSubcategoryId("");
      setShowAddSubcategory(false);
      setNewSubcategoryName("");
      setNewSubcategoryError(null);
      setShowAddCategory(false);
      setNewCategoryName("");
      setNewCategoryError(null);
      setErrors((prev) => {
        const { category, subcategory, ...rest } = prev as any;
        return rest;
      });
    } catch (err: any) {
      console.error('Error creating category:', err);
      setNewCategoryError(err.response?.data?.message || 'Failed to create category');
    }
  };
  const handleCancelAddCategory = () => {
    setShowAddCategory(false);
    setNewCategoryName("");
    setNewCategoryError(null);
  };
  const handleAddNewSubcategory = async () => {
    const name = newSubcategoryName.trim();
    if (!name) {
      setNewSubcategoryError("Subcategory name cannot be empty");
      return;
    }
    if (!selectedCategoryId) {
      setNewSubcategoryError("Please select a category first");
      return;
    }
    const existing = categories
      .find((c) => c.id === selectedCategoryId)
      ?.subcategories.find(
        (s) => s.name.toLowerCase() === name.toLowerCase()
      );
    if (existing) {
      setNewSubcategoryError("A subcategory with this name already exists");
      return;
    }
    setNewSubcategoryError(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('parentId', selectedCategoryId);
      formData.append('description', '');
      formData.append('order', '0');
      formData.append('isActive', 'true');
      formData.append('showInCategoryGrid', 'true');
      formData.append('showInHero', 'false');
      const response = await apiClient.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newSub = response.data;
      await fetchCategories();
      setSelectedSubcategoryId(String(newSub.id));
      setShowAddSubcategory(false);
      setNewSubcategoryName("");
      setNewSubcategoryError(null);
    } catch (err: any) {
      console.error('Error creating subcategory:', err);
      setNewSubcategoryError(err.response?.data?.message || 'Failed to create subcategory');
    }
  };
  const handleCancelAddSubcategory = () => {
    setShowAddSubcategory(false);
    setNewSubcategoryName("");
    setNewSubcategoryError(null);
  };
  const handleUnsplashSearch = async () => {
    if (!unsplashQuery.trim()) return;
    setIsSearchingUnsplash(true);
    setUnsplashError(null);
    try {
      const res = await axios.get(
        "https://api.unsplash.com/search/photos",
        {
          params: { query: unsplashQuery, per_page: 20 },
          headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        }
      );
      setUnsplashResults(res.data.results || []);
    } catch (err: any) {
      setUnsplashError(err.message || "Failed to search Unsplash");
    } finally {
      setIsSearchingUnsplash(false);
    }
  };
  const handleDownloadUnsplash = async (photo: any, targetVariantId?: string) => {
    const photoId = photo.id;
    if (downloadingUnsplashIds.has(photoId)) return;
    setDownloadingUnsplashIds((prev) => new Set(prev).add(photoId));
    try {
      const imageUrl = photo.urls?.regular || photo.urls?.small;
      const res = await axios.get(imageUrl, { responseType: "blob" });
      const file = new File(
        [res.data],
        `unsplash-${photoId}.jpg`,
        { type: "image/jpeg" }
      );
      const previewUrl = URL.createObjectURL(file);
      if (targetVariantId) {
        setVariantImages((prev) => {
          const current = prev[targetVariantId] || {
            files: [], previews: [], urls: [], uploading: [], errors: [],
          };
          return {
            ...prev,
            [targetVariantId]: {
              ...current,
              files: [...current.files, file],
              previews: [...current.previews, previewUrl],
              uploading: [...current.uploading, false],
              errors: [...current.errors, ""],
            },
          };
        });
      } else {
        setProductImages((prev) => ({
          ...prev,
          files: [...prev.files, file],
          previews: [...prev.previews, previewUrl],
          uploading: [...prev.uploading, false],
          errors: [...prev.errors, ""],
        }));
      }
    } catch (err: any) {
      console.error("Failed to download Unsplash image", err);
    } finally {
      setDownloadingUnsplashIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }
    if (newFiles.length === 0) return;
    if (activeImageTabVariant === 'product') {
      setProductImages((prev) => ({
        ...prev,
        files: [...prev.files, ...newFiles],
        previews: [...prev.previews, ...newPreviews],
        uploading: [...prev.uploading, ...new Array(newFiles.length).fill(false)],
        errors: [...prev.errors, ...new Array(newFiles.length).fill("")],
      }));
    } else {
      const variantId = activeImageTabVariant;
      setVariantImages((prev) => {
        const current = prev[variantId] || {
          files: [], previews: [], urls: [], uploading: [], errors: [],
        };
        return {
          ...prev,
          [variantId]: {
            ...current,
            files: [...current.files, ...newFiles],
            previews: [...current.previews, ...newPreviews],
            uploading: [...current.uploading, ...new Array(newFiles.length).fill(false)],
            errors: [...current.errors, ...new Array(newFiles.length).fill("")],
          },
        };
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const removeImage = (target: 'product' | string, index: number) => {
    if (target === 'product') {
      setProductImages((prev) => {
        const cloudCount = prev.urls.length;
        const newUrls = [...prev.urls];
        const newPreviews = [...prev.previews];
        const newFiles = [...prev.files];
        const newUploading = [...prev.uploading];
        const newErrors = [...prev.errors];
        if (index < cloudCount) {
          newUrls.splice(index, 1);
          newUploading.splice(index, 1);
          newErrors.splice(index, 1);
        } else {
          const localIndex = index - cloudCount;
          const url = newPreviews[localIndex];
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
          newFiles.splice(localIndex, 1);
          newPreviews.splice(localIndex, 1);
          newUploading.splice(localIndex, 1);
          newErrors.splice(localIndex, 1);
        }
        return {
          ...prev,
          files: newFiles,
          previews: newPreviews,
          urls: newUrls,
          uploading: newUploading,
          errors: newErrors,
        };
      });
    } else {
      const variantId = target;
      setVariantImages((prev) => {
        const current = prev[variantId];
        if (!current) return prev;
        const cloudCount = current.urls.length;
        const newUrls = [...current.urls];
        const newPreviews = [...current.previews];
        const newFiles = [...current.files];
        const newUploading = [...current.uploading];
        const newErrors = [...current.errors];
        if (index < cloudCount) {
          newUrls.splice(index, 1);
          newUploading.splice(index, 1);
          newErrors.splice(index, 1);
        } else {
          const localIndex = index - cloudCount;
          const url = newPreviews[localIndex];
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
          newFiles.splice(localIndex, 1);
          newPreviews.splice(localIndex, 1);
          newUploading.splice(localIndex, 1);
          newErrors.splice(localIndex, 1);
        }
        return {
          ...prev,
          [variantId]: {
            ...current,
            files: newFiles,
            previews: newPreviews,
            urls: newUrls,
            uploading: newUploading,
            errors: newErrors,
          },
        };
      });
    }
  };
  const uploadAllImages = async (): Promise<{ url: string; variantId: string | null }[]> => {
    const uploadedItems: { url: string; variantId: string | null }[] = [];
    for (let i = 0; i < productImages.files.length; i++) {
      const file = productImages.files[i];
      if (file && file.size > 0) {
        try {
          const uploadedUrl = await uploadToImageKit(file);
          if (uploadedUrl) {
            uploadedItems.push({ url: uploadedUrl, variantId: null });
          } else {
            throw new Error(`Failed to upload product image ${i + 1}`);
          }
        } catch (err) {
          throw new Error(`Failed to upload product image ${i + 1}: ${err}`);
        }
      }
    }
    for (const [variantId, state] of Object.entries(variantImages)) {
      for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        if (file && file.size > 0) {
          try {
            const uploadedUrl = await uploadToImageKit(file);
            if (uploadedUrl) {
              uploadedItems.push({ url: uploadedUrl, variantId });
            } else {
              throw new Error(`Failed to upload image for variant ${variantId}`);
            }
          } catch (err) {
            throw new Error(`Failed to upload image for variant ${variantId}: ${err}`);
          }
        }
      }
    }
    for (const url of productImages.urls) {
      if (url && url.startsWith("http")) {
        uploadedItems.push({ url, variantId: null });
      }
    }
    for (const [variantId, state] of Object.entries(variantImages)) {
      for (const url of state.urls) {
        if (url && url.startsWith("http")) {
          uploadedItems.push({ url, variantId });
        }
      }
    }
    return uploadedItems;
  };
  const saveProductToDB = async () => {
    setIsUploadingImages(true);
    try {
      const uploadedImageItems = await uploadAllImages();
      setIsUploadingImages(false);
      let audioUrl = customAudioUrl || undefined;
      if (audioMode === "clone" && clonedAudioUrl) {
        audioUrl = clonedAudioUrl;
      }
      let videoUrlToSave = videoKitUrl || videoUrl;
      if (videoSource === "upload" && cloudinaryPublicId) {
        const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'lovecart';
        videoUrlToSave = `https://res.cloudinary.com/${cloudName}/video/upload/${cloudinaryPublicId}`;
      }
      const productData = {
        name: productName,
        price,
        costPrice,
        stockQuantity,
        sku,
        description,
        categoryId: selectedCategoryId ? parseInt(selectedCategoryId, 10) : null,
        subcategoryId: selectedSubcategoryId ? parseInt(selectedSubcategoryId, 10) : null,
        showInFeaturedProducts,
        showInBestSellers,
        showInNewArrivals,
        showInPremiumProducts,
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          costPrice: v.costPrice,
          stockQuantity: v.stockQuantity,
        })),
        images: uploadedImageItems.map((item, index) => ({
          url: item.url,
          variantId: item.variantId,
          position: index,
        })),
        videoUrl: videoUrlToSave,
        audioMode,
        audioScript,
        audioLanguage,
        voiceGender,
        videoLength,
        audioUrl: audioUrl,
        cloudinaryVideoPublicId: cloudinaryPublicId,
        cloudinaryAudioPublicId: null,
      };
      let response;
      if (isEditMode) {
        response = await apiClient.put(`/products/${editId}`, productData);
      } else {
        response = await apiClient.post(`/products`, productData);
      }
      if (response.data) {
        if (!isEditMode && response.data?.data?.id) {
          setProductId(response.data.data.id);
        } else if (isEditMode) {
          setProductId(editId);
        }
        if (response.data?.data?.images) {
          const productImagesFromResponse = response.data.data.images.filter((img: any) => !img.variantId);
          const variantImagesFromResponse = response.data.data.images.filter((img: any) => img.variantId);
          setProductImages((prev) => ({
            ...prev,
            urls: productImagesFromResponse.map((img: any) => img.url),
            files: [],
            previews: [],
            uploading: productImagesFromResponse.map(() => false),
            errors: productImagesFromResponse.map(() => ""),
          }));
          const newVariantImages: any = {};
          for (const variant of variants) {
            const variantImgs = variantImagesFromResponse.filter((img: any) => img.variantId === variant.id);
            newVariantImages[variant.id] = {
              files: [],
              previews: [],
              urls: variantImgs.map((img: any) => img.url),
              uploading: variantImgs.map(() => false),
              errors: variantImgs.map(() => ""),
            };
          }
          setVariantImages(newVariantImages);
        }
        return response.data;
      } else {
        throw new Error('Failed to save product');
      }
    } catch (err: any) {
      console.error("Error saving product:", err);
      throw err;
    } finally {
      setIsUploadingImages(false);
    }
  };
  const handleSaveOnly = async () => {
    setIsUpdatingOnly(true);
    setUpdateOnlyError(null);
    try {
      await saveProductToDB();
      setPostSuccess(true);
    } catch (err: any) {
      setUpdateOnlyError(err.response?.data?.message || err.message || "Failed to save product");
    } finally {
      setIsUpdatingOnly(false);
    }
  };
  const handlePostToInstagram = async () => {};
  const resetAllState = () => {
    // Reset all states to initial values
    setProductImages({ files: [], previews: [], urls: [], uploading: [], errors: [] });
    setVariantImages({});
    setActiveImageTabVariant('product');
    setVariants([createEmptyVariant()]);
    setCurrentStep(1);
    setProductName("");
    setPrice("");
    setCostPrice("");
    setStockQuantity("");
    setSku("");
    setDescription("");
    setErrors({});
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setShowAddCategory(false);
    setNewCategoryName("");
    setNewCategoryError(null);
    setShowAddSubcategory(false);
    setNewSubcategoryName("");
    setNewSubcategoryError(null);
    setShowInFeaturedProducts(false);
    setShowInBestSellers(false);
    setShowInNewArrivals(false);
    setShowInPremiumProducts(false);
    // Reset unsplash
    setUnsplashQuery("");
    setUnsplashResults([]);
    setIsSearchingUnsplash(false);
    setUnsplashError(null);
    setDownloadingUnsplashIds(new Set());
    // Reset audio/video states
    setShowConfig(true);
    setAudioMode("text");
    setAudioScript("");
    setAudioLanguage("en");
    setVoiceGender("female");
    setCustomAudioFile(null);
    setCustomAudioUrl(null);
    setTtsPreviewUrl(null);
    setIsRecording(false);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingError(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setVideoLength(30);
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationMessage("");
    setVideoUrl(null);
    setVideoKitUrl(null);
    setGenerationError(null);
    setVideoUploadProgress(false);
    setAudioGenerating(false);
    setAudioError(null);
    setIsPosting(false);
    setPostSuccess(false);
    setCreateError(null);
    setExistingVideoUrl(null);
    setCloudinaryUploadStatus("idle");
    setCloudinaryUploadProgress(0);
    setCloudinaryUploadMessage("");
    setCloudinaryPublicId(null);
    setEditedVideoBlob(null);
    setEditedVideoUrl(null);
    setShowVideoEditor(false);
    setIsUpdatingOnly(false);
    setUpdateOnlyError(null);
    setProductId(null);
    setVoices([]);
    setSelectedVoiceId(null);
    setClonedAudioBlob(null);
    if (clonedAudioUrl) {
      URL.revokeObjectURL(clonedAudioUrl);
      setClonedAudioUrl(null);
    }
    setIsGeneratingClonedAudio(false);
    setClonedAudioError(null);
    setVideoSource("generate");
    setUploadedVideoFile(null);
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      setUploadedVideoUrl(null);
    }
    // Reset any other relevant states
  };
  if (isLoadingProduct) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 px-3 sm:px-0">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Link to="/all-videos" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {isEditMode ? "Edit Product" : "Create New Product"}
          </h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-3 sm:px-0">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <Link to="/all-videos" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          {isEditMode ? "Edit Product" : "Create New Product"}
        </h1>
      </div>
      <div className="card-glass p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="w-full">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                      currentStep > step.id
                        ? "bg-purple-600 text-white shadow-md"
                        : currentStep === step.id
                        ? "bg-purple-600 text-white shadow-lg ring-4 ring-purple-200"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > step.id ? <Check size={16} /> : step.id}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs mt-1.5 hidden sm:block font-medium ${
                      currentStep >= step.id ? "text-purple-700" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded-full ${
                      currentStep > step.id ? "bg-purple-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-sm font-medium text-purple-700 mt-2 sm:hidden">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.label}
          </p>
        </div>
        <div className="space-y-6">
          {currentStep === 1 && (
            <ProductDetails
              productName={productName}
              setProductName={setProductName}
              price={price}
              setPrice={setPrice}
              costPrice={costPrice}
              setCostPrice={setCostPrice}
              stockQuantity={stockQuantity}
              setStockQuantity={setStockQuantity}
              sku={sku}
              setSku={setSku}
              description={description}
              setDescription={setDescription}
              errors={errors}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              setSelectedSubcategoryId={setSelectedSubcategoryId}
              showAddCategory={showAddCategory}
              setShowAddCategory={setShowAddCategory}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              newCategoryError={newCategoryError}
              setNewCategoryError={setNewCategoryError}
              showAddSubcategory={showAddSubcategory}
              setShowAddSubcategory={setShowAddSubcategory}
              newSubcategoryName={newSubcategoryName}
              setNewSubcategoryName={setNewSubcategoryName}
              newSubcategoryError={newSubcategoryError}
              setNewSubcategoryError={setNewSubcategoryError}
              variants={variants}
              setVariants={setVariants}
              handleAddVariant={() => {
                const newVariant = createEmptyVariant();
                setVariants([...variants, newVariant]);
                setVariantImages((prev) => ({
                  ...prev,
                  [newVariant.id]: {
                    files: [],
                    previews: [],
                    urls: [],
                    uploading: [],
                    errors: [],
                  },
                }));
              }}
              handleRemoveVariant={(id) => {
                setVariants(variants.filter((v) => v.id !== id));
                setVariantImages((prev) => {
                  const newMap = { ...prev };
                  delete newMap[id];
                  return newMap;
                });
                if (activeImageTabVariant === id) {
                  setActiveImageTabVariant('product');
                }
              }}
              handleVariantChange={(
                id: string,
                field: keyof Omit<ProductVariant, "id">,
                value: string
              ) => {
                setVariants((prev) =>
                  prev.map((v) =>
                    v.id === id ? { ...v, [field]: value } : v
                  )
                );
              }}
              handleFillAllVariantsPrice={() => {
                if (!price) return;
                setVariants((prev) =>
                  prev.map((v) => ({
                    ...v,
                    price: v.price || price,
                  }))
                );
              }}
              handleAddNewCategory={handleAddNewCategory}
              handleCancelAddCategory={handleCancelAddCategory}
              handleAddNewSubcategory={handleAddNewSubcategory}
              handleCancelAddSubcategory={handleCancelAddSubcategory}
              handleCategoryChange={handleCategoryChange}
              handleSubcategoryChange={handleSubcategoryChange}
              showInFeaturedProducts={showInFeaturedProducts}
              setShowInFeaturedProducts={setShowInFeaturedProducts}
              showInBestSellers={showInBestSellers}
              setShowInBestSellers={setShowInBestSellers}
              showInNewArrivals={showInNewArrivals}
              setShowInNewArrivals={setShowInNewArrivals}
              showInPremiumProducts={showInPremiumProducts}
              setShowInPremiumProducts={setShowInPremiumProducts}
            />
          )}
          {currentStep === 2 && (
            <div>
              <ImageUpload
                productImages={productImages}
                setProductImages={setProductImages}
                variants={variants}
                variantImages={variantImages}
                setVariantImages={setVariantImages}
                activeTab={activeImageTabVariant}
                setActiveTab={setActiveImageTabVariant}
                unsplashQuery={unsplashQuery}
                setUnsplashQuery={setUnsplashQuery}
                unsplashResults={unsplashResults}
                isSearchingUnsplash={isSearchingUnsplash}
                unsplashError={unsplashError}
                downloadingUnsplashIds={downloadingUnsplashIds}
                handleUnsplashSearch={handleUnsplashSearch}
                handleDownloadUnsplash={handleDownloadUnsplash}
                onImageClick={(url, variantId) => {
                  let allImages: string[] = [];
                  if (variantId) {
                    const state = variantImages[variantId];
                    if (state) {
                      allImages = [...state.urls, ...state.previews];
                    }
                  } else {
                    allImages = [...productImages.urls, ...productImages.previews];
                  }
                  if (allImages.length > 0) {
                    const index = allImages.indexOf(url);
                    if (index !== -1) {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }
                  }
                }}
                fileInputRef={fileInputRef}
              />
            </div>
          )}
          {currentStep === 3 && (
            <VideoConfiguration
              audioMode={audioMode}
              setAudioMode={setAudioMode as any}
              audioScript={audioScript}
              setAudioScript={setAudioScript}
              audioLanguage={audioLanguage}
              setAudioLanguage={setAudioLanguage}
              voiceGender={voiceGender}
              setVoiceGender={setVoiceGender}
              customAudioFile={customAudioFile}
              setCustomAudioFile={setCustomAudioFile}
              customAudioUrl={customAudioUrl}
              setCustomAudioUrl={setCustomAudioUrl}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              recordedAudioBlob={recordedAudioBlob}
              setRecordedAudioBlob={setRecordedAudioBlob}
              recordedAudioUrl={recordedAudioUrl}
              setRecordedAudioUrl={setRecordedAudioUrl}
              recordingError={recordingError}
              videoLength={videoLength}
              setVideoLength={setVideoLength}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              generationMessage={generationMessage}
              generationError={generationError}
              imagesLength={productImages.urls.length + productImages.previews.length}
              audioGenerating={audioGenerating}
              audioError={audioError}
              handlePreviewTTS={() => {}}
              handleGenerateVideo={() => {}}
              startRecording={() => {}}
              stopRecording={() => {}}
              existingVideoUrl={existingVideoUrl}
              cloudinaryUploadStatus={cloudinaryUploadStatus}
              cloudinaryUploadProgress={cloudinaryUploadProgress}
              cloudinaryUploadMessage={cloudinaryUploadMessage}
              cloudinaryPublicId={cloudinaryPublicId}
              voices={voices}
              setVoices={setVoices}
              selectedVoiceId={selectedVoiceId}
              setSelectedVoiceId={setSelectedVoiceId}
              clonedAudioBlob={clonedAudioBlob}
              setClonedAudioBlob={setClonedAudioBlob}
              clonedAudioUrl={clonedAudioUrl}
              setClonedAudioUrl={setClonedAudioUrl}
              isGeneratingClonedAudio={isGeneratingClonedAudio}
              setIsGeneratingClonedAudio={setIsGeneratingClonedAudio}
              clonedAudioError={clonedAudioError}
              setClonedAudioError={setClonedAudioError}
              createVoice={createVoice}
              fetchVoices={fetchVoices}
              generateClonedAudio={generateClonedAudio}
              deleteVoice={deleteVoice}
              videoSource={videoSource}
              setVideoSource={setVideoSource}
              uploadedVideoFile={uploadedVideoFile}
              setUploadedVideoFile={setUploadedVideoFile}
              uploadedVideoUrl={uploadedVideoUrl}
              setUploadedVideoUrl={setUploadedVideoUrl}
              uploadVideoToCloudinary={uploadVideoToCloudinary}
            />
          )}
          {currentStep === 4 && (
            <VideoPreviewComponent
              videoUrl={videoUrl}
              previews={productImages.previews}
              setCurrentStep={setCurrentStep}
              setShowConfig={setShowConfig}
            />
          )}
          {currentStep === 5 && (
            <PostToInstagram
              isPosting={isPosting || isUploadingImages}
              postSuccess={postSuccess}
              createError={createError}
              productName={productName}
              price={price}
              description={description}
              handlePostToInstagram={handlePostToInstagram}
              resetAllState={resetAllState}
              isEditMode={isEditMode}
              videoUrl={videoUrl || existingVideoUrl}
              cloudinaryPublicId={cloudinaryPublicId}
              onUpdateProductOnly={handleSaveOnly}
              isUpdatingOnly={isUpdatingOnly}
              updateOnlyError={updateOnlyError}
              onBack={() => setCurrentStep(4)}
              productId={productId}
            />
          )}
        </div>
        {currentStep < 5 && (
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
            <button
              onClick={() => {
                if (currentStep > 1) setCurrentStep(currentStep - 1);
              }}
              disabled={currentStep === 1 || (currentStep === 3 && isGenerating)}
              className="btn-secondary flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowLeft size={20} /> Back
            </button>
            <button
              onClick={() => {
                if (currentStep === 1) {
                  const newErrors: { [key: string]: string } = {};
                  if (!productName.trim()) newErrors.productName = "Product name is required";
                  if (!price.trim()) newErrors.price = "Price is required";
                  if (!selectedCategoryId) newErrors.category = "Category is required";
                  if (!selectedSubcategoryId) newErrors.subcategory = "Subcategory is required";
                  setErrors(newErrors);
                  if (Object.keys(newErrors).length > 0) return;
                }
                if (currentStep === 2) {
                  const hasProductImages = productImages.urls.length > 0 || productImages.files.length > 0;
                  const hasVariantImages = Object.values(variantImages).some(
                    (state) => state.urls.length > 0 || state.files.length > 0
                  );
                  if (!hasProductImages && !hasVariantImages) {
                    return;
                  }
                }
                if (currentStep < 5) setCurrentStep(currentStep + 1);
              }}
              disabled={
                (currentStep === 2 &&
                  productImages.urls.length === 0 &&
                  productImages.files.length === 0 &&
                  Object.values(variantImages).every(
                    (state) => state.urls.length === 0 && state.files.length === 0
                  )) ||
                (currentStep === 3 && !videoUrl && !showConfig) ||
                (currentStep === 3 && isGenerating) ||
                (currentStep === 3 && generationError !== null) ||
                (currentStep === 3 && cloudinaryUploadStatus === "uploading")
              }
              className="btn-primary flex items-center justify-center gap-2 px-6 sm:px-8 py-2 sm:py-3"
            >
              {currentStep === 4 ? "Continue to Post" : "Next"} <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
      <ImageLightbox
        images={[...productImages.urls, ...productImages.previews]}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onImageChange={(index: number) => setLightboxIndex(index)}
      />
    </div>
  );
};
export default CreateProduct;
