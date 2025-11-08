import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * Get presigned URL from backend for S3 upload
 */
export async function getPresignedUrl(fileName, fileType) {
  try {
    const response = await apiClient.post('/api/generate-upload-url', {
      fileName,
      fileType,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to generate upload URL');
  }
}

/**
 * Upload file directly to S3 using presigned URL
 */
export async function uploadToS3(presignedUrl, file, onProgress) {
  try {
    const response = await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
          });
        }
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to upload to S3');
  }
}

/**
 * --- THIS IS THE NEW FUNCTION ---
 * Polls the backend for the status of an image.
 * @param {string} imageId - The unique ID of the image
 * @returns {Promise} The full DynamoDB item (including status and keywords)
 */
export async function getImageStatus(imageId) {
  try {
    // We use your 'apiClient' to make the request
    const response = await apiClient.get(`/api/status/${imageId}`);
    return response.data;
  } catch (error) {
    // We throw an error so the pollForResults function can catch it
    throw new Error(error.response?.data?.error || 'Failed to get image status');
  }
}


/**
 * Search images by keywords
 */
export async function searchImages(keywords) {
  try {
    const params = new URLSearchParams();
    // Your backend /api/search expects a single query 'q'
    const queryString = keywords.join(' '); 
    params.append('q', queryString);

    const response = await apiClient.get('/api/search', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Search failed');
  }
}