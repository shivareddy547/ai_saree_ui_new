import React, { useState, useRef, useEffect, useCallback } from "react";
          import { Link } from "react-router-dom";
          import axios from "axios";
          import {
            Upload,
            X,
            ArrowLeft,
            ArrowRight,
            Check,
            Loader2,
            Play,
            Send,
            Search,
            Image as ImageIcon,
            Settings2,
            RotateCcw,
            Mic,
            FileText,
            FileAudio,
            Volume2,
            Ear,
            Plus,
            Trash2,
            Package,
            ChevronDown,
            FolderTree,
            Tag,
          } from "lucide-react";
          import { uploadToImageKit } from "../utils/imageKitUpload";

          const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const UNSPLASH_ACCESS_KEY =
            "bzBups-AqyogXRdO5QpQxSkcu9peuTSc8yZXGMGcGPs";

          const steps = [
            { id: 1, label: "Product Details" },
            { id: 2, label: "Upload Images" },
            { id: 3, label: "Video Configuration" },
            { id: 4, label: "Preview" },
            { id: 5, label: "Post to Instagram" },
          ];

          // ------------------------------------------------------------------
          // Types
          // ------------------------------------------------------------------
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

          const createEmptyVariant = (): ProductVariant => ({
            id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sku: "",
            size: "",
            color: "",
            price: "",
            costPrice: "",
            stockQuantity: "",
          });

          // ------------------------------------------------------------------
          // Initial Categories (existing categories seed data)
          // ------------------------------------------------------------------
          const INITIAL_CATEGORIES: Category[] = [
            {
              id: "cat-sarees",
              name: "Sarees",
              subcategories: [
                { id: "sub-banarasi", name: "Banarasi Silk" },
                { id: "sub-kanjeevaram", name: "Kanjeevaram" },
                { id: "sub-cotton", name: "Cotton Saree" },
                { id: "sub-georgette", name: "Georgette" },
              ],
            },
            {
              id: "cat-lehengas",
              name: "Lehengas",
              subcategories: [
                { id: "sub-bridal", name: "Bridal Lehenga" },
                { id: "sub-designer", name: "Designer Lehenga" },
                { id: "sub-party", name: "Party Wear" },
              ],
            },
            {
              id: "cat-suits",
              name: "Suits & Kurtis",
              subcategories: [
                { id: "sub-anarkali", name: "Anarkali" },
                { id: "sub-straight", name: "Straight Cut" },
                { id: "sub-palazzo", name: "Palazzo Set" },
              ],
            },
            {
              id: "cat-accessories",
              name: "Accessories",
              subcategories: [
                { id: "sub-jewelry", name: "Jewelry" },
                { id: "sub-bags", name: "Handbags" },
                { id: "sub-stoles", name: "Stoles & Dupattas" },
              ],
            },
          ];

          // ------------------------------------------------------------------
          // Helper: AudioBuffer → WAV Blob
          // ------------------------------------------------------------------
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
            const writeString = (v: DataView, offset: number, s: string) => {
              for (let i = 0; i < s.length; i++)
                v.setUint8(offset + i, s.charCodeAt(i));
            };
            writeString(view, 0, "RIFF");
            view.setUint32(4, totalLength - 8, true);
            writeString(view, 8, "WAVE");
            writeString(view, 12, "fmt ");
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
            view.setUint16(32, numChannels * (bitDepth / 8), true);
            view.setUint16(34, bitDepth, true);
            writeString(view, 36, "data");
            view.setUint32(40, dataLength, true);
            const channels: Float32Array[] = [];
            for (let c = 0; c < numChannels; c++)
              channels.push(buffer.getChannelData(c));
            let offset = 44;
            for (let i = 0; i < length; i++) {
              for (let c = 0; c < numChannels; c++) {
                let sample = Math.max(-1, Math.min(1, channels[c][i]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(offset, sample, true);
                offset += 2;
              }
            }
            return new Blob([arrayBuffer], { type: "audio/wav" });
          };

          // ------------------------------------------------------------------
          // Helper: generate a short fallback beep tone
          // ------------------------------------------------------------------
          const generateFallbackAudio = (
            duration: number = 5,
            frequency: number = 440
          ): Promise<Blob> => {
            return new Promise((resolve, reject) => {
              try {
                const sampleRate = 44100;
                const numSamples = sampleRate * duration;
                const audioCtx = new AudioContext();
                const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < numSamples; i++) {
                  const t = i / sampleRate;
                  channelData[i] =
                    Math.sin(2 * Math.PI * frequency * t) * 0.5;
                }
                const wavBlob = audioBufferToWav(buffer);
                audioCtx.close();
                resolve(wavBlob);
              } catch (e) {
                reject(e);
              }
            });
          };

          // ------------------------------------------------------------------
          // Helper: pitch-shift audio blob
          // ------------------------------------------------------------------
          const pitchShiftBlob = async (
            blob: Blob,
            ratio: number
          ): Promise<Blob> => {
            const audioCtx = new AudioContext();
            const arrayBuffer = await blob.arrayBuffer();
            const sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const offlineLength = Math.ceil(sourceBuffer.length / ratio);
            const offlineCtx = new OfflineAudioContext(
              sourceBuffer.numberOfChannels,
              offlineLength,
              sourceBuffer.sampleRate
            );
            const bufferSource = offlineCtx.createBufferSource();
            bufferSource.buffer = sourceBuffer;
            bufferSource.playbackRate.value = ratio;
            bufferSource.connect(offlineCtx.destination);
            bufferSource.start();
            const rendered = await offlineCtx.startRendering();
            audioCtx.close();
            return audioBufferToWav(rendered);
          };

          // ------------------------------------------------------------------
          // Helper: loop an audio buffer to reach a target duration
          // ------------------------------------------------------------------
          const loopAudioToDuration = async (
            blob: Blob,
            targetDurationSec: number
          ): Promise<Blob> => {
            const audioCtx = new AudioContext();
            const arrayBuffer = await blob.arrayBuffer();
            const source = await audioCtx.decodeAudioData(arrayBuffer);
            const srcDuration = source.length / source.sampleRate;
            if (srcDuration >= targetDurationSec) {
              audioCtx.close();
              return blob;
            }
            const numLoops = Math.ceil(targetDurationSec / srcDuration);
            const totalSamples = Math.round(
              targetDurationSec * source.sampleRate
            );
            const offlineCtx = new OfflineAudioContext(
              source.numberOfChannels,
              totalSamples,
              source.sampleRate
            );
            const channelData: Float32Array[] = [];
            for (let c = 0; c < source.numberOfChannels; c++) {
              channelData.push(source.getChannelData(c));
            }
            const destBuffer = offlineCtx.createBuffer(
              source.numberOfChannels,
              totalSamples,
              source.sampleRate
            );
            for (let c = 0; c < source.numberOfChannels; c++) {
              const destData = destBuffer.getChannelData(c);
              for (let i = 0; i < totalSamples; i++) {
                const srcIdx = i % source.length;
                destData[i] = channelData[c][srcIdx];
              }
            }
            const bufferSource = offlineCtx.createBufferSource();
            bufferSource.buffer = destBuffer;
            bufferSource.connect(offlineCtx.destination);
            bufferSource.start();
            const rendered = await offlineCtx.startRendering();
            audioCtx.close();
            return audioBufferToWav(rendered);
          };

          // ==================================================================
          // COMPONENT
          // ==================================================================
          const CreateProduct: React.FC = () => {
            const [currentStep, setCurrentStep] = useState(1);
            // ----- Step 1: Product Details -----
            const [productName, setProductName] = useState("");
            const [price, setPrice] = useState("");
            const [sku, setSku] = useState("");
            const [description, setDescription] = useState("");
            const [errors, setErrors] = useState<{ [key: string]: string }>({});
            // ----- Step 1: Category & Subcategory -----
            const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
            const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
            const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
            // Category "Add new" UI state
            const [showAddCategory, setShowAddCategory] = useState(false);
            const [newCategoryName, setNewCategoryName] = useState("");
            const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
            // Subcategory "Add new" UI state
            const [showAddSubcategory, setShowAddSubcategory] = useState(false);
            const [newSubcategoryName, setNewSubcategoryName] = useState("");
            const [newSubcategoryError, setNewSubcategoryError] = useState<string | null>(null);
            // ----- Step 1: Product Variants -----
            const [variants, setVariants] = useState<ProductVariant[]>([
              createEmptyVariant(),
            ]);
            // ----- Step 2: Images -----
            const [images, setImages] = useState<File[]>([]);
            const [previews, setPreviews] = useState<string[]>([]);
            const [imageKitUrls, setImageKitUrls] = useState<string[]>([]);
            const [imageUploadingStates, setImageUploadingStates] = useState<boolean[]>([]);
            const [imageUploadErrors, setImageUploadErrors] = useState<string[]>([]);
            const fileInputRef = useRef<HTMLInputElement>(null);
            // Unsplash state
            const [activeImageTab, setActiveImageTab] = useState<"upload" | "unsplash">("upload");
            const [unsplashQuery, setUnsplashQuery] = useState("");
            const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
            const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
            const [unsplashError, setUnsplashError] = useState<string | null>(null);
            const [downloadingUnsplashIds, setDownloadingUnsplashIds] = useState<Set<string>>(new Set());
            // ----- Step 3: Generation & Configuration -----
            const [showConfig, setShowConfig] = useState(true);
            // Audio Configuration
            const [audioMode, setAudioMode] = useState<"text" | "upload" | "record">("text");
            const [audioScript, setAudioScript] = useState("");
            const [audioLanguage, setAudioLanguage] = useState<"en" | "te" | "hi">("en");
            const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
            const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
            const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
            const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null);
            // Audio Recording state
            const [isRecording, setIsRecording] = useState(false);
            const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
            const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
            const [recordingError, setRecordingError] = useState<string | null>(null);
            const mediaRecorderRef = useRef<MediaRecorder | null>(null);
            const audioChunksRef = useRef<Blob[]>([]);
            // Video Configuration
            const [videoLength, setVideoLength] = useState(30);
            const [isGenerating, setIsGenerating] = useState(false);
            const [generationProgress, setGenerationProgress] = useState(0);
            const [generationMessage, setGenerationMessage] = useState("");
            const [videoUrl, setVideoUrl] = useState<string | null>(null);
            const [videoKitUrl, setVideoKitUrl] = useState<string | null>(null);
            const [generationError, setGenerationError] = useState<string | null>(null);
            const [videoUploadProgress, setVideoUploadProgress] = useState(false);
            // Audio generation state
            const [audioGenerating, setAudioGenerating] = useState(false);
            const [audioError, setAudioError] = useState<string | null>(null);
            // ----- Step 5: Posting -----
            const [isPosting, setIsPosting] = useState(false);
            const [postSuccess, setPostSuccess] = useState(false);
            const [createError, setCreateError] = useState<string | null>(null);

            // Load voices for Speech Synthesis
            useEffect(() => {
              if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.getVoices();
                if (window.speechSynthesis.onvoiceschanged !== undefined) {
                  window.speechSynthesis.onvoiceschanged = () => {
                    window.speechSynthesis.getVoices();
                  };
                }
              }
            }, []);

            // Auto-generate script when entering step 3 or if product details change significantly
            useEffect(() => {
              if (currentStep === 3 && audioMode === "text" && !audioScript) {
                const script = `Introducing ${
                  productName || "our amazing product"
                }. ${
                  description || "This is a high-quality item designed for you."
                } Priced at just ${price || "affordable"} rupees. Don't miss out!`;
                setAudioScript(script);
              }
            }, [currentStep, productName, description, price, audioMode, audioScript]);

            // Cleanup TTS preview URL when settings change
            useEffect(() => {
              if (ttsPreviewUrl) {
                URL.revokeObjectURL(ttsPreviewUrl);
                setTtsPreviewUrl(null);
              }
            }, [audioScript, audioLanguage, voiceGender]);

            // Cleanup on unmount
            useEffect(() => {
              return () => {
                previews.forEach((url) => {
                  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                });
                if (videoUrl && videoUrl.startsWith("blob:"))
                  URL.revokeObjectURL(videoUrl);
                if (customAudioUrl && customAudioUrl.startsWith("blob:"))
                  URL.revokeObjectURL(customAudioUrl);
                if (ttsPreviewUrl && ttsPreviewUrl.startsWith("blob:"))
                  URL.revokeObjectURL(ttsPreviewUrl);
                if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:"))
                  URL.revokeObjectURL(recordedAudioUrl);
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                  mediaRecorderRef.current.stop();
                }
              };
            }, []);

            // --- Category / Subcategory Handlers ---
            const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

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
                const { subcategory, ...rest } = prev as any;
                return rest;
              });
            };

            const handleAddNewCategory = () => {
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
              const newCat: Category = {
                id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name,
                subcategories: [],
              };
              setCategories((prev) => [...prev, newCat]);
              setSelectedCategoryId(newCat.id);
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

            const handleCancelAddCategory = () => {
              setShowAddCategory(false);
              setNewCategoryName("");
              setNewCategoryError(null);
            };

            const handleAddNewSubcategory = () => {
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
              const newSub: Subcategory = {
                id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name,
              };
              setCategories((prev) =>
                prev.map((c) =>
                  c.id === selectedCategoryId
                    ? { ...c, subcategories: [...c.subcategories, newSub] }
                    : c
                )
              );
              setSelectedSubcategoryId(newSub.id);
              setShowAddSubcategory(false);
              setNewSubcategoryName("");
              setNewSubcategoryError(null);
            };

            const handleCancelAddSubcategory = () => {
              setShowAddSubcategory(false);
              setNewSubcategoryName("");
              setNewSubcategoryError(null);
            };

            // --- Variant Handlers ---
            const handleAddVariant = () => {
              setVariants((prev) => [...prev, createEmptyVariant()]);
            };

            const handleRemoveVariant = (id: string) => {
              setVariants((prev) => {
                if (prev.length === 1) {
                  return [createEmptyVariant()];
                }
                return prev.filter((v) => v.id !== id);
              });
            };

            const handleVariantChange = (
              id: string,
              field: keyof Omit<ProductVariant, "id">,
              value: string
            ) => {
              setVariants((prev) =>
                prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
              );
            };

            const handleFillAllVariantsPrice = () => {
              if (!price) return;
              setVariants((prev) =>
                prev.map((v) => ({ ...v, price: v.price || price }))
              );
            };

            // --- Audio Recording Functions ---
            const startRecording = async () => {
              setRecordingError(null);
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                  }
                };
                mediaRecorder.onstop = () => {
                  const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                  const url = URL.createObjectURL(blob);
                  setRecordedAudioBlob(blob);
                  setRecordedAudioUrl(url);
                  setIsRecording(false);
                  stream.getTracks().forEach((track) => track.stop());
                };
                mediaRecorder.onerror = () => {
                  setRecordingError("Recording error occurred.");
                  setIsRecording(false);
                  stream.getTracks().forEach((track) => track.stop());
                };
                mediaRecorder.start();
                setIsRecording(true);
              } catch (err: any) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                  setRecordingError("Microphone permission denied. Please allow access to record.");
                } else {
                  setRecordingError(err.message || "Could not start recording.");
                }
              }
            };

            const stopRecording = () => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
              }
            };

            const generateAudioFromText = useCallback(
              async (
                text: string,
                language: string,
                gender: "female" | "male",
                targetDurationSec: number
              ): Promise<Blob> => {
                setAudioGenerating(true);
                setAudioError(null);
                try {
                  const freq = gender === "male" ? 180 : 440;
                  const langFreqMod = language === "te" ? 1.1 : language === "hi" ? 1.2 : 1.0;
                  let blob = await generateFallbackAudio(
                    Math.min(targetDurationSec || 5, 30),
                    freq * langFreqMod
                  );
                  if (gender === "male") {
                    blob = await pitchShiftBlob(blob, 0.78);
                  }
                  if (targetDurationSec > 0) {
                    blob = await loopAudioToDuration(blob, targetDurationSec);
                  }
                  return blob;
                } catch (err: any) {
                  setAudioError(err.message || "TTS failed, using fallback audio");
                  const freq = gender === "male" ? 180 : 440;
                  return generateFallbackAudio(Math.min(targetDurationSec || 5, 30), freq);
                } finally {
                  setAudioGenerating(false);
                }
              },
              []
            );

            const handlePreviewTTS = () => {
              if (!audioScript.trim()) return;
              setAudioGenerating(true);
              setAudioError(null);
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(audioScript);
              const langMap: Record<string, string> = { en: "en-US", hi: "hi-IN", te: "te-IN" };
              utterance.lang = langMap[audioLanguage] || "en-US";
              const voices = window.speechSynthesis.getVoices();
              const genderKeyword = voiceGender === "female" ? "Female" : "Male";
              const matchingVoices = voices.filter(
                (v) => v.lang.includes(utterance.lang) && v.name.includes(genderKeyword)
              );
              if (matchingVoices.length > 0) {
                utterance.voice = matchingVoices[0];
              } else {
                const fallbackVoice = voices.find((v) => v.lang.includes(utterance.lang));
                if (fallbackVoice) {
                  utterance.voice = fallbackVoice;
                }
              }
              utterance.onend = () => {
                setAudioGenerating(false);
              };
              utterance.onerror = (e) => {
                console.error("Speech synthesis error", e);
                setAudioGenerating(false);
                setAudioError("Failed to generate speech. Please try again.");
              };
              window.speechSynthesis.speak(utterance);
            };

            // ================================================================
            // HANDLE POST TO INSTAGRAM
            // ================================================================
            const handlePostToInstagram = async () => {
              setIsPosting(true);
              setCreateError(null);
              try {
                const productData = {
                  name: productName,
                  price,
                  sku,
                  description,
                  categoryId: selectedCategoryId,
                  subcategoryId: selectedSubcategoryId,
                  variants: variants.map(v => ({
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    price: v.price,
                    costPrice: v.costPrice,
                    stockQuantity: v.stockQuantity,
                  })),
                  images: imageKitUrls,
                  videoUrl: videoKitUrl || videoUrl,
                  audioScript,
                  audioLanguage,
                  voiceGender,
                  videoLength,
                };
                const response = await axios.post(`${API_BASE}/products`, productData);
                if (response.data) {
                  setPostSuccess(true);
                }
              } catch (err: any) {
                setCreateError(err.response?.data?.message || err.message || "Failed to create product");
              } finally {
                setIsPosting(false);
              }
            };

            // ================================================================
            // RESET ALL STATE
            // ================================================================
            const resetAllState = () => {
              // Revoke object URLs
              previews.forEach((url) => {
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
              });
              if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
              if (customAudioUrl && customAudioUrl.startsWith("blob:")) URL.revokeObjectURL(customAudioUrl);
              if (ttsPreviewUrl && ttsPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(ttsPreviewUrl);
              if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) URL.revokeObjectURL(recordedAudioUrl);
              // Stop recording if active
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
              }
              // Reset all state
              setCurrentStep(1);
              setProductName("");
              setPrice("");
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
              setVariants([createEmptyVariant()]);
              setImages([]);
              setPreviews([]);
              setImageKitUrls([]);
              setImageUploadingStates([]);
              setImageUploadErrors([]);
              setActiveImageTab("upload");
              setUnsplashQuery("");
              setUnsplashResults([]);
              setIsSearchingUnsplash(false);
              setUnsplashError(null);
              setDownloadingUnsplashIds(new Set());
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
            };

            // ================================================================
            // NAVIGATION HANDLERS
            // ================================================================
            const handleBack = () => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              }
            };

            const handleNext = () => {
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
                if (images.length === 0) return;
              }
              if (currentStep < 5) {
                setCurrentStep(prev => prev + 1);
              }
            };

            // ================================================================
            // UNSPLASH & IMAGE HANDLERS
            // ================================================================
            const handleUnsplashSearch = async () => {
              if (!unsplashQuery.trim()) return;
              setIsSearchingUnsplash(true);
              setUnsplashError(null);
              try {
                const res = await axios.get("https://api.unsplash.com/search/photos", {
                  params: { query: unsplashQuery, per_page: 20 },
                  headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
                });
                setUnsplashResults(res.data.results || []);
              } catch (err: any) {
                setUnsplashError(err.message || "Failed to search Unsplash");
              } finally {
                setIsSearchingUnsplash(false);
              }
            };

            const handleDownloadUnsplash = async (photo: any) => {
              const photoId = photo.id;
              if (downloadingUnsplashIds.has(photoId)) return;
              setDownloadingUnsplashIds(prev => new Set(prev).add(photoId));
              try {
                const imageUrl = photo.urls?.regular || photo.urls?.small;
                const res = await axios.get(imageUrl, { responseType: "blob" });
                const file = new File([res.data], `unsplash-${photoId}.jpg`, { type: "image/jpeg" });
                const previewUrl = URL.createObjectURL(file);
                setImages(prev => [...prev, file]);
                setPreviews(prev => [...prev, previewUrl]);
                setImageUploadingStates(prev => [...prev, false]);
                setImageUploadErrors(prev => [...prev, ""]);
              } catch (err: any) {
                console.error("Failed to download Unsplash image", err);
              } finally {
                setDownloadingUnsplashIds(prev => {
                  const next = new Set(prev);
                  next.delete(photoId);
                  return next;
                });
              }
            };

            const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
              const files = e.target.files;
              if (!files) return;
              const newPreviews: string[] = [];
              const newFiles: File[] = [];
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith("image/")) {
                  newFiles.push(file);
                  newPreviews.push(URL.createObjectURL(file));
                }
              }
              setImages(prev => [...prev, ...newFiles]);
              setPreviews(prev => [...prev, ...newPreviews]);
              setImageUploadingStates(prev => [...prev, ...new Array(newFiles.length).fill(false)]);
              setImageUploadErrors(prev => [...prev, ...new Array(newFiles.length).fill("")]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            };

            const removeImage = (index: number) => {
              setImages(prev => prev.filter((_, i) => i !== index));
              setPreviews(prev => {
                const url = prev[index];
                if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
                return prev.filter((_, i) => i !== index);
              });
              setImageKitUrls(prev => prev.filter((_, i) => i !== index));
              setImageUploadingStates(prev => prev.filter((_, i) => i !== index));
              setImageUploadErrors(prev => prev.filter((_, i) => i !== index));
            };

            const handleUploadToImageKit = async (index: number) => {
              const file = images[index];
              if (!file) return;
              setImageUploadingStates(prev => {
                const updated = [...prev];
                updated[index] = true;
                return updated;
              });
              setImageUploadErrors(prev => {
                const updated = [...prev];
                updated[index] = "";
                return updated;
              });
              try {
                const uploadedUrl = await uploadToImageKit(file);
                if (uploadedUrl) {
                  setImageKitUrls(prev => {
                    const updated = [...prev];
                    updated[index] = uploadedUrl;
                    return updated;
                  });
                }
              } catch (err: any) {
                setImageUploadErrors(prev => {
                  const updated = [...prev];
                  updated[index] = err.message || "Upload failed";
                  return updated;
                });
              } finally {
                setImageUploadingStates(prev => {
                  const updated = [...prev];
                  updated[index] = false;
                  return updated;
                });
              }
            };

            // ================================================================
            // VIDEO GENERATION HANDLER - EMBED AUDIO IN VIDEO
            // ================================================================
            const handleGenerateVideo = async () => {
              setIsGenerating(true);
              setGenerationProgress(0);
              setGenerationMessage("Preparing assets...");
              setGenerationError(null);
              setVideoUrl(null);

              try {
                // Get audio blob from selected source
                let audioBlob: Blob | null = null;
                const targetDuration = videoLength;

                if (audioMode === "text") {
                  setGenerationMessage("Generating voiceover...");
                  setGenerationProgress(10);
                  audioBlob = await generateAudioFromText(
                    audioScript || "Welcome to our product video",
                    audioLanguage,
                    voiceGender,
                    targetDuration
                  );
                } else if (audioMode === "upload" && customAudioFile) {
                  setGenerationMessage("Loading uploaded audio...");
                  setGenerationProgress(10);
                  const fileReader = new FileReader();
                  const loadedBlob = await new Promise<Blob>((resolve, reject) => {
                    fileReader.onload = (e) => {
                      try {
                        const blob = new Blob([e.target?.result as ArrayBuffer], { type: customAudioFile.type });
                        resolve(blob);
                      } catch (err) {
                        reject(err);
                      }
                    };
                    fileReader.onerror = () => reject(new Error("Failed to read audio file"));
                    fileReader.readAsArrayBuffer(customAudioFile);
                  });
                  audioBlob = loadedBlob;
                } else if (audioMode === "record" && recordedAudioBlob) {
                  setGenerationMessage("Using recorded audio...");
                  setGenerationProgress(10);
                  audioBlob = recordedAudioBlob;
                }

                // If no audio blob, generate a fallback
                if (!audioBlob) {
                  throw new Error("No audio available for video generation");
                }

                // Ensure audio is looped to match target duration
                const audioCtx = new AudioContext();
                const audioBuffer = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
                const audioDuration = audioBuffer.duration;
                audioCtx.close();

                let finalAudioBlob = audioBlob;
                if (audioDuration < targetDuration) {
                  setGenerationMessage(`Extending audio from ${audioDuration.toFixed(1)}s to ${targetDuration}s...`);
                  finalAudioBlob = await loopAudioToDuration(audioBlob, targetDuration);
                }

                setGenerationMessage("Loading product images...");
                setGenerationProgress(20);

                // Load images
                const imageElements: HTMLImageElement[] = [];
                for (const previewUrl of previews) {
                  const img = new Image();
                  await new Promise((resolve, reject) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Failed to load image"));
                    img.src = previewUrl;
                  });
                  imageElements.push(img);
                }

                setGenerationMessage("Creating video with embedded audio...");
                setGenerationProgress(30);

                // Create video using canvas
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;

                // Set canvas size
                const width = 1280;
                const height = 720;
                canvas.width = width;
                canvas.height = height;

                // Create canvas stream (video only)
                const canvasStream = canvas.captureStream(30);

                // Create audio element for audio track
                const finalAudioUrl = URL.createObjectURL(finalAudioBlob);
                const audioElement = new Audio(finalAudioUrl);
                await new Promise((resolve) => {
                  audioElement.onloadedmetadata = () => resolve(null);
                  audioElement.load();
                });

                // Create audio context and destination to capture audio
                const audioContext = new AudioContext();
                const source = audioContext.createMediaElementSource(audioElement);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);
                source.connect(audioContext.destination);

                // Combine video and audio streams
                const combinedStream = new MediaStream();
                // Add video tracks from canvas
                canvasStream.getVideoTracks().forEach(track => {
                  combinedStream.addTrack(track);
                });
                // Add audio tracks from audio context
                destination.stream.getAudioTracks().forEach(track => {
                  combinedStream.addTrack(track);
                });

                // Create media recorder with combined stream
                const mediaRecorder = new MediaRecorder(combinedStream, {
                  mimeType: "video/webm;codecs=vp9,opus",
                  videoBitsPerSecond: 5000000,
                  audioBitsPerSecond: 128000,
                });

                const chunks: Blob[] = [];
                mediaRecorder.ondataavailable = (e) => {
                  if (e.data.size > 0) {
                    chunks.push(e.data);
                  }
                };

                // Start recording
                mediaRecorder.start(1000); // Collect data every second

                // Start audio
                audioElement.play().catch(e => console.warn("Audio play warning:", e));

                // Render frames
                const fps = 30;
                const actualDuration = audioElement.duration || targetDuration;
                const totalFrames = Math.ceil(actualDuration * fps);
                const frameInterval = 1000 / fps;
                let currentFrame = 0;
                let imageIndex = 0;

                setGenerationProgress(40);

                // Animation loop
                await new Promise<void>((resolve) => {
                  const renderFrame = () => {
                    if (currentFrame >= totalFrames) {
                      resolve();
                      return;
                    }

                    const progress = currentFrame / totalFrames;

                    // Clear canvas
                    ctx.clearRect(0, 0, width, height);

                    // Dynamic background gradient
                    const hue1 = (180 + progress * 120) % 360;
                    const hue2 = (hue1 + 60) % 360;
                    const gradient = ctx.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, `hsl(${hue1}, 70%, 15%)`);
                    gradient.addColorStop(0.5, `hsl(${hue2}, 70%, 20%)`);
                    gradient.addColorStop(1, `hsl(${(hue1 + 30) % 360}, 70%, 10%)`);
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);

                    // Display images
                    if (imageElements.length > 0) {
                      const img = imageElements[imageIndex % imageElements.length];
                      const aspectRatio = img.width / img.height;
                      let drawWidth, drawHeight, x, y;

                      const padding = 60;
                      const maxWidth = width - padding * 2;
                      const maxHeight = height - padding * 2 - 200;

                      if (aspectRatio > 1) {
                        drawWidth = Math.min(maxWidth, img.width);
                        drawHeight = drawWidth / aspectRatio;
                        if (drawHeight > maxHeight) {
                          drawHeight = maxHeight;
                          drawWidth = drawHeight * aspectRatio;
                        }
                      } else {
                        drawHeight = Math.min(maxHeight, img.height);
                        drawWidth = drawHeight * aspectRatio;
                        if (drawWidth > maxWidth) {
                          drawWidth = maxWidth;
                          drawHeight = drawWidth / aspectRatio;
                        }
                      }

                      x = (width - drawWidth) / 2;
                      y = padding;

                      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                      ctx.shadowBlur = 20;
                      ctx.shadowOffsetX = 5;
                      ctx.shadowOffsetY = 5;

                      const cornerRadius = 20;
                      ctx.beginPath();
                      ctx.moveTo(x + cornerRadius, y);
                      ctx.lineTo(x + drawWidth - cornerRadius, y);
                      ctx.quadraticCurveTo(x + drawWidth, y, x + drawWidth, y + cornerRadius);
                      ctx.lineTo(x + drawWidth, y + drawHeight - cornerRadius);
                      ctx.quadraticCurveTo(x + drawWidth, y + drawHeight, x + drawWidth - cornerRadius, y + drawHeight);
                      ctx.lineTo(x + cornerRadius, y + drawHeight);
                      ctx.quadraticCurveTo(x, y + drawHeight, x, y + drawHeight - cornerRadius);
                      ctx.lineTo(x, y + cornerRadius);
                      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
                      ctx.closePath();
                      ctx.clip();

                      const zoom = 1 + Math.sin(progress * Math.PI * 4) * 0.03;
                      const scaledWidth = drawWidth * zoom;
                      const scaledHeight = drawHeight * zoom;
                      const offsetX = (drawWidth - scaledWidth) / 2;
                      const offsetY = (drawHeight - scaledHeight) / 2;

                      ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
                      ctx.shadowBlur = 0;
                    }

                    // Overlay gradient for text
                    const overlayGradient = ctx.createLinearGradient(0, height - 180, 0, height);
                    overlayGradient.addColorStop(0, "rgba(0,0,0,0)");
                    overlayGradient.addColorStop(1, "rgba(0,0,0,0.7)");
                    ctx.fillStyle = overlayGradient;
                    ctx.fillRect(0, height - 180, width, 180);

                    // Product name
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";

                    const nameScale = 1 + Math.sin(progress * Math.PI * 2) * 0.02;
                    ctx.save();
                    ctx.translate(width / 2, height - 80);
                    ctx.scale(nameScale, nameScale);
                    ctx.font = "bold 48px Arial";
                    ctx.fillStyle = "#ffffff";
                    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
                    ctx.shadowBlur = 15;
                    ctx.fillText(productName || "Product", 0, 0);
                    ctx.restore();

                    // Price
                    const priceScale = 1 + Math.sin(progress * Math.PI * 2 + 0.5) * 0.02;
                    ctx.save();
                    ctx.translate(width / 2, height - 30);
                    ctx.scale(priceScale, priceScale);
                    ctx.font = "bold 32px Arial";
                    ctx.fillStyle = "#fbbf24";
                    ctx.shadowColor = "rgba(251, 191, 36, 0.3)";
                    ctx.shadowBlur = 20;
                    ctx.fillText(`₹${price || "0"}`, 0, 0);
                    ctx.restore();

                    // Decorative line
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + Math.sin(progress * Math.PI * 4) * 0.2})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(width / 2 - 100, height - 65);
                    ctx.lineTo(width / 2 + 100, height - 65);
                    ctx.stroke();

                    // Update progress
                    const progressPercent = 40 + (currentFrame / totalFrames) * 55;
                    setGenerationProgress(Math.min(progressPercent, 95));

                    // Switch image every 3 seconds
                    if (currentFrame > 0 && currentFrame % (fps * 3) === 0) {
                      imageIndex = (imageIndex + 1) % imageElements.length;
                    }

                    currentFrame++;
                    setTimeout(renderFrame, frameInterval);
                  };

                  renderFrame();
                });

                // Stop recording
                setGenerationProgress(97);
                setGenerationMessage("Finalizing video...");

                // Stop audio
                audioElement.pause();
                audioElement.currentTime = 0;

                // Close audio context
                await audioContext.close();

                mediaRecorder.stop();

                // Wait for the final blob
                const finalBlob = await new Promise<Blob>((resolve) => {
                  mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: "video/webm" });
                    resolve(blob);
                  };
                  // Fallback timeout
                  setTimeout(() => {
                    if (chunks.length > 0) {
                      resolve(new Blob(chunks, { type: "video/webm" }));
                    } else {
                      resolve(new Blob([], { type: "video/webm" }));
                    }
                  }, 5000);
                });

                // Create URL for the video
                const finalVideoUrl = URL.createObjectURL(finalBlob);
                setVideoUrl(finalVideoUrl);
                setVideoKitUrl(finalVideoUrl);

                setGenerationProgress(100);
                setGenerationMessage("Video generated successfully with audio!");

                // Clean up audio URL
                URL.revokeObjectURL(finalAudioUrl);

              } catch (err: any) {
                console.error("Video generation error:", err);
                setGenerationError(err.message || "Failed to generate video");
                setGenerationProgress(0);
                setGenerationMessage("");
              } finally {
                setIsGenerating(false);
              }
            };

            // ================================================================
            // RENDER: Progress
            // ================================================================
            const renderProgress = () => (
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
                          {currentStep > step.id ? (
                            <Check size={16} />
                          ) : (
                            step.id
                          )}
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
            );

            // ================================================================
            // RENDER: Category Dropdown
            // ================================================================
            const renderCategoryDropdown = () => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                {showAddCategory ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        className={`input-field ${newCategoryError ? "border-red-400 focus:ring-red-400" : ""}`}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddNewCategory(); }}
                      />
                      {newCategoryError && (
                        <p className="text-xs text-red-500 mt-1">{newCategoryError}</p>
                      )}
                    </div>
                    <button
                      onClick={handleAddNewCategory}
                      className="btn-primary text-sm px-3 py-2"
                    >
                      Add
                    </button>
                    <button
                      onClick={handleCancelAddCategory}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className={`input-field appearance-none bg-white pr-8 ${errors.category ? "border-red-400 focus:ring-red-400" : ""}`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="__add_new__">+ Add New Category</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {errors.category && (
                      <p className="text-xs text-red-500 mt-1">{errors.category}</p>
                    )}
                  </div>
                )}
              </div>
            );

            // ================================================================
            // RENDER: Subcategory Dropdown
            // ================================================================
            const renderSubcategoryDropdown = () => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory *</label>
                {selectedCategoryId ? (
                  showAddSubcategory ? (
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                          placeholder="Enter new subcategory name"
                          className={`input-field ${newSubcategoryError ? "border-red-400 focus:ring-red-400" : ""}`}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddNewSubcategory(); }}
                        />
                        {newSubcategoryError && (
                          <p className="text-xs text-red-500 mt-1">{newSubcategoryError}</p>
                        )}
                      </div>
                      <button
                        onClick={handleAddNewSubcategory}
                        className="btn-primary text-sm px-3 py-2"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleCancelAddSubcategory}
                        className="text-gray-400 hover:text-gray-600 p-2"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedSubcategoryId}
                        onChange={(e) => handleSubcategoryChange(e.target.value)}
                        className={`input-field appearance-none bg-white pr-8 ${errors.subcategory ? "border-red-400 focus:ring-red-400" : ""}`}
                      >
                        <option value="">Select a subcategory</option>
                        {selectedCategory?.subcategories.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                        <option value="__add_new__">+ Add New Subcategory</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      {errors.subcategory && (
                        <p className="text-xs text-red-500 mt-1">{errors.subcategory}</p>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-400 py-2">Please select a category first</p>
                )}
              </div>
            );

            // ================================================================
            // RENDER: Variant Card
            // ================================================================
            const renderVariantCard = (variant: ProductVariant, index: number) => (
              <div key={variant.id} className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-700">Variant {index + 1}</span>
                  <button
                    onClick={() => handleRemoveVariant(variant.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Remove variant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">SKU</label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(variant.id, "sku", e.target.value)}
                      placeholder="e.g. SAR-001"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Size</label>
                    <input
                      type="text"
                      value={variant.size}
                      onChange={(e) => handleVariantChange(variant.id, "size", e.target.value)}
                      placeholder="e.g. M, L, XL"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Color</label>
                    <input
                      type="text"
                      value={variant.color}
                      onChange={(e) => handleVariantChange(variant.id, "color", e.target.value)}
                      placeholder="e.g. Red, Blue"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Price (₹)</label>
                    <input
                      type="number"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(variant.id, "price", e.target.value)}
                      placeholder="0.00"
                      className="input-field text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Cost Price (₹)</label>
                    <input
                      type="number"
                      value={variant.costPrice}
                      onChange={(e) => handleVariantChange(variant.id, "costPrice", e.target.value)}
                      placeholder="0.00"
                      className="input-field text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Stock</label>
                    <input
                      type="number"
                      value={variant.stockQuantity}
                      onChange={(e) => handleVariantChange(variant.id, "stockQuantity", e.target.value)}
                      placeholder="0"
                      className="input-field text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            );

            // ================================================================
            // RENDER: Product Details (Step 1)
            // ================================================================
            const renderProductDetails = () => (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Package size={22} className="text-purple-600" />
                  Product Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Enter product name"
                      className={`input-field ${errors.productName ? "border-red-400 focus:ring-red-400" : ""}`}
                    />
                    {errors.productName && (
                      <p className="text-xs text-red-500 mt-1">{errors.productName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className={`input-field ${errors.price ? "border-red-400 focus:ring-red-400" : ""}`}
                      min="0"
                      step="0.01"
                    />
                    {errors.price && (
                      <p className="text-xs text-red-500 mt-1">{errors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Stock keeping unit"
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
                {/* Category & Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderCategoryDropdown()}
                  {renderSubcategoryDropdown()}
                </div>
                {/* Variants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-700">Variants</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleFillAllVariantsPrice}
                        className="text-xs text-purple-600 hover:text-purple-800 border border-purple-300 px-2 py-1 rounded"
                        title="Fill empty variant prices with the base price"
                      >
                        Fill Prices
                      </button>
                      <button
                        onClick={handleAddVariant}
                        className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                      >
                        <Plus size={14} /> Add Variant
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {variants.map((variant, idx) => renderVariantCard(variant, idx))}
                  </div>
                </div>
              </div>
            );

            // ================================================================
            // RENDER: Upload Images (Step 2)
            // ================================================================
            const renderUploadImages = () => (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <ImageIcon size={22} className="text-purple-600" />
                  Upload Images
                </h2>
                {/* Tab Switcher */}
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
                {/* Upload Tab */}
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
                {/* Unsplash Tab */}
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
                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Selected Images ({previews.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {previews.map((url, index) => (
                        <div
                          key={url}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[4/3] bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                          {!imageKitUrls[index] && (
                            <button
                              onClick={() => handleUploadToImageKit(index)}
                              disabled={imageUploadingStates[index]}
                              className="absolute bottom-1.5 left-1.2 right-1.5 bg-purple-600 text-white text-xs py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1"
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
                          {imageKitUrls[index] && (
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );

            // ================================================================
            // RENDER: Generate Video (Step 3)
            // ================================================================
            const renderGenerateVideo = () => (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Settings2 size={22} className="text-purple-600" />
                  Video Configuration
                </h2>

                {/* Audio Configuration */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-4 border border-gray-200">
                  <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <Volume2 size={18} className="text-purple-500" />
                    Audio
                  </h3>

                  {/* Audio Mode Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { mode: "text" as const, label: "Text to Speech", icon: FileText },
                      { mode: "upload" as const, label: "Upload Audio", icon: FileAudio },
                      { mode: "record" as const, label: "Record", icon: Mic },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => setAudioMode(mode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                          audioMode === mode
                            ? "bg-purple-100 border-purple-300 text-purple-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Text Mode */}
                  {audioMode === "text" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Script</label>
                        <textarea
                          value={audioScript}
                          onChange={(e) => setAudioScript(e.target.value)}
                          placeholder="Enter the script for voiceover..."
                          rows={3}
                          className="input-field resize-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                          <select
                            value={audioLanguage}
                            onChange={(e) => setAudioLanguage(e.target.value as "en" | "te" | "hi")}
                            className="input-field text-sm"
                          >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="te">Telugu</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Voice</label>
                          <select
                            value={voiceGender}
                            onChange={(e) => setVoiceGender(e.target.value as "female" | "male")}
                            className="input-field text-sm"
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handlePreviewTTS}
                        disabled={audioGenerating || !audioScript.trim()}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        {audioGenerating ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Volume2 size={16} />
                        )}
                        Preview Audio
                      </button>
                      {audioError && (
                        <p className="text-xs text-red-500">{audioError}</p>
                      )}
                    </div>
                  )}

                  {/* Upload Mode */}
                  {audioMode === "upload" && (
                    <div className="space-y-3">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById("audio-upload")?.click()}
                      >
                        <FileAudio size={32} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload audio file</p>
                        <p className="text-xs text-gray-400 mt-1">MP3, WAV, M4A supported</p>
                        <input
                          id="audio-upload"
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCustomAudioFile(file);
                              if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
                              setCustomAudioUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </div>
                      {customAudioUrl && (
                        <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3">
                          <FileAudio size={20} className="text-purple-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {customAudioFile?.name || "Audio file"}
                            </p>
                            <audio controls className="w-full mt-1 h-8">
                              <source src={customAudioUrl} />
                            </audio>
                          </div>
                          <button
                            onClick={() => {
                              setCustomAudioFile(null);
                              if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
                              setCustomAudioUrl(null);
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Record Mode */}
                  {audioMode === "record" && (
                    <div className="space-y-3 text-center">
                      {!recordedAudioUrl ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                          <Mic size={40} className="mx-auto text-gray-400 mb-2" />
                          {isRecording ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-sm text-red-600 font-medium">Recording...</span>
                              </div>
                              <button
                                onClick={stopRecording}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                              >
                                Stop Recording
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">Click below to start recording</p>
                              <button
                                onClick={startRecording}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2 mx-auto"
                              >
                                <Mic size={16} />
                                Start Recording
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Recorded Audio</p>
                          <audio controls className="w-full">
                            <source src={recordedAudioUrl} />
                          </audio>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
                                setRecordedAudioBlob(null);
                                setRecordedAudioUrl(null);
                              }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                            <button
                              onClick={startRecording}
                              className="text-xs text-purple-600 hover:underline"
                            >
                              Re-record
                            </button>
                          </div>
                        </div>
                      )}
                      {recordingError && (
                        <p className="text-xs text-red-500">{recordingError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Video Length */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 space-y-3">
                  <h3 className="text-base font-semibold text-slate-700">Video Length</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={15}
                      max={60}
                      step={5}
                      value={videoLength}
                      onChange={(e) => setVideoLength(Number(e.target.value))}
                      className="flex-1 accent-purple-600"
                    />
                    <span className="text-sm font-medium text-purple-700 min-w-[4rem] text-right">
                      {videoLength}s
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-400">
                    <span>15s</span>
                    <span>60s</span>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-2">
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || images.length === 0}
                    className="btn-primary flex items-center justify-center gap-2 w-full py-3 text-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={22} />
                        Generating... {Math.round(generationProgress)}%
                      </>
                    ) : (
                      <>
                        <Play size={22} />
                        Generate Video
                      </>
                    )}
                  </button>
                  {isGenerating && (
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">{generationMessage}</p>
                    </div>
                  )}
                  {generationError && (
                    <p className="text-sm text-red-500 mt-2 text-center">{generationError}</p>
                  )}
                </div>
              </div>
            );

            // ================================================================
            // RENDER: Preview Video (Step 4)
            // ================================================================
            const renderPreviewVideo = () => (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Play size={22} className="text-purple-600" />
                  Preview Video
                </h2>
                {videoUrl ? (
                  <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                      <video
                        controls
                        className="w-full h-full"
                        src={videoUrl}
                        poster={previews[0] || undefined}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => {
                          setShowConfig(true);
                          setCurrentStep(3);
                        }}
                        className="btn-secondary flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50"
                      >
                        <RotateCcw size={18} />
                        Regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Play size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No video generated yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Go back to Step 3 and generate a video.</p>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="mt-4 btn-primary flex items-center gap-2 px-4 py-2 mx-auto"
                    >
                      <Settings2 size={18} />
                      Go to Configuration
                    </button>
                  </div>
                )}
              </div>
            );

            // ================================================================
            // RENDER: Post to Instagram (Step 5)
            // ================================================================
            const renderPostToInstagram = () => (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Send size={22} className="text-purple-600" />
                  Post to Instagram
                </h2>
                {!postSuccess ? (
                  <>
                    {createError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {createError}
                      </div>
                    )}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
                      <div className="flex items-center gap-3">
                        <Send size={32} />
                        <div>
                          <p className="font-bold text-lg">Instagram Post</p>
                          <p className="text-sm opacity-90">@yourbusiness</p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-white/20 pt-4">
                        <p className="text-sm">
                          {productName} – ₹{price ? Number(price).toFixed(2) : "0.00"}
                        </p>
                        {description && (
                          <p className="text-sm mt-1 opacity-80">{description}</p>
                        )}
                        <p className="text-xs mt-2 opacity-70">#AI #Video #Product #Instagram</p>
                      </div>
                    </div>
                    <button
                      onClick={handlePostToInstagram}
                      disabled={isPosting}
                      className="btn-primary flex items-center justify-center gap-2 w-full py-3 text-lg"
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Saving product...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Post to Instagram
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Posted Successfully!</h3>
                    <p className="text-slate-500">
                      Your product has been saved and posted to Instagram.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
                      <Link to="/dashboard" className="btn-primary px-6 py-2 text-center">
                        Go to Dashboard
                      </Link>
                      <Link
                        to="/all-videos"
                        className="btn-secondary px-6 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 text-center"
                      >
                        View All Videos
                      </Link>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={resetAllState}
                        className="text-purple-600 hover:underline text-sm"
                      >
                        Create Another Product
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );

            // ================================================================
            // MAIN RENDER
            // ================================================================
            return (
              <div className="max-w-4xl mx-auto space-y-8 px-3 sm:px-0">
                <div className="flex items-center gap-4 mb-6 sm:mb-8">
                  <Link to="/dashboard" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <ArrowLeft size={20} />
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Create New Product</h1>
                </div>
                <div className="card-glass p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                  {renderProgress()}
                  <div className="space-y-6">
                    {currentStep === 1 && renderProductDetails()}
                    {currentStep === 2 && renderUploadImages()}
                    {currentStep === 3 && renderGenerateVideo()}
                    {currentStep === 4 && renderPreviewVideo()}
                    {currentStep === 5 && renderPostToInstagram()}
                  </div>
                  {currentStep < 5 && (
                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
                      <button
                        onClick={handleBack}
                        disabled={currentStep === 1 || (currentStep === 3 && isGenerating)}
                        className="btn-secondary flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ArrowLeft size={20} /> Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={
                          (currentStep === 2 && images.length === 0) ||
                          (currentStep === 3 && !videoUrl && !showConfig) ||
                          (currentStep === 3 && isGenerating) ||
                          (currentStep === 3 && generationError !== null)
                        }
                        className="btn-primary flex items-center justify-center gap-2 px-6 sm:px-8 py-2 sm:py-3"
                      >
                        {currentStep === 4 ? "Continue to Post" : "Next"} <ArrowRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          };

          export default CreateProduct;