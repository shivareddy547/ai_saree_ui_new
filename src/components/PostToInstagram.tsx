import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
interface PostToInstagramProps {
  isPosting: boolean;
  postSuccess: boolean;
  createError: string | null;
  productName: string;
  price: string;
  description: string;
  handlePostToInstagram: () => void;
  resetAllState: () => void;
  isEditMode?: boolean;
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
  isEditMode = false,
}) => {
  if (postSuccess) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-green-600">
          {isEditMode ? 'Product Updated Successfully!' : 'Product Created Successfully!'}
        </h3>
        <p className="text-gray-600">
          {isEditMode 
            ? 'Your product has been updated and is now ready to be posted.'
            : 'Your product has been created and is now ready to be posted.'
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetAllState}
            className="btn-primary flex items-center justify-center gap-2"
          >
            Create Another Product
          </button>
          <button
            onClick={handlePostToInstagram}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </span>
            Post to Instagram
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <span className="w-6 h-6 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </span>
        {isEditMode ? 'Update & Post to Instagram' : 'Post to Instagram'}
      </h2>
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-slate-700">Product Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <span className="ml-2 font-medium">{productName || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Price:</span>
            <span className="ml-2 font-medium">₹{price || '0'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 text-gray-700">{description || 'No description provided'}</p>
          </div>
        </div>
      </div>
      {createError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{createError}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          onClick={handlePostToInstagram}
          disabled={isPosting}
          className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
        >
          {isPosting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <span className="w-5 h-5 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </span>
              {isEditMode ? 'Update Product' : 'Create & Post'}
            </>
          )}
        </button>
        <button
          onClick={resetAllState}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};
export default PostToInstagram;
