import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import api from '../axios';
import ScoreList from '../components/ScoreList';
import { User, Settings } from 'lucide-react';

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'score', 'difficulty'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [songFilter, setSongFilter] = useState(''); // Filter by song title
  const pageSize = 15;

  // Difficulty hierarchy for sorting
  const difficultyOrder = {
    'Beginner': 1,
    'Basic': 2,
    'Difficult': 3,
    'Expert': 4,
    'Challenge': 5
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [scoresRes, userRes] = await Promise.all([
          api.get(`/scores/user/${username}`),
          api.get(`/users/${username}`)
        ]);
        setScores(scoresRes.data);
        setUser(userRes.data);
      } catch (error) {
        console.error("Failed to load profile data", error);
      }
      setLoading(false);
    }
    fetchData();
  }, [username]);

  // Filter scores by song if a filter is set
  const filteredScores = songFilter 
    ? scores.filter(score => score.song?.title === songFilter)
    : scores;

  const sortedScores = [...filteredScores].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.dateAchieved) - new Date(b.dateAchieved);
    } else if (sortBy === 'score') {
      comparison = a.rawScore - b.rawScore;
    } else if (sortBy === 'difficulty') {
      const diffA = difficultyOrder[a.difficultyName] || 0;
      const diffB = difficultyOrder[b.difficultyName] || 0;
      comparison = diffA - diffB;
      
      // Secondary sort by difficulty number (score)
      if (comparison === 0) {
        const scoreA = a.difficultyScore || 0;
        const scoreB = b.difficultyScore || 0;
        comparison = scoreA - scoreB;
      }

      // Tertiary sort by raw score
      if (comparison === 0) {
        return b.rawScore - a.rawScore;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedScores.length / pageSize);
  const paginatedScores = sortedScores.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when sorting or filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, songFilter]);

  // Get unique song titles for the filter dropdown
  const uniqueSongs = [...new Set(scores.map(score => score.song?.title).filter(Boolean))].sort();

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (criteria) => {
    if (sortBy !== criteria) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwnProfile = currentUser.username === username;

  return (
    <div className="bg-base-300 text-base-content min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="avatar">
                <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={username} />
                  ) : (
                    <div className="bg-neutral text-neutral-content w-full h-full flex items-center justify-center">
                      <User size={48} />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{username}</h1>
                <div className="text-base-content/70 space-y-1">
                  <div>
                    <span className="font-semibold text-primary">{scores.length}</span> scores logged
                  </div>
                  {user && (
                    <div className="text-sm">
                      Member since {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <Link to="/profile/manage" className="btn btn-outline btn-sm gap-2">
                  <Settings size={16} />
                  Manage Profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
             <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="p-4 border-b border-base-300">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                  <h2 className="card-title text-lg">Score History</h2>
                  
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    value={songFilter}
                    onChange={(e) => setSongFilter(e.target.value)}
                  >
                    <option value="">All Songs ({scores.length})</option>
                    {uniqueSongs.map(song => (
                      <option key={song} value={song}>
                        {song} ({scores.filter(s => s.song?.title === song).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="join">
                  <button 
                    onClick={() => handleSort('date')}
                    className={`btn btn-sm join-item ${sortBy === 'date' ? 'btn-active btn-primary' : ''}`}
                  >
                    Date {getSortIcon('date')}
                  </button>
                  <button 
                    onClick={() => handleSort('score')}
                    className={`btn btn-sm join-item ${sortBy === 'score' ? 'btn-active btn-primary' : ''}`}
                  >
                    Score {getSortIcon('score')}
                  </button>
                  <button 
                    onClick={() => handleSort('difficulty')}
                    className={`btn btn-sm join-item ${sortBy === 'difficulty' ? 'btn-active btn-primary' : ''}`}
                  >
                    Difficulty {getSortIcon('difficulty')}
                  </button>
                </div>
              </div>
              
              <ScoreList 
                scores={paginatedScores} 
                variant="user" 
                showPagination={true}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onScoreDeleted={(deletedId) => {
                  setScores(prev => prev.filter(s => s._id !== deletedId));
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
