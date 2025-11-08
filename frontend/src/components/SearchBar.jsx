import React, { useState } from 'react';
import { searchImages } from '../utils/api';

export default function SearchBar({ onResults, onLoading }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const parseKeywords = (input) => {
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((keyword) => keyword.length > 0);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    const keywords = parseKeywords(query);

    // Validation
    if (keywords.length === 0) {
      setError('Please enter at least one search term');
      return;
    }

    if (keywords.length > 5) {
      setError('Too many search terms. Maximum 5 allowed.');
      return;
    }

    try {
      if (onLoading) onLoading(true);
      const result = await searchImages(keywords);
      if (onResults) onResults(result.images || [], keywords.length);
    } catch (err) {
      setError(err.message || 'Search failed');
      if (onResults) onResults([], 0);
    } finally {
      if (onLoading) onLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setError('');
    if (onResults) onResults([], 0);
  };

  const handleTagClick = (tag) => {
    setQuery(tag);
    setError('');
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Search (e.g., 'beach sunset')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-btn">
          🔍
        </button>
        {query && (
          <button type="button" className="clear-btn" onClick={handleClear}>
            ✕
          </button>
        )}
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}
