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
  Cpu,
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

interface AiModelOption {
  id: string;
  name: string;
  model_identifier: string;
  model_type: string;
  enabled: boolean;
  is_default: boolean;
  provider?: {
    id: string;
    name: string;
    provider: string;
    enabled: boolean;
  };
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
    requestId?: string;
    modelIdentifier?: string;
    providerKey?: string;
    providerName?: string;
    prompt?: string;
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

const CLOUD_NAME =
  process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'lovecart';
const UPLOAD_PRESET =
  process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'product_videos';

const OUT_W = 1080;
const OUT_H = 1920;

/** Providers known to support native AI video APIs */
const VIDEO_CAPABLE_PROVIDERS = new Set(['grok']);

const isPlayableVideoUrl = (url?: string | null) => {
  if (!url) return false;
  if (url.includes('res.cloudinary.com')) return true;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return true;
  if (url.includes('/uploads/videos/')) return true;
  if (url.includes('x.ai') || url.includes('cdn')) return true;
  return false;
};

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function buildVideoBlob(
  imageSrcs: string[],
  audioBlob: Blob | null,
  secondsPerImage: number,
  onProgress?: (p: number, msg: string) => void
): Promise<Blob> {
  onProgress?.(5, 'Loading images...');
  const images = await Promise.all(imageSrcs.map((s) => loadImage(s)));
  if (images.length === 0) throw new Error('No images to encode');

  let audioDuration = secondsPerImage * images.length;
  let audioEl: HTMLAudioElement | null = null;
  let audioObjectUrl: string | null = null;

  if (audioBlob) {
    audioObjectUrl = URL.createObjectURL(audioBlob);
    audioEl = new Audio(audioObjectUrl);
    await new Promise<void>((resolve, reject) => {
      audioEl!.onloadedmetadata = () => resolve();
      audioEl!.onerror = () => reject(new Error('Failed to load audio'));
      audioEl!.load();
    });
    if (audioEl.duration && isFinite(audioEl.duration) && audioEl.duration > 0) {
      audioDuration = audioEl.duration;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));

  let audioContext: AudioContext | null = null;
  if (audioEl) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioEl);
    const dest = audioContext.createMediaStreamDestination();
    source.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
  }

  const mimeCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let mimeType = '';
  for (const m of mimeCandidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      mimeType = m;
      break;
    }
  }
  if (!mimeType) mimeType = 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const fps = 30;
  const totalFrames = Math.ceil(audioDuration * fps);
  const perImageSec = Math.max(0.5, secondsPerImage);
  const framesPerImage = Math.max(1, Math.round(perImageSec * fps));

  onProgress?.(15, 'Recording video...');
  recorder.start(500);
  if (audioContext) await audioContext.resume();
  if (audioEl) {
    try {
      await audioEl.play();
    } catch (_) {}
  }

  await new Promise<void>((resolve) => {
    let frame = 0;
    const tick = () => {
      if (frame >= totalFrames) {
        resolve();
        return;
      }
      const imgIndex = Math.floor(frame / framesPerImage) % images.length;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUT_W, OUT_H);
      drawImageCover(ctx, images[imgIndex], OUT_W, OUT_H);
      const pct = 15 + (frame / totalFrames) * 70;
      if (frame % 15 === 0) onProgress?.(Math.min(85, pct), 'Encoding frames...');
      frame++;
      setTimeout(tick, 1000 / fps);
    };
    tick();
  });

  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  if (audioContext) {
    try {
      await audioContext.close();
    } catch (_) {}
  }
  if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);

  onProgress?.(90, 'Finalizing...');
  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.stop();
    setTimeout(() => {
      if (chunks.length > 0) resolve(new Blob(chunks, { type: mimeType }));
    }, 4000);
  });
  onProgress?.(95, 'Video ready');
  return blob;
}

async function uploadBlobToCloudinary(
  blob: Blob,
  onProgress?: (p: number) => void
): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  form.append('file', blob, `ai_video.${ext}`);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'ai_videos');
  const xhr = new XMLHttpRequest();
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const result = await new Promise<any>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.error?.message || `Cloudinary ${xhr.status}`));
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('Cloudinary upload network error'));
    xhr.open('POST', url);
    xhr.send(form);
  });
  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
  };
}

