import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import api from '../axios';
import ScoreList from '../components/ScoreList';
import { ArrowLeftIcon } from 'lucide-react';

function SongPage() {
  const [loading, setLoading] = React.useState(true);
  const { songName: songTitle } = useParams();
  const [searchParams] = useSearchParams();
  const [difficulty, setDifficulty] = useState('Basic');
  const [song, setSong] = useState(null);
  const [scores, setScores] = React.useState([]);

  useEffect(() => {
      async function fetchSongs() {
        try {
          const response = await api.get(`/songs/${encodeURIComponent(songTitle)}`);
          const s = response.data;
          setSong(s);
          
          // Check for difficulty in query params first
          const difficultyParam = searchParams.get('difficulty');
          
          if (difficultyParam) {
            setDifficulty(difficultyParam);
          } else if (s && Array.isArray(s.difficulties) && s.difficulties.length > 0) {
            // default difficulty to first difficulty from DB when available
            setDifficulty(s.difficulties[0].name);
          }
        } catch (error) {
          console.error("Failed to load song", error);
        }
        setLoading(false);
      }
      fetchSongs();
    }, [songTitle, searchParams]);

    useEffect(() => {
      if (song && song._id) {
        async function fetchScores() {
          try {
            const response = await api.get(`/scores/${song._id}`);
            setScores(response.data);
          } catch (error) {
            console.error("Failed to load scores", error);
          }
        }
        fetchScores();
      }
    }, [song])

  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-base-300 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Song not found</h2>
        <Link to="/home" className="btn btn-primary">Back to Home</Link>
      </div>
    );
  }

  const difficulties = song.difficulties || [];

  return (
    <div className="bg-base-300 text-base-content min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/home" className="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent">
            <ArrowLeftIcon size={16} />
            Back to Home
          </Link>
        </div>

        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{song.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-lg badge-neutral">{song.series}</span>
                  <span className="badge badge-lg badge-ghost">{song.bpm_range} BPM</span>
                </div>
              </div>
              <Link to={`/addScore?song=${encodeURIComponent(song.title)}`} className="btn btn-primary text-white">
                Submit Score
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-0">
            <div className="p-4 border-b border-base-300">
              <div role="tablist" className="tabs tabs-boxed bg-base-200">
                {difficulties.map((d) => (
                  <a 
                    key={d.name} 
                    role="tab" 
                    className={`tab ${difficulty === d.name ? 'tab-active' : ''}`}
                    onClick={() => handleDifficultyChange(d.name)}
                  >
                    {d.name} <span className="ml-1 opacity-70 text-xs">({d.score})</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="p-0">
              <ScoreList 
                scores={scores.filter(score => score.difficultyName === difficulty)}
                variant="song"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SongPage;
