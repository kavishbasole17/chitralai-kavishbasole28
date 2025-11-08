import React from 'react';

// A simple component to render one image card
function ImageCard({ image }) {
  
  const imageUrl = image.s3Url || `https://my-image-search-bucket-kavishbasole28.s3.amazonaws.com/${image.s3Key}`;
  
  // This logic is still correct
  const keywordsArray = Array.isArray(image.keywords) ? image.keywords : [];
  
  return (
    <div className="image-card">
      <img 
        src={imageUrl} 
        alt={keywordsArray.length > 0 ? keywordsArray.join(', ') : 'Uploaded image'} 
        loading="lazy" 
      />
      
      {/* --- THIS IS THE NEW PART --- */}
      {/* This overlay is hidden by default and appears on hover */}
      <div className="image-card-overlay">
        <div className="image-card-keywords">
          {keywordsArray.map(kw => (
            <span key={kw} className="keyword-tag">{kw}</span>
          ))}
        </div>
      </div>
      {/* --- END OF NEW PART --- */}
      
    </div>
  );
}

// The main gallery/grid component
export default function ImageGallery({ images, isLoading, hasSearched }) { // Use ImageGallery or ImageGrid
  if (isLoading) {
    return <div className="gallery-message">Loading images...</div>;
  }

  if (images.length === 0 && hasSearched) {
    return (
      <div className="gallery-message">
        <h2>No results found</h2>
        <p>Try a different search term or upload a new image.</p>
      </div>
    );
  }
  
  if (images.length === 0 && !hasSearched) {
     return (
      <div className="gallery-message">
        {/* We keep this empty for the clean design */}
      </div>
    );
  }

  return (
    <div className="image-gallery-grid">
      {images.map(image => (
        <ImageCard key={image.imageID} image={image} />
      ))}
    </div>
  );
}