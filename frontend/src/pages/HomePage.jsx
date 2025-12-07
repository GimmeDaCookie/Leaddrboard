import React from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import api from "../axios";
import ScoreList from "../components/ScoreList";

function HomePage() {
  const navigate = useNavigate();
  const [openVersion, setOpenVersion] = React.useState(null);
  const [allSongs, setAllSongs] = React.useState([]);
  const [songsByVersion, setSongsByVersion] = React.useState({});
  const [latestScores, setLatestScores] = React.useState([]);
  const [pageSize, setPageSize] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  
  const mainRef = React.useRef(null);
  const asideRef = React.useRef(null);

  const versions = [
    "DDR",
    "2ndMIX",
    "3rdMIX",
    "4thMIX",
    "5thMIX",
    "DDRMAX",
    "DDRMAX2",
    "EXTREME",
    "SuperNOVA",
    "SuperNOVA2",
    "X",
    "X2",
    "X3 vs. 2ndMIX",
    "DDR 2013",
    "DDR 2014",
    "A",
    "A20",
    "A20 PLUS",
    "A3",
    "WORLD",
  ];

  const versionMapping = {
    DDR: "1st",
    "2ndMIX": "2nd",
    "3rdMIX": "3rd",
    "4thMIX": "4th",
    "5thMIX": "5th",
    "DDR 2013": "2013",
    "DDR 2014": "2014",
    DDRMAX: "MAX",
    DDRMAX2: "MAX2",
    EXTREME: "EXTREME",
    SuperNOVA: "SuperNOVA",
    SuperNOVA2: "SuperNOVA2",
    X: "X",
    X2: "X2",
    "X3 vs. 2ndMIX": "X3",
    A: "A",
    A20: "A20",
    "A20 PLUS": "A20 PLUS",
    A3: "A3",
    WORLD: "WORLD",
  };

  React.useEffect(() => {
    async function fetchSongs() {
      try {
        const response = await api.get("/songs");
        setAllSongs(response.data);
      } catch (error) {
        console.error("Failed to load songs", error);
      }
      setLoading(false);
    }
    fetchSongs();
  }, []);

  React.useEffect(() => {
    async function fetchLatestScores() {
      try {
        const resp = await api.get("/scores");
        const scores = resp.data || [];
        const sorted = scores.sort(
          (a, b) => new Date(b.dateAchieved) - new Date(a.dateAchieved)
        );
        setLatestScores(sorted);
      } catch (err) {
        console.error("Failed to load latest scores", err);
      }
    }
    fetchLatestScores();
    const interval = setInterval(fetchLatestScores, 240_000);
    return () => clearInterval(interval);
  }, []);

  // Calculate page size based on available height in the aside
  React.useEffect(() => {
    function calculatePageSize() {
      if (!mainRef.current) return;
      
      const mainHeight = mainRef.current.offsetHeight;
      // Account for padding, header, and pagination controls
      const reserved = 120; // header + padding + pagination
      const itemHeight = 72; // approximate height per score item
      const availableHeight = mainHeight - reserved;
      const computed = Math.max(3, Math.floor(availableHeight / itemHeight));
      
      setPageSize(computed);
      setCurrentPage(0);
    }

    // Calculate on mount and when content changes
    calculatePageSize();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculatePageSize);
    return () => window.removeEventListener('resize', calculatePageSize);
  }, [allSongs, openVersion, search, loading]);

  React.useEffect(() => {
    if (pageSize <= 0) return;
    const totalPages = Math.max(1, Math.ceil(latestScores.length / pageSize));
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [latestScores, pageSize]);

  function toggleVersion(versionName) {
    if (openVersion === versionName) {
      setOpenVersion(null);
      return;
    }

    setOpenVersion(versionName);

    if (!songsByVersion[versionName]) {
      const mappedVersion = versionMapping[versionName] || versionName;
      const filteredSongs = allSongs.filter(
        (song) => song.series === mappedVersion
      );
      setSongsByVersion((prev) => ({ ...prev, [versionName]: filteredSongs }));
    }
  }

  const filteredSongs = allSongs.filter(
    (song) =>
      song.title &&
      song.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const isSearching = search.trim().length > 0;

  const handleSongClick = (songTitle) => {
    navigate(`/song/${songTitle}`);
  };

  return (
    <div className="bg-base-300 text-base-content min-h-screen p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs..."
          className="input input-bordered w-full md:w-72"
        />
        <div>
          <Link
            to="/addScore"
            className="btn btn-primary text-white"
          >
            Submit Score
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        <main ref={mainRef} className="w-full lg:flex-1 space-y-3 lg:max-w-3xl">
          {loading ? (
            <div className="loading loading-spinner loading-lg"></div>
          ) : isSearching ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-4">
                <h3 className="font-bold text-lg">Searching: "{search}"</h3>
                <ul className="menu bg-base-100 w-full rounded-box">
                  {filteredSongs.length > 0 ? (
                    filteredSongs.map((song) => (
                      <li key={song._id}>
                        <a onClick={() => handleSongClick(song.title)} className="flex justify-between">
                          <span>{song.title}</span>
                          <span className="badge badge-ghost">{song.bpm_range} BPM</span>
                        </a>
                      </li>
                    ))
                  ) : (
                    <li><span className="text-gray-500">No songs found.</span></li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            versions.toReversed().map((v) => (
              <div 
                key={v} 
                className={`collapse collapse-arrow bg-base-100 shadow-md ${openVersion === v ? 'collapse-open' : 'collapse-close'}`}
              >
                <div 
                  className="collapse-title text-xl font-medium cursor-pointer"
                  onClick={() => toggleVersion(v)}
                >
                  {v}
                </div>
                <div className="collapse-content"> 
                  <ul className="menu bg-base-100 w-full rounded-box">
                    {songsByVersion[v] && songsByVersion[v].length > 0 ? (
                      songsByVersion[v].map((song) => (
                        <li key={song._id}>
                          <a onClick={() => handleSongClick(song.title)} className="flex justify-between">
                            <span>{song.title}</span>
                            <span className="badge badge-ghost">{song.bpm_range} BPM</span>
                          </a>
                        </li>
                      ))
                    ) : (
                      <li><span className="text-gray-500">No songs found for this version.</span></li>
                    )}
                  </ul>
                </div>
              </div>
            ))
          )}
        </main>

        <aside ref={asideRef} className="w-full lg:w-1/2 top-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="p-4 border-b border-base-300">
                <h2 className="card-title">Recent Scores</h2>
              </div>
              
              <ScoreList 
                scores={latestScores.slice(currentPage * pageSize, (currentPage + 1) * pageSize)} 
                variant="recent" 
                showPagination={true}
                currentPage={currentPage + 1}
                totalPages={Math.max(1, Math.ceil(latestScores.length / pageSize))}
                onPageChange={(p) => setCurrentPage(p - 1)}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HomePage;