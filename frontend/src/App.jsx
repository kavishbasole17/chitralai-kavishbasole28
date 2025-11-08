import React, { useState, useEffect } from 'react';
import ImageGallery from './components/ImageGallery.jsx'; // Or ImageGrid.jsx
import ImageUpload from './components/ImageUpload.jsx';
import SearchBar from './components/SearchBar.jsx'; 
import { searchImages } from './utils/api.js'; 

// --- SVG Icons ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
// CollapseIcon is no longer needed since the nav is permanently collapsed


export default function App() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  // --- Theme Toggle Logic ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  // --- Nav Collapse Logic REMOVED (permanently collapsed) ---

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  // toggleNav is no longer needed

  const handleUploadSuccess = (newImage) => {
    setImages((prevImages) => [newImage, ...prevImages]);
    setHasSearched(true); 
    setShowUpload(false);
  };

  const handleSearchResults = (results, keywordCount) => {
    setImages(results);
    setHasSearched(true);
    if (results.length === 0 && keywordCount > 0) {
      setSearchError('No images found for that query.');
    } else {
      setSearchError('');
    }
  };

  const handleSearchLoading = (loading) => {
    setIsLoading(loading);
  };

  const handleLogout = () => {
    alert('Logged out!');
  };

  return (
    // app-layout will now be permanently collapsed
    <div className="app-layout nav-collapsed">
      
      {/* 1. Left Navigation Bar (Permanently Collapsed, Icon-Only) */}
      <nav className="left-nav">
        <div className="nav-group nav-group-top">
          {/* Collapse button and text REMOVED */}
          
          <a href="#" className="nav-item active">
            <HomeIcon />
            {/* Text 'span' REMOVED */}
          </a>
        </div>
        
        <div className="nav-group nav-group-bottom">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            {/* Text 'span' REMOVED */}
          </button>
          
          <button onClick={handleLogout} className="nav-item">
            <LogoutIcon />
            {/* Text 'span' REMOVED */}
          </button>
        </div>
      </nav>

      {/* 2. Main Content Area */}
      <main className="main-content">
        {/* --- THIS IS THE NEW STICKY HEADER --- */}
        <div className="main-header">
          <div className="header-background"></div>
          {/* "Welcome back!" is now in the header */}
          <h1 className="header-title">Welcome back!</h1>
          <SearchBar 
            onResults={handleSearchResults} 
            onLoading={handleSearchLoading} 
          />
        </div>
        
        {/* --- THIS IS THE NEW SCROLLABLE BODY --- */}
        <div className="main-body">
          <div className="gallery-header">
            {/* Title is gone from here */}
            <button className="show-upload-btn" onClick={() => setShowUpload(true)}>
              Upload Image
            </button>
          </div>
          
          {searchError && <p className="error-message">⚠️ {searchError}</p>}
          
          <ImageGallery 
            images={images} 
            isLoading={isLoading} 
            hasSearched={hasSearched} 
          />
        </div>
      </main>

      {/* 3. Upload Modal */}
      {showUpload && (
        <div className="upload-modal-backdrop" onClick={() => setShowUpload(false)}>
          <div className="upload-modal-content" onClick={e => e.stopPropagation()}>
            <ImageUpload onUploadSuccess={handleUploadSuccess} />
            <button className="close-modal-btn" onClick={() => setShowUpload(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}