import React from "react";
import { Send, Loader2, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface PostToInstagramProps {
  isPosting: boolean;
  postSuccess: boolean;
  createError: string | null;
  productName: string;
  price: string;
  description: string;
  handlePostToInstagram: () => void;
  resetAllState: () => void;
}

const PostToInstagram: React.FC<PostToInstagramProps> = ({
  isPosting,
  postSuccess,
  createError,
  productName,
  price,
  description,
  handlePostToInstagram,
  resetAllState,
}) => {
  return (
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
};

export default PostToInstagram;
