import React, { useState, useRef } from 'react';
import { getPresignedUrl, uploadToS3, getImageStatus } from '../utils/api.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10485760; // 10MB

export default function ImageUpload({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setProgress(0);
    setMessage('');
    setError('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateFile = (file) => {
    if (!file) throw new Error('No file selected');
    if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Only image files are allowed');
    if (file.size > MAX_FILE_SIZE) throw new Error('File size must be under 10MB');
  };

  /**
   * --- THIS FUNCTION IS NOW FIXED ---
   * It now passes the *entire* item to onUploadSuccess
   */
  const pollForResults = (imageId) => {
    console.log(`[Polling] Starting to poll for status of imageId: ${imageId}`);

    const interval = setInterval(async () => {
      try {
        // 1. Get the FULL item from the API
        const item = await getImageStatus(imageId); 

        console.log(`[Polling] Received status: ${item.status}`);

        if (item.status === 'COMPLETED') {
          // --- IT'S DONE! ---
          clearInterval(interval);
          setMessage('✅ Analysis complete!');
          if (onUploadSuccess) {
            // 2. Pass the ENTIRE item object to App.jsx
            onUploadSuccess(item); 
          }
          setTimeout(resetForm, 2000);

        } else if (item.status === 'PENDING') {
          setMessage('Image is being analyzed...');
        } else {
          clearInterval(interval);
          setError('⚠️ Analysis failed. Please try another image.');
          setUploading(false);
        }
      } catch (err) {
        clearInterval(interval);
        console.error('[Polling] Error during polling:', err);
        setError('⚠️ Error checking status.'); 
        setUploading(false);
      }
    }, 3000);
  };


  const handleUpload = async (file) => {
    console.log('⚡ Upload started for:', file?.name);
    try {
      validateFile(file);
      setError('');
      setMessage('');
      setUploading(true);
      setProgress(0);

      console.log('📡 Requesting presigned URL...');
      const { presignedUrl, imageId } = await getPresignedUrl(file.name, file.type);
      console.log('✅ Presigned URL received:', presignedUrl);

      console.log('⬆️ Uploading file to S3...');
      await uploadToS3(presignedUrl, file, ({ loaded, total }) => {
        const percent = Math.round((loaded / total) * 100);
        setProgress(percent);
      });

      console.log('🎉 Upload completed.');
      setMessage('✅ Upload successful! Image is being analyzed...');
      setProgress(100);

      pollForResults(imageId);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  // ... (Your drag-and-drop and JSX handlers are all perfect) ...
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };
  const handleFileSelect = (e) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };
  const handleButtonClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  }

  return (
    <div className="upload-container">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        {!uploading && !message && !error ? (
          <div>
            <p className="upload-icon">📸</p>
            <p>Drag and drop your image here</p>
            <p>or</p>
            <button className="select-btn" onClick={handleButtonClick} disabled={uploading}>
              Select File
            </button>
            <p className="file-hint">JPG, PNG, GIF, WebP • Max 10MB</p>
          </div>
        ) : (
          <div className="upload-status-box">
            <p className="progress-text">
              {message || (uploading ? `Uploading... ${progress}%` : 'Upload complete!')}
            </p>
            {(uploading || message) && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button className="retry-btn" onClick={() => { resetForm(); handleButtonClick(); }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}