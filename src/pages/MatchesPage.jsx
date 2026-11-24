import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MapPin, Calendar, ArrowRight,
  TrendingUp, Info, CheckCircle2, Package,
  Zap, Search, RefreshCw, AlertCircle,
  Loader2, Layers, ArrowUpRight
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { findLiveMatches } from '../utils/matching';
import { CATEGORIES } from '../data/mockData';

function MatchScoreRing({ score }) {
  const color = score >= 85 ? '#059669' : score >= 65 ? '#101D36' : '#d97706';
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle
          cx="32" cy="32" r="26"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${(score / 100) * 163} 163`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-mono font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { items, isLoading, error, refreshItems } = useItems();
  const { currentUser } = useAuth();

  // Filter states
  const [scope, setScope] = useState('all'); // 'all' | 'my'
  const [minConfidence, setMinConfidence] = useState(35); // 35 | 65 | 80
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate live heuristic matches directly from active catalog items
  const allLiveMatches = useMemo(() => {
    return findLiveMatches(items, { minScore: 30 });
  }, [items]);

  // Set of user-reported item IDs for filtering personal correlations
  const userReportIds = useMemo(() => {
    if (!currentUser?.id) return new Set();
    return new Set(
      items
        .filter((i) => i.reportedBy === currentUser.id)
        .map((i) => i.id)
    );
  }, [items, currentUser]);

  const myMatchesCount = useMemo(() => {
    if (userReportIds.size === 0) return 0;
    return allLiveMatches.filter(
      (m) => userReportIds.has(m.lostItemId) || userReportIds.has(m.foundItemId)
    ).length;
  }, [allLiveMatches, userReportIds]);

  // 2. Filter matches based on user selections
  const filteredMatches = useMemo(() => {
    return allLiveMatches.filter((match) => {
      // Scope filter (all vs my reports)
      if (scope === 'my') {
        const isMyLost = userReportIds.has(match.lostItemId);
        const isMyFound = userReportIds.has(match.foundItemId);
        if (!isMyLost && !isMyFound) return false;
      }

      // Confidence threshold filter
      if (match.matchScore < minConfidence) {
        return false;
      }

      // Category filter
      if (categoryFilter) {
        const matchCatLost = match.lostItem?.category === categoryFilter;
        const matchCatFound = match.foundItem?.category === categoryFilter;
        if (!matchCatLost && !matchCatFound) return false;
      }

      // Keyword / location search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const lostName = match.lostItem?.name?.toLowerCase() || '';
        const foundName = match.foundItem?.name?.toLowerCase() || '';
        const lostLoc = match.lostItem?.location?.toLowerCase() || '';
        const foundLoc = match.foundItem?.location?.toLowerCase() || '';
        const lostDesc = match.lostItem?.description?.toLowerCase() || '';
        const foundDesc = match.foundItem?.description?.toLowerCase() || '';

        const hit =
          lostName.includes(q) ||
          foundName.includes(q) ||
          lostLoc.includes(q) ||
          foundLoc.includes(q) ||
          lostDesc.includes(q) ||
          foundDesc.includes(q);

        if (!hit) return false;
      }

      return true;
    });
  }, [allLiveMatches, scope, minConfidence, categoryFilter, searchQuery, userReportIds]);

  // Active items counts for summary metrics
  const activeLostCount = useMemo(
    () => items.filter((i) => i.type === 'lost' && i.status !== 'returned').length,
    [items]
  );
  const activeFoundCount = useMemo(
    () => items.filter((i) => i.type === 'found' && i.status !== 'returned').length,
    [items]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* 1. Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#101D36]/10">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#101D36]" /> Automated Heuristic Correlation
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] mt-1">
            Smart Matches Engine
          </h1>
          <p className="text-sm text-[#8999AE] mt-1.5 leading-relaxed max-w-2xl">
            Real-time algorithmic cross-correlation of active catalog listings based on campus geography, category signatures,
            keyword tokens, and temporal incident proximity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-mono font-bold px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-full text-[#101D36] shadow-2xs">
            {allLiveMatches.length} Correlations Found
          </span>
        </div>
      </div>

      {/* 2. Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Could not synchronize all catalog entries with the server: {error}</span>
          </div>
          <button
            onClick={() => refreshItems()}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 font-semibold text-rose-800 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 3. Transparent Algorithm & Disclaimer Banner */}
      <div className="p-5 bg-white rounded-2xl border border-[#101D36]/10 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#101D36] uppercase tracking-wider">
          <Info className="w-4 h-4 text-[#101D36]" />
          <span>Transparent Weighted Scoring Methodology</span>
        </div>
        <p className="text-xs text-[#8999AE] leading-relaxed">
          Matches are synthesized from five independent parameters: <strong className="text-[#101D36]">Category Similarity (30%)</strong>,{' '}
          <strong className="text-[#101D36]">Title Similarity (25%)</strong>,{' '}
          <strong className="text-[#101D36]">Description &amp; Tags (25%)</strong>,{' '}
          <strong className="text-[#101D36]">Location Coincidence (15%)</strong>, and{' '}
          <strong className="text-[#101D36]">Temporal Proximity (5%)</strong>.
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#8999AE]">
          <span className="px-2 py-0.5 rounded-md bg-[#F7F5EF] border border-[#E5E7EB] text-[#101D36]">
            Catalog: {activeLostCount} Lost vs {activeFoundCount} Found
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
            Algorithmic Suggestions &bull; Not Verified Physical Ownership
          </span>
        </div>
      </div>

      {/* 4. Controls & Filtering Bar */}
      <div className="glass-card rounded-2xl border border-[#101D36]/10 p-4 space-y-4 shadow-xs">
        {/* Scope Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="inline-flex p-1 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB] text-xs">
            <button
              onClick={() => setScope('all')}
              className={`px-4 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                scope === 'all'
                  ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                  : 'text-[#8999AE] hover:text-[#101D36]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Campus Correlations ({allLiveMatches.length})</span>
            </button>
            {currentUser && (
              <button
                onClick={() => setScope('my')}
                className={`px-4 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                  scope === 'my'
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>My Reports Only ({myMatchesCount})</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setMinConfidence(35);
              setCategoryFilter('');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-[#8999AE] hover:text-[#101D36] transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search Keywords */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, keywords, location..."
              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 shadow-2xs"
            />
          </div>

          {/* Confidence Slider / Selector */}
          <div className="relative">
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] font-semibold focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer shadow-2xs"
            >
              <option value={35}>All Confidence (35%+)</option>
              <option value={65}>Strong Matches (65%+)</option>
              <option value={80}>High Confidence (80%+)</option>
            </select>
          </div>

          {/* Category Selector */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-xs bg-white text-[#101D36] font-semibold focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 cursor-pointer shadow-2xs"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Loading State */}
      {isLoading && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center border border-[#101D36]/10 shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#101D36]" />
          </div>
          <p className="font-serif text-lg font-bold text-[#101D36]">Analyzing Catalog Correlations</p>
          <p className="text-xs text-[#8999AE]">Cross-referencing lost and found listings across campus...</p>
        </div>
      )}

      {/* 6. Match Cards List */}
      {!isLoading && (
        <div className="space-y-6">
          {filteredMatches.map((match) => {
            const { lostItem, foundItem } = match;
            const isFoundClaimed = foundItem.status === 'claimed';

            return (
              <div
                key={match.id}
                className="glass-card rounded-3xl border border-[#101D36]/10 shadow-xs p-6 hover:shadow-md transition space-y-5"
              >
                {/* Card Masthead Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#101D36]">#{match.id}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      Algorithmic Correlation
                    </span>
                    {isFoundClaimed && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                        Under Active Review
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-[#8999AE]">
                    Evaluated against live registry
                  </span>
                </div>

                {/* Symmetrical Correlation Inspection Grid */}
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  {/* Lost Item Panel */}
                  <div className="flex-1 min-w-0 p-4 rounded-2xl bg-[#F7F5EF]/60 border border-[#E5E7EB] flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                          Lost Report
                        </span>
                        <span className="text-xs font-mono text-[#8999AE] truncate">{lostItem.category}</span>
                      </div>

                      <div className="flex items-start gap-3">
                        {lostItem.image ? (
                          <img
                            src={lostItem.image}
                            alt={lostItem.name}
                            className="w-14 h-14 rounded-xl object-cover border border-[#E5E7EB] shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 text-[#8999AE]">
                            <Package className="w-6 h-6 opacity-60" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-serif text-base font-bold text-[#101D36] leading-snug line-clamp-2">
                            {lostItem.name}
                          </h3>
                          <p className="text-xs text-[#8999AE] line-clamp-2 mt-1 leading-relaxed">
                            {lostItem.description || 'No additional description provided.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#8999AE] font-mono pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#101D36] shrink-0" />
                          <span className="truncate">{lostItem.location || 'Location unspecified'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#101D36] shrink-0" />
                          <span>{formatDate(lostItem.date)}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/items/${lostItem.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#101D36] hover:text-[#172944] pt-2 border-t border-gray-200/60"
                    >
                      <span>Inspect Lost Report</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Score Ring (Center Anchor) */}
                  <div className="flex flex-col items-center justify-center gap-2 py-3 md:py-0 md:px-4 border-y md:border-y-0 md:border-x border-gray-200/60 shrink-0">
                    <MatchScoreRing score={match.matchScore} />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#8999AE] font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#101D36]" /> Confidence
                    </span>
                    <span className="text-[10px] font-mono text-[#8999AE]">
                      {match.matchScore >= 80 ? 'High Confidence' : match.matchScore >= 65 ? 'Strong Overlap' : 'Plausible Lead'}
                    </span>
                  </div>

                  {/* Found Item Panel */}
                  <div className="flex-1 min-w-0 p-4 rounded-2xl bg-[#F7F5EF]/60 border border-[#E5E7EB] flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                          Found Custody
                        </span>
                        <span className="text-xs font-mono text-[#8999AE] truncate">{foundItem.category}</span>
                      </div>

                      <div className="flex items-start gap-3">
                        {foundItem.image ? (
                          <img
                            src={foundItem.image}
                            alt={foundItem.name}
                            className="w-14 h-14 rounded-xl object-cover border border-[#E5E7EB] shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 text-[#8999AE]">
                            <Package className="w-6 h-6 opacity-60" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-serif text-base font-bold text-[#101D36] leading-snug line-clamp-2">
                            {foundItem.name}
                          </h3>
                          <p className="text-xs text-[#8999AE] line-clamp-2 mt-1 leading-relaxed">
                            {foundItem.description || 'No additional description provided.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#8999AE] font-mono pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#101D36] shrink-0" />
                          <span className="truncate">{foundItem.location || 'Location unspecified'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#101D36] shrink-0" />
                          <span>{formatDate(foundItem.date)}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/items/${foundItem.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#101D36] hover:text-[#172944] pt-2 border-t border-gray-200/60"
                    >
                      <span>Inspect Found Listing</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Match Indicators Pill Grid & Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#8999AE] block font-bold">
                      Leading Correlation Indicators:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#101D36] rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{reason}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <Link
                      to={`/items/${foundItem.id}`}
                      className="px-4 py-2 bg-[#101D36] text-[#F7F5EF] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span>{isFoundClaimed ? 'Inspect Item' : 'File Claim'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Empty / No-Match State */}
      {!isLoading && filteredMatches.length === 0 && (
        <div className="text-center py-20 glass-card rounded-3xl border border-[#101D36]/10 max-w-lg mx-auto p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto shadow-inner">
            <Zap className="w-7 h-7 opacity-70" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#101D36]">
              {scope === 'my' && userReportIds.size === 0
                ? 'No Personal Reports on File'
                : 'No Matching Correlations Found'}
            </h3>
            <p className="text-xs text-[#8999AE] mt-1 leading-relaxed max-w-sm mx-auto">
              {scope === 'my' && userReportIds.size === 0
                ? 'You have not reported any lost or found items yet. Report a lost item to enable automatic heuristic cross-referencing against campus custody registries.'
                : 'No active lost and found reports currently satisfy the selected confidence threshold or filter criteria. New reports are cross-correlated automatically upon submission.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            {scope === 'my' && (
              <button
                type="button"
                onClick={() => setScope('all')}
                className="px-4 py-2 bg-[#101D36] text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition cursor-pointer shadow-xs"
              >
                View All Campus Correlations
              </button>
            )}
            <Link
              to="/report"
              className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#101D36] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-gray-50 transition shadow-2xs"
            >
              Report an Item
            </Link>
            <Link
              to="/browse"
              className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#8999AE] hover:text-[#101D36] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-gray-50 transition shadow-2xs"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
