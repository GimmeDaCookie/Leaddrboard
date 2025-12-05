import React, { useState, useEffect } from 'react';
import axios from '../axios';
import { ArrowLeftIcon, CameraIcon } from 'lucide-react';
import { Link } from 'react-router';
import SongSelect from '../components/SongSelect';
import { useLocation } from 'react-router';
import ArcadeSelect from '../components/ArcadeSelect';

function AddScorePage() {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedArcade, setSelectedArcade] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [difficulties, setDifficulties] = useState([]);
  const [hasParams, setHasParams] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const location = useLocation();

  // Prefill song if ?song=... query param provided
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const songParam = params.get('song');
    if (songParam) {
      setHasParams(true);
      (async () => {
        try {
          const resp = await axios.get(`/songs/${encodeURIComponent(songParam)}`);
          const s = resp.data;
          setSelectedSong(s);
          setDifficulties(s && s.difficulties ? s.difficulties : []);
        } catch (err) {
          // ignore if not found
          console.warn('prefill song not found', songParam);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSongSelect = (s) => {
    setSelectedSong(s);
    setDifficulties(s && s.difficulties ? s.difficulties : []);
    setDifficulty('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const { data } = await axios.post('/scores/extract-from-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      let autoFilled = [];

      if (data.song) {
        setSelectedSong(data.song);
        setDifficulties(data.song.difficulties || []);
        autoFilled.push('Song');
      }

      if (data.difficulty) {
        setDifficulty(data.difficulty);
        autoFilled.push('Difficulty');
      }

      if (data.score) {
        setScore(data.score.toString());
        autoFilled.push('Score');
      }
      
      if (autoFilled.length > 0) {
          alert(`Auto-filled: ${autoFilled.join(', ')}`);
      } else {
          alert('Could not extract data from image. Please fill manually.');
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Failed to extract data from image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    (async () => {
      setLoading(true);
      try {
        if (!selectedSong) {
          alert('Please select a song');
          setLoading(false);
          return;
        }
        if (!difficulty) {
          alert('Please select a difficulty');
          setLoading(false);
          return;
        }

        if (!score.trim()) {
          setScoreError("Score is required");
          setLoading(false);
          return;
        }

        if (/\p{L}/u.test(score)) {
          setScoreError('Score must be a number between 0-1,000,000');
          setLoading(false);
          return;
        }
        const rawScore = Number(score);
        if (Number.isNaN(rawScore)) {
          setScoreError('Score must be a number');
          setLoading(false);
          return;
          // MAKE THIS ACTUALLY CHECK FOR NUMBERS!!!!!!!!!!!!!!!!!!!!
        }
        if (rawScore < 0 || rawScore > 1000000) {
          setScoreError('Score must be between 0 and 1,000,000');
          setLoading(false);
          return;
        }
        setScoreError('');

        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = userData._id;
        if (!userId) {
          alert('You must be logged in to submit a score');
          setLoading(false);
          return;
        }

        let arcadeId = null;
        // selectedArcade will be null if user chose 'No arcade'
        arcadeId = selectedArcade ? selectedArcade._id : null;

        const payload = {
          userId,
          songId: selectedSong._id,
          arcadeId,
          rawScore,
          difficultyName: difficulty,
        };

        const { data } = await axios.post('/scores', payload);
        // success
        setLoading(false);
        setScore('');
        setDifficulty('');
        setSelectedArcade(null);
        alert('Score submitted successfully');
        console.log('created score', data);
      } catch (err) {
        console.error(err);
        setLoading(false);
        alert(err.response?.data?.msg || 'Failed to submit score');
      }
    })();
  };

  return (
    <div className="min-h-screen bg-base-300 text-base-content">
      <div className="max-w-3xl mx-auto px-6 py-10">
      {hasParams ?
        <Link to={selectedSong ? `/song/${selectedSong.title}` : '/home'} className="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent mb-6">
          <ArrowLeftIcon size={16} />
          Back to {selectedSong ? `"${selectedSong.title}"` : 'Home'}
        </Link>
        :
        <Link to="/home" className="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent mb-6">
          <ArrowLeftIcon size={16} />
          Back to home
        </Link>
      }
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-2xl">Add New Score</h2>
              <div className="tooltip tooltip-left" data-tip="Auto-fill from image">
                <label className={`btn btn-circle btn-ghost ${uploadingImage ? 'loading' : ''}`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={uploadingImage}
                  />
                  {!uploadingImage && <CameraIcon size={24} />}
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Song</span>
                </label>
                <SongSelect onSongSelect={handleSongSelect} initialSong={selectedSong} />
                {selectedSong && (
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">Selected: {selectedSong.title}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Arcade (optional)</span>
                </label>
                <ArcadeSelect onArcadeSelect={setSelectedArcade} />
                {selectedArcade === null && (
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">No arcade selected</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Difficulty</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={!selectedSong || difficulties.length === 0}
                >
                  <option value="">{selectedSong ? 'Select difficulty' : 'Select a song first'}</option>
                  {difficulties.map((d, idx) => (
                    <option key={idx} value={d.name}>{d.name} {d.score ? `(${d.score})` : ''}</option>
                  ))}
                </select>
                {selectedSong && difficulties.length === 0 && (
                  <label className="label">
                    <span className="label-text-alt text-error">No difficulty data available for this song.</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Score</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  className={`input input-bordered w-full ${scoreError ? 'input-error' : ''}`}
                  value={score}
                  onChange={(e) => {
                    setScore(e.target.value);
                    if (scoreError) setScoreError('');
                  }}
                  placeholder="Score (0 - 1,000,000)"
                />
                {scoreError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{scoreError}</span>
                  </label>
                )}
              </div>

              <div className="card-actions justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary text-white"
                >
                  {loading ? <span className="loading loading-spinner"></span> : 'Submit Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddScorePage;
