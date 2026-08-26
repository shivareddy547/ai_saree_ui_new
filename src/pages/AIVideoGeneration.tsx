import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Mic,
  Volume2,
  Trash2,
  Play,
  Share2,
  Loader2,
  X,
  CheckCircle2,
  Film,
  Link2,
  CloudUpload,
} from 'lucide-react';
interface Provider {
  id: string;
  provider_type: string;
  name: string;
  provider_key?: string | null;
  is_enabled: boolean;
  credentials: Record<string, string>;
}
interface SocialConnection {
  id: string;
  providerId: string;
  providerType: string;
  accountId?: string;
  username?: string;
  connected: boolean;
  error?: string;
  tokenExpiresAt?: string;
}
interface GeneratedVideo {
  id: string;
  title?: string;
  videoUrl?: string | null;
  thumbnailUrl?: string;
  imageUrls: string[];
  audioMode: string;
  status: string;
  errorMessage?: string | null;
  durationSeconds?: number;
  createdAt?: string;
  metadata?: {
    engine?: string;
    cloudinaryPublicId?: string | null;
    frameCount?: number;
    cloudinaryError?: string;
    localPath?: string;
  };
}
const MEDIA_TYPES: Record<string, { label: string; value: string }[]> = {
  youtube: [
    { label: 'Video', value: 'VIDEO' },
    { label: 'Shorts', value: 'REELS' },
  ],
  instagram: [
    { label: 'Reel', value: 'REELS' },
    { label: 'Story', value: 'STORIES' },
    { label: 'Post', value: 'FEED' },
  ],
  facebook: [
    { label: 'Video', value: 'VIDEO' },
    { label: 'Reel', value: 'REELS' },
  ],
  tiktok: [{ label: 'Video', value: 'VIDEO' }],
  default: [
    { label: 'Video', value: 'VIDEO' },
    { label: 'Reel', value: 'REELS' },
    { label: 'Story', value: 'STORIES' },
    { label: 'Post', value: 'FEED' },
  ],
};
const isPlayableVideoUrl = (url?: string | null) => {
  if (!url) return false;
  if (url.includes('res.cloudinary.com') && /\/video\//.test(url)) return true;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return true;
  if (url.includes('/uploads/videos/')) return true;
  return false;
};
const AIVideoGeneration: React.FC = () => {
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true,
  });
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [title, setTitle] = useState('');
  const [audioMode, setAudioMode] = useState<'none' | 'upload' | 'ai'>('none');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioScript, setAudioScript] = useState('');
  const [audioLanguage, setAudioLanguage] = useState('en');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female' | 'neutral'>('female');
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultVideo, setResultVideo] = useState<GeneratedVideo | null>(null);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reuploading, setReuploading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<{ [id: string]: SocialConnection }>({});
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [mediaType, setMediaType] = useState('REELS');
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/ai-videos');
      setHistory(res.data.data || []);
    } catch (_) {
    } finally {
      setLoadingHistory(false);
    }
  }, []);
  const fetchProvidersAndConnections = useCallback(async () => {
    try {
      const [provRes, connRes] = await Promise.all([
        api.get('/providers'),
        api.get('/social/status'),
      ]);
      const all = provRes.data.data || [];
      const social = all.filter((p: any) => p.provider_type === 'social' && p.is_enabled);
      setProviders(social);
      const conns = connRes.data.data || [];
      const map: { [id: string]: SocialConnection } = {};
      conns.forEach((c: any) => {
        map[c.providerId] = {
          id: c.id,
          providerId: c.providerId,
          providerType: c.providerType,
          accountId: c.accountId,
          username: c.username,
          connected: c.connected,
          error: c.error,
          tokenExpiresAt: c.tokenExpiresAt,
        };
      });
      setConnections(map);
    } catch (_) {}
  }, []);
  useEffect(() => {
    fetchHistory();
    fetchProvidersAndConnections();
  }, [fetchHistory, fetchProvidersAndConnections]);
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');
      if (errorParam) {
        setError(`Authorization failed: ${errorParam}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      if (code && state) {
        try {
          const response = await api.post('/social/connect', { code, state });
          if (response.data.success) {
            setSuccess('Social account connected successfully!');
            await fetchProvidersAndConnections();
          }
        } catch (err: any) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to connect account'
          );
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    handleOAuthCallback();
  }, []);
  const openAuthPopup = async (providerId: string) => {
    setError('');
    setIsConnecting(providerId);
    try {
      const response = await api.get(`/social/oauth-url/${providerId}`);
      if (response.data.success) {
        const url = response.data.data.url;
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          url,
          'social-auth',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
        );
        if (!popup) {
          setError('Please allow popups for this website');
          setIsConnecting(null);
          return;
        }
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            setIsConnecting(null);
            fetchProvidersAndConnections();
          }
        }, 500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to initiate connection'
      );
      setIsConnecting(null);
    }
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 15 - images.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages((prev) => [...prev, ...newItems].slice(0, 15));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };
  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
    setAudioMode('upload');
  };
  const clearAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioFile(null);
    setAudioPreview(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };
  const handleGenerate = async () => {
    setError('');
    setSuccess('');
    setResultVideo(null);
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }
    if (audioMode === 'ai' && !audioScript.trim()) {
      setError('Please enter a script for AI voice-over');
      return;
    }
    if (audioMode === 'upload' && !audioFile) {
      setError('Please upload an audio file or switch audio mode');
      return;
    }
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim() || 'AI Generated Video');
      formData.append('audioMode', audioMode);
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('audioLanguage', audioLanguage);
      formData.append('voiceGender', voiceGender);
      if (audioScript.trim()) formData.append('audioScript', audioScript.trim());
      images.forEach((img) => formData.append('images', img.file));
      if (audioFile) formData.append('audio', audioFile);
      const res = await api.post('/ai-videos/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      const video = res.data.data as GeneratedVideo;
      setResultVideo(video);
      if (video.status === 'failed') {
        setError(video.errorMessage || 'Video generation failed');
      } else if (isPlayableVideoUrl(video.videoUrl) && video.videoUrl?.includes('cloudinary')) {
        setSuccess('Video generated and uploaded to Cloudinary successfully!');
      } else if (isPlayableVideoUrl(video.videoUrl)) {
        setSuccess(
          'Video generated locally. Use “Upload to Cloudinary” if the player does not load.'
        );
      } else {
        setSuccess(res.data.message || 'Processing finished');
      }
      await fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };
  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = apiBase.replace(/\/api\/?$/, '');
    return `${base}${url.startsWith('/') ? url : '/' + url}`;
  };
  const handleReuploadCloudinary = async (videoId: string) => {
    setReuploading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/ai-videos/${videoId}/reupload-cloudinary`);
      const video = res.data.data as GeneratedVideo;
      setResultVideo(video);
      setSuccess('Video uploaded to Cloudinary successfully!');
      await fetchHistory();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to upload to Cloudinary'
      );
    } finally {
      setReuploading(false);
    }
  };
  const isTokenExpired = (conn?: SocialConnection) => {
    if (!conn) return true;
    if (!conn.connected) return true;
    if (conn.error && /expir/i.test(conn.error)) return true;
    if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) return true;
    return false;
  };
  const handleShare = async () => {
    if (!resultVideo?.videoUrl) {
      setError('No video available to share');
      return;
    }
    if (!selectedProviderId) {
      setError('Select a social provider to share');
      return;
    }
    const conn = connections[selectedProviderId];
    if (!conn || isTokenExpired(conn)) {
      setError(
        'Account not connected or token expired. Click Connect to authorize again.'
      );
      return;
    }
    const video_url = resolveMediaUrl(resultVideo.videoUrl);
    if (!video_url.startsWith('http://') && !video_url.startsWith('https://')) {
      setError('Video must be a public HTTPS URL. Click “Upload to Cloudinary” first.');
      return;
    }
    if (!isPlayableVideoUrl(resultVideo.videoUrl)) {
      setError(
        'Current file is not a playable video (likely an image fallback). Regenerate or Upload to Cloudinary.'
      );
      return;
    }
    setSharing(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/social/post', {
        providerId: selectedProviderId,
        video_url,
        media_type: mediaType,
        caption: caption || title || 'Check out this AI-generated video!',
        title: title || resultVideo.title || 'AI Generated Video',
      });
      setSuccess(res.data.message || 'Video shared successfully');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to share video';
      if (/expir|reconnect|token|unauthorized|401/i.test(msg)) {
        setError(`${msg} — please reconnect the account below.`);
      } else {
        setError(msg);
      }
    } finally {
      setSharing(false);
    }
  };
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const mediaOptions =
    MEDIA_TYPES[selectedProvider?.provider_key || ''] || MEDIA_TYPES.default;
  const selectedConn = selectedProviderId
    ? connections[selectedProviderId]
    : undefined;
  const needsReconnect = selectedProviderId
    ? isTokenExpired(selectedConn)
    : false;
  const playable = isPlayableVideoUrl(resultVideo?.videoUrl);
  const onCloudinary =
    !!resultVideo?.videoUrl &&
    (resultVideo.videoUrl.includes('res.cloudinary.com') ||
      !!resultVideo.metadata?.cloudinaryPublicId);
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="card-glass p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles size={28} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AI Video Generation</h1>
            <p className="text-slate-500 text-sm mt-1">
              Upload product images, add voice-over, generate an MP4, upload to Cloudinary,
              then share to social formats.
            </p>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 whitespace-pre-wrap">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Video Title</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Silk Saree Showcase"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={generating}
          />
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Product Images <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(up to 15)</span>
            </label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              disabled={generating || images.length >= 15}
            >
              <Upload size={16} /> Add images
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
          {images.length === 0 ? (
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/40 transition-all"
            >
              <ImageIcon className="mx-auto text-gray-400 mb-2" size={36} />
              <p className="text-gray-500 text-sm">Click or drag images here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={generating}
                  >
                    <X size={14} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                    {idx + 1}
                  </span>
                </div>
              ))}
              {images.length < 15 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500"
                  disabled={generating}
                >
                  <Upload size={22} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">Voice-over</label>
          <div className="flex flex-wrap gap-3 mb-4">
            {(
              [
                { key: 'none', label: 'No audio', icon: Volume2 },
                { key: 'upload', label: 'Upload audio', icon: Mic },
                { key: 'ai', label: 'AI voice-over', icon: Sparkles },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setAudioMode(key);
                  if (key !== 'upload') clearAudio();
                }}
                disabled={generating}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  audioMode === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          {audioMode === 'upload' && (
            <div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioSelect}
              />
              {!audioFile ? (
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="btn-primary text-sm"
                  disabled={generating}
                >
                  Choose audio file
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <Mic size={18} className="text-purple-600" />
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {audioFile.name}
                  </span>
                  {audioPreview && (
                    <audio src={audioPreview} controls className="h-8 max-w-[180px]" />
                  )}
                  <button
                    type="button"
                    onClick={clearAudio}
                    className="text-red-500"
                    disabled={generating}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
          {audioMode === 'ai' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Script</label>
                <textarea
                  className="input-field min-h-[90px]"
                  placeholder="Describe the product and key highlights for the AI voice..."
                  value={audioScript}
                  onChange={(e) => setAudioScript(e.target.value)}
                  disabled={generating}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Language
                  </label>
                  <select
                    className="input-field"
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                    disabled={generating}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="bn">Bengali</option>
                    <option value="mr">Marathi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Voice</label>
                  <select
                    className="input-field"
                    value={voiceGender}
                    onChange={(e) => setVoiceGender(e.target.value as any)}
                    disabled={generating}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mb-6 max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seconds per image
          </label>
          <input
            type="number"
            min={1}
            max={15}
            className="input-field"
            value={durationSeconds}
            onChange={(e) =>
              setDurationSeconds(Math.max(1, Math.min(15, Number(e.target.value) || 5)))
            }
            disabled={generating}
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || images.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Generating & uploading...
            </>
          ) : (
            <>
              <Film size={18} /> Generate Video
            </>
          )}
        </button>
      </div>
      {resultVideo && (
        <div className="card-glass p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Play size={20} className="text-purple-600" /> Generated Video
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              {playable ? (
                <video
                  key={resultVideo.videoUrl || resultVideo.id}
                  src={resolveMediaUrl(resultVideo.videoUrl)}
                  controls
                  playsInline
                  className="w-full rounded-xl border border-gray-200 bg-black max-h-96"
                  poster={
                    resultVideo.thumbnailUrl
                      ? resolveMediaUrl(resultVideo.thumbnailUrl)
                      : undefined
                  }
                />
              ) : resultVideo.thumbnailUrl || resultVideo.videoUrl ? (
                <div>
                  <img
                    src={resolveMediaUrl(
                      resultVideo.thumbnailUrl || resultVideo.videoUrl || ''
                    )}
                    alt="Preview"
                    className="w-full rounded-xl border border-gray-200 object-contain max-h-96 bg-gray-50"
                  />
                  <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                    This entry is not a playable MP4 (old fallback stored an image). Click
                    “Upload to Cloudinary” to regenerate and upload a real video.
                  </p>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No media available</div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    resultVideo.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : resultVideo.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {resultVideo.status}
                </span>
                {onCloudinary && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                    Cloudinary
                  </span>
                )}
                {resultVideo.metadata?.engine && (
                  <span className="text-xs text-gray-500">
                    engine: {resultVideo.metadata.engine}
                  </span>
                )}
              </div>
              {resultVideo.errorMessage && (
                <p className="text-xs text-red-500 mt-1">{resultVideo.errorMessage}</p>
              )}
              {resultVideo.videoUrl && (
                <p
                  className="text-xs text-gray-400 mt-1 truncate"
                  title={resultVideo.videoUrl}
                >
                  {resultVideo.videoUrl}
                </p>
              )}
              {resultVideo.status !== 'failed' && !onCloudinary && (
                <button
                  type="button"
                  onClick={() => handleReuploadCloudinary(resultVideo.id)}
                  disabled={reuploading}
                  className="mt-3 px-3 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-2"
                >
                  {reuploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CloudUpload size={16} />
                  )}
                  Upload to Cloudinary
                </button>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <Share2 size={18} /> Share to social
              </h3>
              {providers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No enabled social providers. Configure them under Social Post Video
                  Config.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Provider
                    </label>
                    <select
                      className="input-field"
                      value={selectedProviderId}
                      onChange={(e) => {
                        setSelectedProviderId(e.target.value);
                        const p = providers.find((x) => x.id === e.target.value);
                        const opts =
                          MEDIA_TYPES[p?.provider_key || ''] || MEDIA_TYPES.default;
                        setMediaType(opts[0]?.value || 'REELS');
                      }}
                      disabled={sharing}
                    >
                      <option value="">Select provider</option>
                      {providers.map((p) => {
                        const conn = connections[p.id];
                        const expired = isTokenExpired(conn);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {conn?.connected && !expired
                              ? ` (@${conn.username || 'connected'})`
                              : expired
                              ? ' — reconnect required'
                              : ' — not connected'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {selectedProviderId && needsReconnect && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium">
                          Account not connected or token expired
                        </p>
                        <p className="text-xs mt-0.5">
                          Reconnect to post videos to this provider.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAuthPopup(selectedProviderId)}
                        disabled={isConnecting === selectedProviderId}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isConnecting === selectedProviderId ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Link2 size={14} />
                        )}
                        Connect
                      </button>
                    </div>
                  )}
                  {selectedProviderId && !needsReconnect && selectedConn?.connected && (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      Connected as @
                      {selectedConn.username || selectedConn.accountId || 'account'}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Format
                    </label>
                    <select
                      className="input-field"
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value)}
                      disabled={sharing}
                    >
                      {mediaOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Caption
                    </label>
                    <textarea
                      className="input-field min-h-[80px]"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption for your post..."
                      disabled={sharing}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={
                      sharing ||
                      !selectedProviderId ||
                      needsReconnect ||
                      resultVideo.status !== 'completed' ||
                      !playable ||
                      !onCloudinary
                    }
                    className="btn-primary flex items-center gap-2"
                  >
                    {sharing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sharing...
                      </>
                    ) : (
                      <>
                        <Share2 size={16} /> Share now
                      </>
                    )}
                  </button>
                  {!onCloudinary && playable && (
                    <p className="text-xs text-amber-600">
                      Share requires a public Cloudinary URL. Upload to Cloudinary first.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="card-glass p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent generations</h2>
        {loadingHistory ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500 text-sm">No videos generated yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((v) => {
              const ok = isPlayableVideoUrl(v.videoUrl);
              const cloud =
                !!v.videoUrl &&
                (v.videoUrl.includes('res.cloudinary.com') ||
                  !!v.metadata?.cloudinaryPublicId);
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-white hover:shadow-sm cursor-pointer"
                  onClick={() => setResultVideo(v)}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {v.thumbnailUrl ? (
                      <img
                        src={resolveMediaUrl(v.thumbnailUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Film size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {v.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.status} · {v.imageUrls?.length || 0} images
                      {cloud ? ' · Cloudinary' : ok ? ' · local MP4' : ' · no video'}
                      {v.createdAt ? ` · ${new Date(v.createdAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : v.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default AIVideoGeneration;
