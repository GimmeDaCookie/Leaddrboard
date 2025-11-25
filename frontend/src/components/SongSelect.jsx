import React, { useState, useEffect, useRef } from 'react';
import api from '../axios';

function SongSelect({ onSongSelect, initialSong }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedSongTitle, setSelectedSongTitle] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);

  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/songs')
      .then(response => {
        setSongs(response.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Error fetching songs');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // If an initialSong is provided (object with title/_id), prefill the input and notify parent
  useEffect(() => {
    if (initialSong && initialSong.title && initialSong.title !== query) {
      setQuery(initialSong.title);
      setSelectedSongTitle(initialSong.title);
      onSongSelect && onSongSelect(initialSong);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSong]);

  const filtered = query.trim()
    ? songs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()))
    : songs; // use full list, we'll slice by visibleCount below

  const handleSelect = (song) => {
    setSelectedSongTitle(song.title);
    setQuery(song.title);
    setOpen(false);
    onSongSelect(song);
  };

  // reset visible count when query or open state changes
  useEffect(() => {
    setVisibleCount(50);
  }, [query, open, songs]);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      // reached bottom, load more
      setVisibleCount((v) => Math.min(filtered.length, v + 50));
    }
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = filtered[highlighted];
      if (sel) handleSelect(sel);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading songs...</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder="Type to search songs..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
      />

      {open && (
        <div
          className="absolute z-20 w-full mt-1 bg-base-200 border border-base-300 rounded-box max-h-56 overflow-auto shadow-lg"
          onScroll={handleScroll}
        >
          <ul className="menu menu-sm w-full p-0">
            {filtered.length === 0 ? (
              <li className="disabled"><a>No songs found.</a></li>
            ) : (
              filtered.slice(0, visibleCount).map((song, idx) => (
                <li key={song._id || song.title}>
                  <a
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(song); }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={idx === highlighted ? 'active' : ''}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{song.title}</span>
                      {song.series && <span className="text-xs opacity-60">{song.series}</span>}
                    </div>
                  </a>
                </li>
              ))
            )}
            {visibleCount < filtered.length && (
              <li className="disabled"><a>Scroll to load more...</a></li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SongSelect;