import React, { useState, useEffect, useRef } from 'react';
import api from '../axios';

function ArcadeSelect({ onArcadeSelect }) {
  const [arcades, setArcades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);

  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/arcades')
      .then(res => {
        setArcades(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching arcades');
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

  const filtered = query.trim()
    ? arcades.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : arcades; // full list (will slice by visibleCount)

  useEffect(() => setVisibleCount(50), [query, open, arcades]);

  const handleSelect = (arcade) => {
    if (!arcade) {
      setQuery('');
      onArcadeSelect(null);
      setOpen(false);
      return;
    }
    setQuery(arcade.name);
    onArcadeSelect(arcade);
    setOpen(false);
  };

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setVisibleCount(v => Math.min(filtered.length, v + 50));
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading arcades...</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder="Select or type to search arcades..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        aria-autocomplete="list"
      />

      {open && (
        <div
          className="absolute z-20 w-full mt-1 bg-base-200 border border-base-300 rounded-box max-h-56 overflow-auto shadow-lg"
          onScroll={handleScroll}
        >
          <ul className="menu menu-sm w-full p-0">
            <li>
              <a
                onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
                className={highlighted === 0 ? 'active' : ''}
              >
                No arcade (none)
              </a>
            </li>

            {filtered.slice(0, visibleCount).map((arcade, idx) => (
              <li key={arcade._id || arcade.name}>
                <a
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(arcade); }}
                  onMouseEnter={() => setHighlighted(idx + 1)}
                  className={highlighted === idx + 1 ? 'active' : ''}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{arcade.name}</span>
                    {arcade.location && <span className="text-xs opacity-60">{arcade.location}</span>}
                  </div>
                </a>
              </li>
            ))}

            {visibleCount < filtered.length && (
              <li className="disabled">
                <a>Scroll to load more...</a>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ArcadeSelect;
