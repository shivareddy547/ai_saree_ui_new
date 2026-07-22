import React from "react";
import {
  Settings2,
  Volume2,
  FileText,
  FileAudio,
  Mic,
  Loader2,
  Play,
  X,
} from "lucide-react";

interface VideoConfigurationProps {
  audioMode: "text" | "upload" | "record";
  setAudioMode: (value: "text" | "upload" | "record") => void;
  audioScript: string;
  setAudioScript: (value: string) => void;
  audioLanguage: "en" | "te" | "hi";
  setAudioLanguage: (value: "en" | "te" | "hi") => void;
  voiceGender: "female" | "male";
  setVoiceGender: (value: "female" | "male") => void;
  customAudioFile: File | null;
  setCustomAudioFile: (value: File | null) => void;
  customAudioUrl: string | null;
  setCustomAudioUrl: (value: string | null) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  recordedAudioBlob: Blob | null;
  setRecordedAudioBlob: (value: Blob | null) => void;
  recordedAudioUrl: string | null;
  setRecordedAudioUrl: (value: string | null) => void;
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
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <Settings2 size={22} className="text-purple-600" />
        Video Configuration
      </h2>
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-4 border border-gray-200">
        <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Volume2 size={18} className="text-purple-500" />
          Audio
        </h3>
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
      <div className="pt-2">
        <button
          onClick={handleGenerateVideo}
          disabled={isGenerating || imagesLength === 0}
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
};

export default VideoConfiguration;
