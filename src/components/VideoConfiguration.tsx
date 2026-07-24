import React from "react";
import {
  Mic,
  Upload,
  FileText,
  Loader2,
  Play,
  Pause,
  Volume2,
} from "lucide-react";

interface VideoConfigurationProps {
  audioMode: "text" | "upload" | "record";
  setAudioMode: (mode: "text" | "upload" | "record") => void;
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
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <FileText size={22} className="text-purple-600" />
        Video Configuration
      </h2>

      {/* Existing Video Display */}
      {existingVideoUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Play size={18} />
            Existing Video
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              src={existingVideoUrl}
              controls
              className="w-full max-h-64 object-contain"
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="text-xs text-blue-600">
            This video will be replaced if you generate a new one.
          </p>
        </div>
      )}

      {/* Audio Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Audio Mode
        </label>
        <div className="grid grid-cols-3 gap-3">
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

      {/* Language and Voice Settings */}
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
      </div>

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
            (audioMode === "record" && !recordedAudioBlob)
          }
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating...
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
            : ""}
        </p>
      </div>
    </div>
  );
};

export default VideoConfiguration;