async function uploadImageFileToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'ai_video_refs');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Image upload failed');
  return json.secure_url || json.url;
}

const AIVideoGeneration: React.FC = () => {
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true,
  });

  const [engine, setEngine] = useState<'local' | 'ai'>('local');
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [aiDuration, setAiDuration] = useState(8);

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
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultVideo, setResultVideo] = useState<GeneratedVideo | null>(null);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<{ [id: string]: SocialConnection }>({});
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [mediaType, setMediaType] = useState('REELS');
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedModel = aiModels.find((m) => m.id === selectedModelId);
  const selectedSupportsVideo =
    !!selectedModel &&
    VIDEO_CAPABLE_PROVIDERS.has(selectedModel.provider?.provider || '');

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

  /**
   * Load ALL enabled models from AI Models Setup (any provider).
   * Prefer default model / video-type models for initial selection.
   */
  const fetchAiModels = useCallback(async () => {
    try {
      const res = await api.get('/ai-models');
      const all: AiModelOption[] = (res.data.data || []).filter(
        (m: AiModelOption) => m.enabled && m.provider?.enabled
      );
      // Sort: defaults first, then video type, then name
      all.sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        if (a.model_type === 'video' && b.model_type !== 'video') return -1;
        if (b.model_type === 'video' && a.model_type !== 'video') return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setAiModels(all);
      if (all.length > 0) {
        setSelectedModelId((prev) => {
          if (prev && all.some((m) => m.id === prev)) return prev;
          const def = all.find((m) => m.is_default);
          const video = all.find((m) => m.model_type === 'video');
          return (def || video || all[0]).id;
        });
      }
    } catch (_) {
      setAiModels([]);
    }
  }, []);

  const fetchProvidersAndConnections = useCallback(async () => {
    try {
      const [provRes, connRes] = await Promise.all([
        api.get('/providers'),
        api.get('/social/status'),
      ]);
      const all = provRes.data.data || [];
      setProviders(all.filter((p: any) => p.provider_type === 'social' && p.is_enabled));
      const map: { [id: string]: SocialConnection } = {};
      (connRes.data.data || []).forEach((c: any) => {
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
    fetchAiModels();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchHistory, fetchProvidersAndConnections, fetchAiModels]);

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
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
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

  const startPolling = (videoId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.get(`/ai-videos/${videoId}/status`);
        const v = res.data.data as GeneratedVideo;
        setResultVideo(v);
        setGenProgress(Math.min(95, 20 + attempts * 5));
        setGenMessage(
          `${v.metadata?.providerName || 'AI'} status: ${v.status}`
        );
        if (v.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
          setGenProgress(100);
          setSuccess('AI video generated successfully!');
          fetchHistory();
        } else if (v.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
          setError(v.errorMessage || 'AI generation failed');
          fetchHistory();
        }
      } catch (err: any) {
        if (attempts > 60) {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
          setError(err.response?.data?.message || 'Polling timed out');
        }
      }
    }, 4000);
  };

  const handleGenerateLocal = async () => {
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
      let audioBlob: Blob | null = null;
      if (audioMode === 'upload' && audioFile) {
        audioBlob = audioFile;
        setGenMessage('Using uploaded audio...');
      } else if (audioMode === 'ai' && audioScript.trim()) {
        setGenMessage('Generating AI voice-over...');
        setGenProgress(5);
        const ttsRes = await api.post(
          '/ai-videos/tts',
          {
            script: audioScript.trim(),
            language: audioLanguage,
            voiceGender,
          },
          { responseType: 'blob', timeout: 120000 }
        );
        audioBlob = ttsRes.data as Blob;
        if (!audioBlob || audioBlob.size < 100) {
          throw new Error('AI voice generation returned empty audio');
        }
      }

      setGenMessage('Building video (full-frame images + audio)...');
      const videoBlob = await buildVideoBlob(
        images.map((i) => i.preview),
        audioBlob,
        durationSeconds,
        (p, msg) => {
          setGenProgress(p);
          setGenMessage(msg);
        }
      );

      setGenMessage('Uploading to Cloudinary...');
      setGenProgress(96);
      const uploaded = await uploadBlobToCloudinary(videoBlob, (p) => {
        setGenProgress(96 + Math.round(p * 0.03));
      });

      setGenMessage('Saving...');
      const saveRes = await api.post('/ai-videos/save', {
        title: title.trim() || 'AI Generated Video',
        videoUrl: uploaded.url,
        thumbnailUrl: null,
        imageUrls: [],
        audioMode,
        audioScript: audioMode === 'ai' ? audioScript.trim() : null,
        audioLanguage,
        voiceGender,
        durationSeconds,
        cloudinaryPublicId: uploaded.publicId,
        metadata: {
          clientEngine: 'mediarecorder',
          hasAudio: !!audioBlob,
          frameCount: images.length,
        },
      });

      const video = saveRes.data.data as GeneratedVideo;
      setResultVideo(video);
      setSuccess(
        'Video generated with full-frame images and audio, uploaded to Cloudinary!'
      );
      setGenProgress(100);
      await fetchHistory();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || err.message || 'Failed to generate video'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!selectedModelId) {
      setError(
        'Select a model from AI Models Setup (or mark a default model there).'
      );
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt for AI video generation');
      return;
    }
    if (!selectedSupportsVideo) {
      setError(
        `Provider "${selectedModel?.provider?.name || selectedModel?.provider?.provider}" does not support native AI video generation. ` +
          'Choose a video-capable model (e.g. Grok video) or use Local slideshow. ' +
          'Groq and most chat providers only support text inference.'
      );
      return;
    }

    setGenerating(true);
    setGenProgress(10);
    setGenMessage('Uploading reference images...');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setGenMessage(`Uploading image ${i + 1}/${images.length}...`);
        const url = await uploadImageFileToCloudinary(images[i].file);
        uploadedUrls.push(url);
        setGenProgress(10 + Math.round(((i + 1) / Math.max(1, images.length)) * 20));
      }

      setGenMessage(
        `Starting generation with ${selectedModel?.provider?.name || 'AI'} / ${selectedModel?.name || 'model'}...`
      );
      setGenProgress(35);
      const res = await api.post('/ai-videos/generate-ai', {
        title: title.trim() || 'AI Video',
        prompt: prompt.trim(),
        modelId: selectedModelId,
        imageUrls: uploadedUrls,
        durationSeconds: aiDuration,
        aspectRatio,
        resolution: '720p',
      });

      const video = res.data.data as GeneratedVideo;
      setResultVideo(video);
      setGenMessage('Job started — polling for completion...');
      setGenProgress(40);
      startPolling(video.id);
    } catch (err: any) {
      setGenerating(false);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to start AI generation'
      );
    }
  };

  const handleGenerate = async () => {
    setError('');
    setSuccess('');
    setResultVideo(null);
    setGenProgress(0);
    setGenMessage('');
    if (engine === 'ai') {
      await handleGenerateAi();
    } else {
      await handleGenerateLocal();
    }
  };

  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = apiBase.replace(/\/api\/?$/, '');
    return `${base}${url.startsWith('/') ? url : '/' + url}`;
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
    if (!video_url.startsWith('http')) {
      setError('Video must be a public HTTPS URL.');
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
  const needsReconnect = selectedProviderId ? isTokenExpired(selectedConn) : false;
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
              Local slideshow or AI provider from Models Setup. Provider and model are
              selected dynamically — nothing is hardcoded.
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation engine
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEngine('local')}
              disabled={generating}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                engine === 'local'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Film size={16} /> Local slideshow
            </button>
            <button
              type="button"
              onClick={() => setEngine('ai')}
              disabled={generating}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                engine === 'ai'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Cpu size={16} /> AI Provider
            </button>
          </div>
        </div>

        {engine === 'ai' && (
          <div className="mb-6 p-5 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Model <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">
                  (from AI Models Setup)
                </span>
              </label>
              {aiModels.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No enabled models found. Enable a provider and add models under{' '}
                  <strong>AI Models Setup</strong>. Your default provider will be used
                  automatically when available.
                </p>
              ) : (
                <select
                  className="input-field"
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  disabled={generating}
                >
                  <option value="">Select model</option>
                  {aiModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.provider?.name || m.provider?.provider || 'AI'}] {m.name} (
                      {m.model_identifier})
                      {m.model_type ? ` · ${m.model_type}` : ''}
                      {m.is_default ? ' · default' : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedModel && (
                <p className="text-xs text-gray-600 mt-1">
                  Provider:{' '}
                  <strong>{selectedModel.provider?.name || '—'}</strong> (
                  {selectedModel.provider?.provider}) · type:{' '}
                  {selectedModel.model_type}
                  {selectedSupportsVideo
                    ? ' · supports AI video'
                    : ' · chat/text only (use Local slideshow for video, or pick a video-capable model)'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field min-h-[100px]"
                placeholder="e.g. Create a luxury wedding saree advertisement with soft lighting and elegant motion"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aspect ratio
                </label>
                <select
                  className="input-field"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={generating}
                >
                  <option value="9:16">9:16 (Reel / Short)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (sec)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  className="input-field"
                  value={aiDuration}
                  onChange={(e) =>
                    setAiDuration(
                      Math.max(1, Math.min(15, Number(e.target.value) || 8))
                    )
                  }
                  disabled={generating}
                />
              </div>
            </div>
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
              Product Images{' '}
              {engine === 'local' && <span className="text-red-500">*</span>}
              <span className="text-gray-400 font-normal ml-1">
                {engine === 'ai'
                  ? '(optional reference images)'
                  : '(up to 15)'}
              </span>
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

        {engine === 'local' && (
          <>
            <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Voice-over
              </label>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Script
                    </label>
                    <textarea
                      className="input-field min-h-[90px]"
                      placeholder="Describe the product..."
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Voice
                      </label>
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
                  setDurationSeconds(
                    Math.max(1, Math.min(15, Number(e.target.value) || 5))
                  )
                }
                disabled={generating}
              />
            </div>
          </>
        )}

        {generating && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{genMessage || 'Working...'}</span>
              <span>{Math.round(genProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${genProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            generating ||
            (engine === 'local' && images.length === 0) ||
            (engine === 'ai' && (!selectedModelId || !prompt.trim()))
          }
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Film size={18} />{' '}
              {engine === 'ai'
                ? `Generate with ${selectedModel?.provider?.name || 'AI'}`
                : 'Generate Video'}
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
                  className="w-full rounded-xl border border-gray-200 bg-black max-h-96 object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm">
                  {resultVideo.status === 'processing'
                    ? 'Generation in progress…'
                    : 'No playable media yet'}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {resultVideo.status}
                </span>
                {(resultVideo.metadata?.engine === 'ai_provider' ||
                  resultVideo.metadata?.engine === 'grok') && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {resultVideo.metadata?.providerName ||
                      resultVideo.metadata?.providerKey ||
                      'AI'}
                    {resultVideo.metadata?.modelIdentifier
                      ? ` · ${resultVideo.metadata.modelIdentifier}`
                      : ''}
                  </span>
                )}
                {onCloudinary && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                    Cloudinary
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <Share2 size={18} /> Share to social
              </h3>
              {providers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No enabled social providers.
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
                        <p className="font-medium">Reconnect required</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAuthPopup(selectedProviderId)}
                        disabled={isConnecting === selectedProviderId}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
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
                      !playable
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
            {history.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-white hover:shadow-sm cursor-pointer"
                onClick={() => setResultVideo(v)}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                  <Film size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {v.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {v.status}
                    {v.metadata?.providerName
                      ? ` · ${v.metadata.providerName}`
                      : v.metadata?.engine === 'grok'
                      ? ' · Grok'
                      : ''}
                    {v.createdAt
                      ? ` · ${new Date(v.createdAt).toLocaleString()}`
                      : ''}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIVideoGeneration;
