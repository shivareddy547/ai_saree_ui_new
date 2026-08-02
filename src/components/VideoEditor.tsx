import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Scissors,
  Filter,
  Type,
  Music,
  Crop,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Save,
  Upload,
  X,
  Clock,
  Sliders,
  Palette,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Plus,
  Minus,
  Move,
  Trash2,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
interface VideoEditorProps {
  videoUrl: string | null;
  onSave: (editedVideoBlob: Blob) => void;
  onClose: () => void;
}
interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  alignment: "left" | "center" | "right";
  startTime: number;
  endTime: number;
  opacity: number;
  rotation: number;
}
interface FilterEffect {
  id: string;
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sepia: number;
  grayscale: number;
  hueRotate: number;
}
const DEFAULT_FILTERS: FilterEffect[] = [
  { id: "none", name: "None", brightness: 1, contrast: 1, saturation: 1, blur: 0, sepia: 0, grayscale: 0, hueRotate: 0 },
  { id: "vintage", name: "Vintage", brightness: 1.1, contrast: 0.9, saturation: 0.8, blur: 0, sepia: 0.4, grayscale: 0, hueRotate: 0 },
  { id: "vivid", name: "Vivid", brightness: 1.1, contrast: 1.2, saturation: 1.3, blur: 0, sepia: 0, grayscale: 0, hueRotate: 0 },
  { id: "mono", name: "Monochrome", brightness: 1, contrast: 1.2, saturation: 0, blur: 0, sepia: 0, grayscale: 1, hueRotate: 0 },
  { id: "warm", name: "Warm", brightness: 1.1, contrast: 0.9, saturation: 1.1, blur: 0, sepia: 0.2, grayscale: 0, hueRotate: 30 },
  { id: "cool", name: "Cool", brightness: 0.9, contrast: 1.1, saturation: 1.2, blur: 0, sepia: 0, grayscale: 0, hueRotate: 200 },
  { id: "soft", name: "Soft", brightness: 1.05, contrast: 0.8, saturation: 0.9, blur: 2, sepia: 0, grayscale: 0, hueRotate: 0 },
  { id: "dramatic", name: "Dramatic", brightness: 0.9, contrast: 1.5, saturation: 1.2, blur: 0, sepia: 0, grayscale: 0, hueRotate: 0 },
];
const VideoEditor: React.FC<VideoEditorProps> = ({
  videoUrl,
  onSave,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  // Editing states
  const [selectedFilter, setSelectedFilter] = useState<FilterEffect>(DEFAULT_FILTERS[0]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingText, setEditingText] = useState<TextOverlay | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragType, setDragType] = useState<"start" | "end" | "both" | null>(null);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cropStartX, setCropStartX] = useState(0);
  const [cropStartY, setCropStartY] = useState(0);
  const [cropWidth, setCropWidth] = useState(100);
  const [cropHeight, setCropHeight] = useState(100);
  const [isCropping, setIsCropping] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showTexts, setShowTexts] = useState(true);
  const [showTrim, setShowTrim] = useState(true);
  // Load video duration
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        setDuration(videoRef.current?.duration || 0);
        setTrimEnd(videoRef.current?.duration || 0);
      };
    }
  }, [videoUrl]);
  // Update current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };
    video.addEventListener("timeupdate", updateTime);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
    };
  }, []);
  // Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };
  // Volume control
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
    }
  };
  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };
  // Add text overlay
  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: "Double click to edit",
      x: 50,
      y: 50,
      fontSize: 48,
      color: "#FFFFFF",
      fontFamily: "Arial",
      fontWeight: "bold",
      fontStyle: "normal",
      textDecoration: "none",
      alignment: "center",
      startTime: 0,
      endTime: duration || 30,
      opacity: 1,
      rotation: 0,
    };
    setTextOverlays([...textOverlays, newText]);
    setSelectedTextId(newText.id);
    setEditingText(newText);
    setShowTextEditor(true);
  };
  // Delete text overlay
  const deleteTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) {
      setSelectedTextId(null);
      setShowTextEditor(false);
    }
  };
  // Update text overlay
  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(textOverlays.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
    if (editingText && editingText.id === id) {
      setEditingText({ ...editingText, ...updates });
    }
  };
  // Handle text selection
  const handleTextClick = (id: string) => {
    const text = textOverlays.find(t => t.id === id);
    if (text) {
      setSelectedTextId(id);
      setEditingText(text);
      setShowTextEditor(true);
    }
  };
  // Toggle visibility of text
  const toggleTextVisibility = (id: string) => {
    const text = textOverlays.find(t => t.id === id);
    if (text) {
      updateTextOverlay(id, { opacity: text.opacity > 0 ? 0 : 1 });
    }
  };
  // Render frame with all effects
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    // Apply crop
    const cropX = (cropStartX / 100) * width;
    const cropY = (cropStartY / 100) * height;
    const cropW = (cropWidth / 100) * width;
    const cropH = (cropHeight / 100) * height;
    // Draw video frame
    ctx.save();
    // Apply transformations
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.scale(zoom, zoom);
    // Apply crop
    if (isCropping) {
      ctx.beginPath();
      ctx.rect(-cropW / 2, -cropH / 2, cropW, cropH);
      ctx.clip();
    }
    // Draw video centered
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = width / height;
    let drawWidth, drawHeight, offsetX, offsetY;
    if (videoAspect > canvasAspect) {
      drawWidth = width;
      drawHeight = width / videoAspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * videoAspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    }
    ctx.drawImage(video, -width / 2, -height / 2, width, height);
    ctx.restore();
    // Apply filters
    const filterString = `
      brightness(${selectedFilter.brightness})
      contrast(${selectedFilter.contrast})
      saturate(${selectedFilter.saturation})
      blur(${selectedFilter.blur}px)
      sepia(${selectedFilter.sepia})
      grayscale(${selectedFilter.grayscale})
      hue-rotate(${selectedFilter.hueRotate}deg)
    `;
    ctx.filter = filterString;
    // Redraw with filters applied
    ctx.drawImage(canvas, 0, 0, width, height);
    // Reset filter
    ctx.filter = "none";
    // Draw text overlays
    textOverlays.forEach(text => {
      if (text.opacity === 0) return;
      const time = video.currentTime;
      if (time < text.startTime || time > text.endTime) return;
      ctx.save();
      ctx.globalAlpha = text.opacity;
      ctx.translate((text.x / 100) * width, (text.y / 100) * height);
      ctx.rotate((text.rotation * Math.PI) / 180);
      ctx.font = `${text.fontStyle} ${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`;
      ctx.textAlign = text.alignment;
      // Text shadow for better visibility
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, 0, 0);
      // Text outline for better visibility
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeText(text.text, 0, 0);
      ctx.restore();
    });
  }, [
    videoRef.current,
    canvasRef.current,
    rotation,
    flipHorizontal,
    flipVertical,
    zoom,
    selectedFilter,
    textOverlays,
    isCropping,
    cropStartX,
    cropStartY,
    cropWidth,
    cropHeight,
  ]);
  // Render frame on time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      renderFrame();
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeked", handleTimeUpdate);
    // Initial render
    setTimeout(renderFrame, 100);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeked", handleTimeUpdate);
    };
  }, [renderFrame]);
  // Export video
  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      // Get trim values
      const startTime = trimStart;
      const endTime = trimEnd || video.duration;
      const exportDuration = endTime - startTime;
      // Create stream from canvas
      const stream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      // Create audio element for audio capture
      const audioElement = video.cloneNode(true) as HTMLVideoElement;
      audioElement.muted = false;
      audioElement.volume = video.volume;
      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      // Combine video and audio streams
      const combinedStream = new MediaStream();
      stream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/webm;codecs=vp9,opus',
      ];
      let selectedMimeType = mimeTypes[0];
      let mediaRecorder: MediaRecorder | null = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000,
            audioBitsPerSecond: 128000,
          });
          break;
        }
      }
      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(combinedStream, {
          videoBitsPerSecond: 5000000,
          audioBitsPerSecond: 128000,
        });
      }
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      // Start recording
      mediaRecorder.start(1000);
      // Seek to start time
      video.currentTime = startTime;
      audioElement.currentTime = startTime;
      // Start playback
      await audioContext.resume();
      video.play();
      audioElement.play();
      // Render frames for the duration
      const fps = 30;
      const totalFrames = Math.ceil(exportDuration * fps);
      const frameInterval = 1000 / fps;
      for (let frame = 0; frame < totalFrames; frame++) {
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, frameInterval));
        // Render current frame
        renderFrame();
        // Update progress
        setExportProgress((frame / totalFrames) * 100);
        // Update video time if needed
        const currentVideoTime = video.currentTime;
        if (currentVideoTime >= endTime) break;
      }
      // Stop recording
      video.pause();
      audioElement.pause();
      await audioContext.close();
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      // Wait for final chunks
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Create final blob
      const finalBlob = new Blob(chunks, { type: selectedMimeType });
      setExportProgress(100);
      // Save
      onSave(finalBlob);
      setIsExporting(false);
    } catch (error) {
      console.error("Export error:", error);
      setIsExporting(false);
      alert("Failed to export video. Please try again.");
    }
  };
  // Trim handle
  const handleTrimStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTrimStart(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };
  const handleTrimEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTrimEnd(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };
  // Color picker for text
  const TextEditor: React.FC = () => {
    if (!editingText) return null;
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-700">Edit Text</h4>
          <button
            onClick={() => {
              setShowTextEditor(false);
              setEditingText(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Text</label>
          <input
            type="text"
            value={editingText.text}
            onChange={(e) => {
              const newText = e.target.value;
              setEditingText({ ...editingText, text: newText });
              updateTextOverlay(editingText.id, { text: newText });
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Font Size</label>
            <input
              type="range"
              min="12"
              max="120"
              value={editingText.fontSize}
              onChange={(e) => {
                const size = parseInt(e.target.value);
                setEditingText({ ...editingText, fontSize: size });
                updateTextOverlay(editingText.id, { fontSize: size });
              }}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{editingText.fontSize}px</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <input
              type="color"
              value={editingText.color}
              onChange={(e) => {
                const color = e.target.value;
                setEditingText({ ...editingText, color });
                updateTextOverlay(editingText.id, { color });
              }}
              className="w-full h-10 rounded border"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={editingText.opacity}
              onChange={(e) => {
                const opacity = parseFloat(e.target.value);
                setEditingText({ ...editingText, opacity });
                updateTextOverlay(editingText.id, { opacity });
              }}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{Math.round(editingText.opacity * 100)}%</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rotation</label>
            <input
              type="range"
              min="-180"
              max="180"
              value={editingText.rotation}
              onChange={(e) => {
                const rotation = parseInt(e.target.value);
                setEditingText({ ...editingText, rotation });
                updateTextOverlay(editingText.id, { rotation });
              }}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{editingText.rotation}°</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Font</label>
            <select
              value={editingText.fontFamily}
              onChange={(e) => {
                const font = e.target.value;
                setEditingText({ ...editingText, fontFamily: font });
                updateTextOverlay(editingText.id, { fontFamily: font });
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
              <option value="Impact">Impact</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alignment</label>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingText({ ...editingText, alignment: "left" });
                  updateTextOverlay(editingText.id, { alignment: "left" });
                }}
                className={`p-2 rounded ${editingText.alignment === "left" ? "bg-purple-100" : "bg-gray-100"}`}
              >
                <AlignLeft size={18} />
              </button>
              <button
                onClick={() => {
                  setEditingText({ ...editingText, alignment: "center" });
                  updateTextOverlay(editingText.id, { alignment: "center" });
                }}
                className={`p-2 rounded ${editingText.alignment === "center" ? "bg-purple-100" : "bg-gray-100"}`}
              >
                <AlignCenter size={18} />
              </button>
              <button
                onClick={() => {
                  setEditingText({ ...editingText, alignment: "right" });
                  updateTextOverlay(editingText.id, { alignment: "right" });
                }}
                className={`p-2 rounded ${editingText.alignment === "right" ? "bg-purple-100" : "bg-gray-100"}`}
              >
                <AlignRight size={18} />
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Timing</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Start (s)</label>
              <input
                type="number"
                min="0"
                max={duration}
                value={Math.round(editingText.startTime)}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  setEditingText({ ...editingText, startTime: time });
                  updateTextOverlay(editingText.id, { startTime: time });
                }}
                className="w-full border rounded-lg px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">End (s)</label>
              <input
                type="number"
                min="0"
                max={duration}
                value={Math.round(editingText.endTime)}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  setEditingText({ ...editingText, endTime: time });
                  updateTextOverlay(editingText.id, { endTime: time });
                }}
                className="w-full border rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  if (!videoUrl) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-gray-500">No video to edit</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Close
        </button>
      </div>
    );
  }
  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Layers size={22} className="text-purple-600" />
          Video Editor
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
        {/* Video Preview */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full max-h-[500px] object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              width={1280}
              height={720}
            />
            {/* Play/Pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute bottom-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {/* Time display */}
            <div className="absolute bottom-4 left-16 text-white text-sm bg-black/50 px-2 py-1 rounded">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
            </div>
            {/* Volume control */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
              <button onClick={toggleMute} className="text-white">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-white"
              />
            </div>
          </div>
          {/* Timeline */}
          <div className="bg-white rounded-lg p-3">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-purple-600"
            />
            {/* Trim controls */}
            {showTrim && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Trim:</label>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={trimStart}
                    onChange={handleTrimStart}
                    className="flex-1 accent-red-500"
                  />
                  <span className="text-xs text-gray-500">
                    {Math.floor(trimStart / 60)}:{String(Math.floor(trimStart % 60)).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={trimEnd}
                    onChange={handleTrimEnd}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-xs text-gray-500">
                    {Math.floor(trimEnd / 60)}:{String(Math.floor(trimEnd % 60)).padStart(2, "0")}
                  </span>
                </div>
              </div>
            )}
            {/* Progress bar showing trim range */}
            <div className="mt-1 h-1 bg-gray-200 rounded-full relative">
              <div
                className="absolute top-0 left-0 h-full bg-purple-300 rounded-full"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  width: `${((trimEnd - trimStart) / duration) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
        {/* Tools Panel */}
        <div className="space-y-4">
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-800 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting {Math.round(exportProgress)}%
              </>
            ) : (
              <>
                <Save size={18} />
                Export Video
              </>
            )}
          </button>
          {/* Filter Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700 flex items-center gap-2">
                <Filter size={18} />
                Filters
              </span>
              <span className="text-gray-400">{showFilters ? "▼" : "▶"}</span>
            </button>
            {showFilters && (
              <div className="p-3 border-t space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  {DEFAULT_FILTERS.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        selectedFilter.id === filter.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-500">Brightness</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={selectedFilter.brightness}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSelectedFilter({ ...selectedFilter, brightness: val });
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Contrast</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={selectedFilter.contrast}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSelectedFilter({ ...selectedFilter, contrast: val });
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Saturation</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={selectedFilter.saturation}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSelectedFilter({ ...selectedFilter, saturation: val });
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
          {/* Text Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setShowTexts(!showTexts)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700 flex items-center gap-2">
                <Type size={18} />
                Text Overlays
              </span>
              <span className="text-gray-400">{showTexts ? "▼" : "▶"}</span>
            </button>
            {showTexts && (
              <div className="p-3 border-t space-y-2">
                <button
                  onClick={addTextOverlay}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                >
                  + Add Text
                </button>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {textOverlays.map(text => (
                    <div
                      key={text.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedTextId === text.id ? "bg-purple-50 border-purple-200" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleTextClick(text.id)}
                    >
                      <span className="text-sm truncate flex-1">{text.text || "Text"}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTextVisibility(text.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          {text.opacity > 0 ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTextOverlay(text.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {showTextEditor && <TextEditor />}
              </div>
            )}
          </div>
          {/* Transform Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFlipHorizontal(!flipHorizontal)}
                className={`p-2 rounded ${flipHorizontal ? "bg-purple-100 text-purple-600" : "bg-gray-100"}`}
              >
                <FlipHorizontal size={18} />
              </button>
              <button
                onClick={() => setFlipVertical(!flipVertical)}
                className={`p-2 rounded ${flipVertical ? "bg-purple-100 text-purple-600" : "bg-gray-100"}`}
              >
                <FlipVertical size={18} />
              </button>
              <button
                onClick={() => setRotation((rotation + 90) % 360)}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                <RotateCw size={18} />
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500">Zoom</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCropping(!isCropping)}
                className={`flex-1 py-1 px-3 rounded text-sm ${
                  isCropping ? "bg-purple-600 text-white" : "bg-gray-100"
                }`}
              >
                <Crop size={16} className="inline mr-1" />
                Crop {isCropping ? "On" : "Off"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default VideoEditor;
