import React from "react";
import { Play, RotateCcw, Settings2 } from "lucide-react";

interface VideoPreviewComponentProps {
  videoUrl: string | null;
  previews: string[];
  setCurrentStep: (step: number) => void;
  setShowConfig: (value: boolean) => void;
}

const VideoPreviewComponent: React.FC<VideoPreviewComponentProps> = ({
  videoUrl,
  previews,
  setCurrentStep,
  setShowConfig,
}) => {
  return (
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
};

export default VideoPreviewComponent;
