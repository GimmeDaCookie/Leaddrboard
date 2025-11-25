import React from 'react';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import api from '../axios';

const DifficultyBadge = ({ difficultyName, difficultyScore }) => {
  const colors = {
    'Beginner': 'badge-info',
    'Basic': 'badge-warning',
    'Difficult': 'badge-error',
    'Expert': 'badge-success',
    'Challenge': 'badge-primary'
  };
  const colorClass = colors[difficultyName] || 'badge-ghost';

  return (
    <span className={`badge ${colorClass} badge-sm font-semibold`}>
      {difficultyName} {difficultyScore ? difficultyScore : ''}
    </span>
  );
};

const calculateGrade = (score) => {
  if (score >= 990000) return 'AAA';
  if (score >= 950000) return 'AA+';
  if (score >= 900000) return 'AA';
  if (score >= 890000) return 'AA-';
  if (score >= 850000) return 'A+';
  if (score >= 800000) return 'A';
  if (score >= 790000) return 'A-';
  if (score >= 750000) return 'B+';
  if (score >= 700000) return 'B';
  if (score >= 690000) return 'B-';
  if (score >= 650000) return 'C+';
  if (score >= 600000) return 'C';
  if (score >= 590000) return 'C-';
  if (score >= 550000) return 'D+';
  return 'D';
};

const getGradeColor = (grade) => {
  // A ranks are yellow
  if (grade.startsWith('A')) return 'text-warning';
  // B ranks are blue
  if (grade.startsWith('B')) return 'text-info';
  // C ranks are purple
  if (grade.startsWith('C')) return 'text-secondary';
  // D ranks are red
  if (grade.startsWith('D')) return 'text-error';
  return 'text-base-content';
};

const ScoreList = ({ scores, variant = 'recent', showPagination = false, currentPage = 1, totalPages = 1, onPageChange, onScoreDeleted }) => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDelete = async (scoreId) => {
    if (window.confirm('Are you sure you want to delete this score? This action cannot be undone.')) {
      try {
        await api.delete(`/scores/${scoreId}`);
        if (onScoreDeleted) {
          onScoreDeleted(scoreId);
        } else {
          // Fallback if no callback provided: reload page
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to delete score:', error);
        alert('Failed to delete score');
      }
    }
  };

  if (!scores || scores.length === 0) {
    return (
      <div className="p-8 text-center text-base-content/50">
        <div className="text-lg mb-2">No scores found</div>
        <p className="text-sm">
          {variant === 'song' ? "Be the first to submit a score!" : "No scores logged yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-base-300">
        {scores.map((score, index) => {
          const rank = index + 1 + (currentPage - 1) * 15;

          let rankClass = "text-base-content/50 font-mono";
          if (rank === 1) rankClass = "text-warning font-bold";
          if (rank === 2) rankClass = "text-base-content/80 font-bold";
          if (rank === 3) rankClass = "text-error font-bold";

          return (
            <li key={score._id || index} className="p-4 hover:bg-base-200 transition group flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {variant === 'song' && (
                  <div className={`w-8 text-center flex-shrink-0 ${rankClass}`}>
                    #{rank}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div 
                    className={`font-bold text-lg text-base-content truncate ${variant !== 'song' ? 'group-hover:text-primary transition-colors cursor-pointer' : ''}`}
                    onClick={() => {
                      if (variant !== 'song' && score.song?.title) {
                         navigate(`/song/${score.song.title}?difficulty=${encodeURIComponent(score.difficultyName)}`);
                      }
                    }}
                  >
                    {variant === 'song' 
                      ? (score.user?.username || 'Unknown User') 
                      : (score.song?.title || "Unknown song")
                    }
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-base-content/70 mt-0.5 flex-wrap">
                    {variant === 'recent' && (
                      <>
                        <span 
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (score.user?.username) navigate(`/profile/${score.user.username}`);
                          }}
                        >
                          {score.user?.username || 'Unknown'}
                        </span>
                        <span>•</span>
                        <DifficultyBadge difficultyName={score.difficultyName} difficultyScore={score.difficultyScore} />
                      </>
                    )}

                    {variant === 'user' && (
                      <DifficultyBadge difficultyName={score.difficultyName} difficultyScore={score.difficultyScore} />
                    )}

                    {variant === 'song' && (
                       <span className="text-xs text-base-content/50">{new Date(score.dateAchieved).toLocaleDateString()}</span>
                    )}
                  </div>

                  {score.arcade?.name && (
                    <div className="mt-1">
                      <span className="badge badge-ghost badge-xs">
                        {score.arcade.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end">
                <div className="text-xl font-mono font-bold text-primary tracking-tight">
                  {score.rawScore.toLocaleString()}
                </div>
                <div className={`text-sm font-bold ${getGradeColor(calculateGrade(score.rawScore))}`}>
                  {calculateGrade(score.rawScore)}
                </div>
                <div className="text-xs text-base-content/50 mt-0.5">
                  {new Date(score.dateAchieved).toLocaleDateString()}
                </div>
                
                {currentUser && (score.user?._id === currentUser._id || score.user === currentUser._id) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(score._id);
                    }}
                    className="btn btn-ghost btn-xs text-error mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Score"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {showPagination && totalPages > 1 && (
        <div className="p-4 border-t border-base-300 flex justify-center">
          <div className="join">
            <button 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="join-item btn btn-sm"
            >
              «
            </button>
            <button className="join-item btn btn-sm no-animation">
              Page {currentPage} of {totalPages}
            </button>
            <button 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="join-item btn btn-sm"
            >
              »
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ScoreList;
