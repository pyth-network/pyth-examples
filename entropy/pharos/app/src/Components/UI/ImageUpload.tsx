"use client";
import React, { useState, useRef } from 'react';
import { uploadImage, validateImageDimensions } from '@/lib/imageUpload';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import Image from 'next/image';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageUploaded, 
  currentImage, 
  className = "" 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      // Validate dimensions (optional - square image)
      const isSquare = await validateImageDimensions(file);
      if (!isSquare) {
        console.warn('Image is not square - may not display optimally');
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload image
      const result = await uploadImage(file);
      
      if (result.success && result.url) {
        onImageUploaded(result.url);
        setError(null);
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-4 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer
          hover:border-pharos-orange hover:bg-pharos-orange/5 transition-all duration-200
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <AiOutlineLoading3Quarters className="animate-spin text-4xl text-pharos-orange mb-4" />
            <p className="text-lg font-rubik font-bold text-gray-600">
              Uploading Image...
            </p>
          </div>
        ) : preview ? (
          <div className="relative">
            <Image
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.8)]"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-xl font-rubik font-bold text-gray-700 mb-2">
              Click to Upload Image
            </p>
            <p className="text-sm font-rubik text-gray-500">
              PNG, JPG, GIF up to 5MB
            </p>
            <p className="text-xs font-rubik text-gray-400 mt-2">
              Square images work best
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3">
          <p className="text-red-800 font-rubik font-bold text-sm">
            ❌ {error}
          </p>
        </div>
      )}

      {/* Upload Tips */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
        <p className="text-blue-800 font-rubik font-bold text-sm mb-2">
          💡 Upload Tips:
        </p>
        <ul className="text-blue-700 font-rubik text-xs space-y-1">
          <li>• Square images (1:1 ratio) display best</li>
          <li>• High resolution images look better</li>
          <li>• Supported formats: PNG, JPG, GIF</li>
          <li>• Max file size: 5MB</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;

