import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Upload,
  FileText,
  Loader2,
  Play,
  Pause,
  Volume2,
  Cloud,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Music,
  User,
  Calendar,
} from "lucide-react";
interface UserVoice {
  id: number;
  name: string;
  sampleAudioUrl: string | null;
  createdAt: string;
}
interface VideoConfigurationProps {
  audioMode: "text" | "upload" | "record" | "clone";
  setAudioMode: (mode: "text" | "upload" | "record" | "clone") => void;
  audioScript: string;
  setAudioScript: (value: string) => void;
  audioLanguage: "en" | "te" | "hi";
  setAudioLanguage: (value: "en" | "te" | "hi") => void;
  voiceGender: "female" | "male";
  setVoiceGender: (value: "female" | "male") => void;
  customAudioFile: File | null;
  setCustomAudioFile: (file: File | null) => void;
  customAudioUrl: string | null;
  setCustomAudioUrl: (url: string | null) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  recordedAudioBlob: Blob | null;
  setRecordedAudioBlob: (blob: Blob | null) => void;
  recordedAudioUrl: string | null;
  setRecordedAudioUrl: (url: string | null) => void;
  recordingError: string | null;
  videoLength: number;
  setVideoLength: (value: number) => void;
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  generationError: string | null;
  imagesLength: number;
  audioGenerating: boolean;
  audioError: string | null;
  handlePreviewTTS: () => void;
  handleGenerateVideo: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  existingVideoUrl?: string | null;
  cloudinaryUploadStatus?: "idle" | "uploading" | "success" | "error";
  cloudinaryUploadProgress?: number;
  cloudinaryUploadMessage?: string;
  cloudinaryPublicId?: string | null;
  // Clone voice props
  voices: UserVoice[];
  setVoices: (voices: UserVoice[]) => void;
  selectedVoiceId: number | null;
  setSelectedVoiceId: (id: number | null) => void;
  clonedAudioBlob: Blob | null;
  setClonedAudioBlob: (blob: Blob | null) => void;
  clonedAudioUrl: string | null;
  setClonedAudioUrl: (url: string | null) => void;
  isGeneratingClonedAudio: boolean;
  setIsGeneratingClonedAudio: (value: boolean) => void;
  clonedAudioError: string | null;
  setClonedAudioError: (value: string | null) => void;
  createVoice: (name: string, sampleFile: File) => Promise<void>;
  fetchVoices: () => Promise<void>;
  generateClonedAudio: (voiceId: number, language: string, text: string) => Promise<Blob>;
  deleteVoice: (voiceId: number) => Promise<void>;
}
const VideoConfiguration: React.FC<VideoConfigurationProps> = ({
  audioMode,
  setAudioMode,
  audioScript,
  setAudioScript,
  audioLanguage,
  setAudioLanguage,
  voiceGender,
  setVoiceGender,
  customAudioFile,
  setCustomAudioFile,
  customAudioUrl,
  setCustomAudioUrl,
  isRecording,
  setIsRecording,
  recordedAudioBlob,
  setRecordedAudioBlob,
  recordedAudioUrl,
  setRecordedAudioUrl,
  recordingError,
  videoLength,
  setVideoLength,
  isGenerating,
  generationProgress,
  generationMessage,
  generationError,
  imagesLength,
  audioGenerating,
  audioError,
  handlePreviewTTS,
  handleGenerateVideo,
  startRecording,
  stopRecording,
  existingVideoUrl,
  cloudinaryUploadStatus = "idle",
  cloudinaryUploadProgress = 0,
  cloudinaryUploadMessage = "",
  cloudinaryPublicId = null,
  voices,
  setVoices,
  selectedVoiceId,
  setSelectedVoiceId,
  clonedAudioBlob,
  setClonedAudioBlob,
  clonedAudioUrl,
  setClonedAudioUrl,
  isGeneratingClonedAudio,
  setIsGeneratingClonedAudio,
  clonedAudioError,
  setClonedAudioError,
  createVoice,
  fetchVoices,
  generateClonedAudio,
  deleteVoice,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoadError, setVideoLoadError] = useState(false);
  // State for voice creation modal
  const [showCreateVoiceModal, setShowCreateVoiceModal] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceSampleFile, setNewVoiceSampleFile] = useState<File | null>(null);
  const [newVoiceSampleUrl, setNewVoiceSampleUrl] = useState<string | null>(null);
  const [isCreatingVoice, setIsCreatingVoice] = useState(false);
  const [createVoiceError, setCreateVoiceError] = useState<string | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  // State for voice sample input mode (upload or record)
  const [sampleInputMode, setSampleInputMode] = useState<"upload" | "record">("upload");
  // Recording state for sample
  const [isSampleRecording, setIsSampleRecording] = useState(false);
  const [sampleRecordingError, setSampleRecordingError] = useState<string | null>(null);
  const sampleMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sampleAudioChunksRef = useRef<Blob[]>([]);
  // Fetch voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);
  // Reset video error when URL changes
  useEffect(() => {
    setVideoLoadError(false);
  }, [existingVideoUrl]);
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomAudioFile(file);
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const removeCustomAudio = () => {
    setCustomAudioFile(null);
    if (customAudioUrl) {
      URL.revokeObjectURL(customAudioUrl);
      setCustomAudioUrl(null);
    }
  };
  const removeRecordedAudio = () => {
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };
  // Voice creation handlers
  const handleVoiceSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewVoiceSampleFile(file);
      const url = URL.createObjectURL(file);
      setNewVoiceSampleUrl(url);
    }
    if (voiceFileInputRef.current) {
      voiceFileInputRef.current.value = "";
    }
  };
  // Start recording for sample
  const startSampleRecording = async () => {
    setSampleRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      sampleMediaRecorderRef.current = mediaRecorder;
      sampleAudioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sampleAudioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(sampleAudioChunksRef.current, { type: "audio/webm" });
        // Convert to File and set as sample file
        const file = new File([blob], "recorded_sample.webm", { type: "audio/webm" });
        setNewVoiceSampleFile(file);
        const url = URL.createObjectURL(blob);
        setNewVoiceSampleUrl(url);
        setIsSampleRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.onerror = () => {
        setSampleRecordingError("Recording error occurred.");
        setIsSampleRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsSampleRecording(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setSampleRecordingError("Microphone permission denied. Please allow access to record.");
      } else {
        setSampleRecordingError(err.message || "Could not start recording.");
      }
    }
  };
  const stopSampleRecording = () => {
    if (sampleMediaRecorderRef.current && sampleMediaRecorderRef.current.state === "recording") {
      sampleMediaRecorderRef.current.stop();
    }
  };
  // Remove sample file (from upload or recording)
  const removeSampleFile = () => {
    setNewVoiceSampleFile(null);
    if (newVoiceSampleUrl) {
      URL.revokeObjectURL(newVoiceSampleUrl);
      setNewVoiceSampleUrl(null);
    }
    // Reset recording state
    setIsSampleRecording(false);
    if (sampleMediaRecorderRef.current) {
      sampleMediaRecorderRef.current = null;
    }
    sampleAudioChunksRef.current = [];
  };
  const handleCreateVoiceSubmit = async () => {
    if (!newVoiceName.trim()) {
      setCreateVoiceError("Voice name is required");
      return;
    }
    if (!newVoiceSampleFile) {
      setCreateVoiceError("Please provide a voice sample (upload or record)");
      return;
    }
    setCreateVoiceError(null);
    setIsCreatingVoice(true);
    try {
      await createVoice(newVoiceName.trim(), newVoiceSampleFile);
      // Reset form
      setNewVoiceName("");
      setNewVoiceSampleFile(null);
      if (newVoiceSampleUrl) {
        URL.revokeObjectURL(newVoiceSampleUrl);
        setNewVoiceSampleUrl(null);
      }
      setShowCreateVoiceModal(false);
      // Refresh list
      await fetchVoices();
    } catch (err: any) {
      setCreateVoiceError(err.message || "Failed to create voice");
    } finally {
      setIsCreatingVoice(false);
    }
  };
  const handleDeleteVoice = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this voice?")) {
      try {
        await deleteVoice(id);
        if (selectedVoiceId === id) {
          setSelectedVoiceId(null);
        }
        await fetchVoices();
      } catch (err: any) {
        alert(err.message || "Failed to delete voice");
      }
    }
  };
  const handleSelectVoice = (id: number) => {
    setSelectedVoiceId(selectedVoiceId === id ? null : id);
    if (clonedAudioUrl) {
      URL.revokeObjectURL(clonedAudioUrl);
      setClonedAudioUrl(null);
      setClonedAudioBlob(null);
    }
    setClonedAudioError(null);
  };
  const handleGenerateClonedAudio = async () => {
    if (!selectedVoiceId) {
      setClonedAudioError("Please select a voice first");
      return;
    }
    if (!audioScript.trim()) {
      setClonedAudioError("Please enter text to speak");
      return;
    }
    setIsGeneratingClonedAudio(true);
    setClonedAudioError(null);
    try {
      const blob = await generateClonedAudio(selectedVoiceId, audioLanguage, audioScript);
      const url = URL.createObjectURL(blob);
      if (clonedAudioUrl) {
        URL.revokeObjectURL(clonedAudioUrl);
      }
      setClonedAudioBlob(blob);
      setClonedAudioUrl(url);
    } catch (err: any) {
      setClonedAudioError(err.message || "Failed to generate audio");
    } finally {
      setIsGeneratingClonedAudio(false);
    }
  };
  // Render Cloudinary upload status
  const renderCloudinaryStatus = () => {
    if (cloudinaryUploadStatus === "idle") return null;
    const statusConfig = {
      uploading: {
        icon: <Loader2 size={16} className="animate-spin" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      },
      success: {
        icon: <CheckCircle size={16} className="text-green-600" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      },
      error: {
        icon: <AlertCircle size={16} className="text-red-600" />,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      },
    };
    const config = statusConfig[cloudinaryUploadStatus];
    if (!config) return null;
    return (
      <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} space-y-2`}>
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={`text-sm font-medium ${config.color}`}>
            {cloudinaryUploadStatus === "uploading" && "Uploading to Cloudinary..."}
            {cloudinaryUploadStatus === "success" && "Video uploaded to Cloudinary successfully!"}
            {cloudinaryUploadStatus === "error" && "Failed to upload to Cloudinary"}
          </span>
        </div>
        {cloudinaryUploadStatus === "uploading" && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${cloudinaryUploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{cloudinaryUploadMessage}</p>
          </div>
        )}
        {cloudinaryUploadStatus === "success" && cloudinaryPublicId && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100">
            <span className="font-medium">Public ID:</span> {cloudinaryPublicId}
          </div>
        )}
        {cloudinaryUploadStatus === "error" && (
          <p className="text-xs text-red-600">{cloudinaryUploadMessage || "An error occurred during upload"}</p>
        )}
      </div>
    );
  };
  // Render existing video with better error handling
  const renderExistingVideo = () => {
    if (!existingVideoUrl) return null;
    const isCloudinaryUrl = existingVideoUrl.includes('cloudinary.com') || existingVideoUrl.includes('res.cloudinary.com');
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
          <Play size={18} />
          Existing Video
          {isCloudinaryUrl && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Cloudinary
            </span>
          )}
        </h3>
        {videoLoadError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <AlertCircle size={24} className="mx-auto text-yellow-600 mb-2" />
            <p className="text-sm text-yellow-700 mb-2">
              Unable to load video from Cloudinary
            </p>
            {cloudinaryPublicId && (
              <p className="text-xs text-gray-600 mb-3">
                Public ID: {cloudinaryPublicId}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {isCloudinaryUrl && (
                <a
                  href={existingVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink size={14} />
                  Open in Browser
                </a>
              )}
              <button
                onClick={() => {
                  setVideoLoadError(false);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={existingVideoUrl}
              controls
              className="w-full max-h-64 object-contain"
              controlsList="nodownload"
              onError={() => {
                console.error('Video failed to load:', existingVideoUrl);
                setVideoLoadError(true);
              }}
              onLoadedData={() => {
                setVideoLoadError(false);
              }}
            >
              Your browser does not support the video tag.
            </video>
            {isCloudinaryUrl && cloudinaryPublicId && (
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded">
                Cloudinary
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-blue-600">
          This video will be replaced if you generate a new one.
        </p>
      </div>
    );
  };
  // Render My Voices list
  const renderMyVoices = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">My Voices</h3>
          <button
            onClick={() => setShowCreateVoiceModal(true)}
            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            <Plus size={16} />
            Create New Voice
          </button>
        </div>
        {voices.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Music size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No saved voices yet</p>
            <button
              onClick={() => setShowCreateVoiceModal(true)}
              className="mt-2 text-sm text-purple-600 hover:underline"
            >
              Create your first voice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`border rounded-lg p-4 transition-all ${
                  selectedVoiceId === voice.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-purple-600" />
                      <span className="font-medium text-gray-800">{voice.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Calendar size={12} />
                      <span>Created: {new Date(voice.createdAt).toLocaleDateString()}</span>
                    </div>
                    {voice.sampleAudioUrl && (
                      <audio controls className="w-full mt-2 h-8">
                        <source src={voice.sampleAudioUrl} />
                      </audio>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <button
                      onClick={() => handleSelectVoice(voice.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        selectedVoiceId === voice.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {selectedVoiceId === voice.id ? "Selected" : "Select"}
                    </button>
                    <button
                      onClick={() => handleDeleteVoice(voice.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  // Render Create Voice Modal with upload/record options
  const renderCreateVoiceModal = () => {
    if (!showCreateVoiceModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Create New Voice</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voice Name</label>
              <input
                type="text"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                placeholder="e.g., My Voice, Shop Voice"
                className="w-full input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voice Sample (10-30 seconds)</label>
              {/* Tabs for upload/record */}
              <div className="flex border-b border-gray-200 mb-3">
                <button
                  onClick={() => setSampleInputMode("upload")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    sampleInputMode === "upload"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Upload size={14} className="inline mr-1" />
                  Upload
                </button>
                <button
                  onClick={() => setSampleInputMode("record")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    sampleInputMode === "record"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Mic size={14} className="inline mr-1" />
                  Record
                </button>
              </div>
              {newVoiceSampleUrl ? (
                // Show sample audio preview with remove option
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music size={18} className="text-purple-600" />
                      <span className="text-sm">{newVoiceSampleFile?.name}</span>
                    </div>
                    <button
                      onClick={removeSampleFile}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <audio controls className="w-full mt-2">
                    <source src={newVoiceSampleUrl} />
                  </audio>
                </div>
              ) : (
                // No sample yet - show upload or record UI
                <>
                  {sampleInputMode === "upload" && (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer"
                      onClick={() => voiceFileInputRef.current?.click()}
                    >
                      <Upload size={24} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-600">Click to upload audio file</p>
                      <p className="text-xs text-gray-400">MP3, WAV, M4A (max 10MB)</p>
                      <input
                        ref={voiceFileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceSampleUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                  {sampleInputMode === "record" && (
                    <div className="space-y-3">
                      {sampleRecordingError && (
                        <p className="text-sm text-red-500">{sampleRecordingError}</p>
                      )}
                      <button
                        onClick={isSampleRecording ? stopSampleRecording : startSampleRecording}
                        className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                          isSampleRecording
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                      >
                        {isSampleRecording ? (
                          <>
                            <Pause size={18} />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic size={18} />
                            Start Recording
                          </>
                        )}
                      </button>
                      {isSampleRecording && (
                        <p className="text-sm text-red-500 animate-pulse text-center">
                          Recording in progress...
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {createVoiceError && (
              <p className="text-sm text-red-500">{createVoiceError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreateVoiceModal(false);
                  setNewVoiceName("");
                  setNewVoiceSampleFile(null);
                  if (newVoiceSampleUrl) {
                    URL.revokeObjectURL(newVoiceSampleUrl);
                    setNewVoiceSampleUrl(null);
                  }
                  setCreateVoiceError(null);
                  // Reset recording states
                  setIsSampleRecording(false);
                  if (sampleMediaRecorderRef.current) {
                    sampleMediaRecorderRef.current = null;
                  }
                  sampleAudioChunksRef.current = [];
                  setSampleRecordingError(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVoiceSubmit}
                disabled={isCreatingVoice}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingVoice ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Voice"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <FileText size={22} className="text-purple-600" />
        Video Configuration
      </h2>
      {/* Cloudinary Upload Status */}
      {renderCloudinaryStatus()}
      {/* Existing Video Display */}
      {renderExistingVideo()}
      {/* Audio Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Audio Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setAudioMode("text")}
            className={`p-4 rounded-lg border-2 transition-all ${
              audioMode === "text"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FileText className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">Text to Speech</span>
          </button>
          <button
            onClick={() => setAudioMode("upload")}
            className={`p-4 rounded-lg border-2 transition-all ${
              audioMode === "upload"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Upload className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">Upload Audio</span>
          </button>
          <button
            onClick={() => setAudioMode("record")}
            className={`p-4 rounded-lg border-2 transition-all ${
              audioMode === "record"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Mic className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">Record Voice</span>
          </button>
          <button
            onClick={() => setAudioMode("clone")}
            className={`p-4 rounded-lg border-2 transition-all ${
              audioMode === "clone"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Music className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">Clone Voice</span>
          </button>
        </div>
      </div>
      {/* Audio Script for Text Mode */}
      {audioMode === "text" && (
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audio Script
            </label>
            <button
              onClick={handlePreviewTTS}
              disabled={audioGenerating || !audioScript.trim()}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              {audioGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Volume2 size={14} />
              )}
              Preview TTS
            </button>
          </div>
          <textarea
            value={audioScript}
            onChange={(e) => setAudioScript(e.target.value)}
            placeholder="Enter the script for the AI voice to narrate..."
            rows={4}
            className="input-field resize-none"
          />
          {audioError && (
            <p className="text-xs text-red-500 mt-1">{audioError}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {audioScript.length} characters
          </p>
        </div>
      )}
      {/* Upload Audio for Upload Mode */}
      {audioMode === "upload" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Audio File
          </label>
          {customAudioUrl ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 size={20} className="text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {customAudioFile?.name || "Audio file"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {customAudioFile?.size
                        ? `${(customAudioFile.size / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeCustomAudio}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  Remove
                </button>
              </div>
              <audio controls className="w-full mt-2">
                <source src={customAudioUrl} />
                Your browser does not support the audio tag.
              </audio>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload audio file</p>
              <p className="text-xs text-gray-400">MP3, WAV, M4A supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
      {/* Record Voice for Record Mode */}
      {audioMode === "record" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Record Voice
          </label>
          {recordedAudioUrl ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic size={20} className="text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Recorded Audio
                    </p>
                    <p className="text-xs text-gray-400">
                      {recordedAudioBlob?.size
                        ? `${(recordedAudioBlob.size / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeRecordedAudio}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  Remove
                </button>
              </div>
              <audio controls className="w-full mt-2">
                <source src={recordedAudioUrl} />
                Your browser does not support the audio tag.
              </audio>
            </div>
          ) : (
            <div className="space-y-3">
              {recordingError && (
                <p className="text-sm text-red-500">{recordingError}</p>
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isRecording ? (
                  <>
                    <Pause size={20} />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    Start Recording
                  </>
                )}
              </button>
              {isRecording && (
                <p className="text-sm text-red-500 animate-pulse text-center">
                  Recording in progress...
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {/* Clone Voice Mode */}
      {audioMode === "clone" && (
        <div className="space-y-4">
          {/* My Voices */}
          {renderMyVoices()}
          {/* Selected Voice Actions */}
          {selectedVoiceId && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Text to Speak
                </label>
                <button
                  onClick={handleGenerateClonedAudio}
                  disabled={isGeneratingClonedAudio || !audioScript.trim()}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {isGeneratingClonedAudio ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Generate Audio
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={audioScript}
                onChange={(e) => setAudioScript(e.target.value)}
                placeholder="Enter text to speak using the selected cloned voice..."
                rows={3}
                className="input-field resize-none"
              />
              {clonedAudioError && (
                <p className="text-xs text-red-500 mt-1">{clonedAudioError}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {audioScript.length} characters
              </p>
              {/* Audio Preview */}
              {clonedAudioUrl && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Generated Audio</span>
                    <button
                      onClick={() => {
                        if (clonedAudioUrl) {
                          URL.revokeObjectURL(clonedAudioUrl);
                        }
                        setClonedAudioUrl(null);
                        setClonedAudioBlob(null);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <audio controls className="w-full mt-1">
                    <source src={clonedAudioUrl} />
                  </audio>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Language and Voice Settings (only for text and clone modes) */}
      {(audioMode === "text" || audioMode === "clone") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={audioLanguage}
              onChange={(e) =>
                setAudioLanguage(e.target.value as "en" | "te" | "hi")
              }
              className="input-field"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
            </select>
          </div>
          {audioMode === "text" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice Gender
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setVoiceGender("female")}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    voiceGender === "female"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-sm font-medium">Female</span>
                </button>
                <button
                  onClick={() => setVoiceGender("male")}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    voiceGender === "male"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-sm font-medium">Male</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Video Length */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Video Duration: {videoLength} seconds
        </label>
        <input
          type="range"
          min="5"
          max="60"
          value={videoLength}
          onChange={(e) => setVideoLength(parseInt(e.target.value))}
          className="w-full accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>5s</span>
          <span>30s</span>
          <span>60s</span>
        </div>
      </div>
      {/* Generate Video Button */}
      <div className="pt-4 border-t">
        {generationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-3">
            {generationError}
          </div>
        )}
        {isGenerating && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <Loader2 size={16} className="animate-spin" />
              <span>{generationMessage || "Generating video..."}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">
              {Math.round(generationProgress)}%
            </p>
          </div>
        )}
        <button
          onClick={handleGenerateVideo}
          disabled={
            isGenerating ||
            imagesLength === 0 ||
            (audioMode === "text" && !audioScript.trim()) ||
            (audioMode === "upload" && !customAudioFile) ||
            (audioMode === "record" && !recordedAudioBlob) ||
            (audioMode === "clone" && !clonedAudioBlob) ||
            cloudinaryUploadStatus === "uploading"
          }
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating...
            </>
          ) : cloudinaryUploadStatus === "uploading" ? (
            <>
              <Cloud size={20} className="animate-pulse" />
              Uploading to Cloudinary...
            </>
          ) : (
            <>
              <Play size={20} />
              Generate Video
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {imagesLength === 0
            ? "Please upload at least one image first"
            : audioMode === "text" && !audioScript.trim()
            ? "Please enter audio script"
            : audioMode === "upload" && !customAudioFile
            ? "Please upload an audio file"
            : audioMode === "record" && !recordedAudioBlob
            ? "Please record audio first"
            : audioMode === "clone" && !clonedAudioBlob
            ? "Please generate audio using a cloned voice"
            : cloudinaryUploadStatus === "uploading"
            ? "Uploading video to Cloudinary..."
            : ""}
        </p>
      </div>
      {/* Create Voice Modal */}
      {renderCreateVoiceModal()}
    </div>
  );
};
export default VideoConfiguration;
