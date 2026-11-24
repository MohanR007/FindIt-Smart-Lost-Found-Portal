import { useState, useMemo, useTransition } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, X, ChevronDown, SlidersHorizontal, Sparkles,
  MapPin, Calendar, RotateCcw, PackageOpen, ArrowUpDown,
  Layers, Check
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';
import { LOCATIONS } from '../data/mockData';

// Primary category pills matching user specification
const QUICK_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Accessories', label: 'Accessories' },
  { id: 'Documents', label: 'Documents' },
  { id: 'Bags & Wallets', label: 'Bags & Wallets' },
  { id: 'Keys', label: 'Keys' },
  { id: 'Other', label: 'Other' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today (Past 24 Hours)' },
  { value: 'week', label: 'Past 7 Days' },
  { value: 'month', label: 'Past 30 Days' },
  { value: 'older', label: 'Older than 30 Days' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az', label: 'Alphabetical (A – Z)' },
  { value: 'za', label: 'Alphabetical (Z – A)' },
];

const PAGE_SIZE = 9;

// Loading Skeleton Card
function ItemCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs animate-pulse flex flex-col h-full">
      <div className="h-52 w-full bg-[#DCE5EF]/40 shrink-0" />
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-5 w-24 bg-[#DCE5EF]/60 rounded-md" />
            <div className="h-4 w-16 bg-[#DCE5EF]/40 rounded-md" />
          </div>
          <div className="h-5 w-3/4 bg-[#DCE5EF]/70 rounded-md" />
          <div className="h-3 w-full bg-[#DCE5EF]/40 rounded-md" />
          <div className="h-3 w-4/5 bg-[#DCE5EF]/30 rounded-md" />
        </div>
        <div className="pt-3 border-t border-[#E5E7EB] flex justify-between items-center">
          <div className="h-4 w-28 bg-[#DCE5EF]/40 rounded-md" />
          <div className="h-4 w-14 bg-[#DCE5EF]/50 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const { items } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active filter values from URL search params for deep linking & state sharing
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || ''; // 'lost' | 'found' | ''
  const category = searchParams.get('category') || '';
  const locationFilter = searchParams.get('location') || '';
  const dateFilter = searchParams.get('date') || '';
  const sortBy = searchParams.get('sort') || 'newest';

  // Pagination / Load More state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [referenceTime] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  // Sync filter updates to URL
  function updateFilters(updates) {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val && val !== 'all' && !(key === 'sort' && val === 'newest')) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
    setVisibleCount(PAGE_SIZE);
  }

  function handleTypeChange(val) {
    startTransition(() => {
      updateFilters({ type: val === 'all' ? '' : val });
    });
  }

  function handleCategoryChange(val) {
    startTransition(() => {
      updateFilters({ category: val === 'all' ? '' : val });
    });
  }

  function handleLocationChange(val) {
    startTransition(() => {
      updateFilters({ location: val === 'all' ? '' : val });
    });
  }

  function handleDateChange(val) {
    startTransition(() => {
      updateFilters({ date: val === 'all' ? '' : val });
    });
  }

  function handleSortChange(val) {
    startTransition(() => {
      updateFilters({ sort: val });
    });
  }

  function handleSearchChange(val) {
    startTransition(() => {
      updateFilters({ q: val });
    });
  }

  function clearAllFilters() {
    startTransition(() => {
      setSearchParams({});
      setVisibleCount(PAGE_SIZE);
    });
  }

  // Derive unique location list from both current items and pre-configured campus locations
  const availableLocations = useMemo(() => {
    const itemLocations = items.map((i) => i.location).filter(Boolean);
    const combined = Array.from(new Set([...itemLocations, ...LOCATIONS]));
    return combined.sort();
  }, [items]);

  // Combined filtering logic ensuring all filters work together
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Keyword search (Name, Description, Location, and Semantic Tags)
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));

        if (!matchesName && !matchesDesc && !matchesLoc && !matchesTags) {
          return false;
        }
      }

      // 2. Type filter (Lost vs Found)
      if (type && type !== 'all') {
        if (item.type !== type) return false;
      }

      // 3. Category filter
      if (category && category !== 'all') {
        const catLower = category.toLowerCase();
        const itemCatLower = (item.category || '').toLowerCase();

        if (catLower === 'accessories') {
          const isAccessory =
            itemCatLower.includes('accessories') ||
            itemCatLower.includes('clothing') ||
            itemCatLower.includes('jewelry');
          if (!isAccessory) return false;
        } else if (catLower === 'documents') {
          const isDocument = itemCatLower.includes('document');
          if (!isDocument) return false;
        } else if (catLower === 'bags & wallets' || catLower === 'bags' || catLower === 'wallets') {
          const isBag = itemCatLower.includes('bag') || itemCatLower.includes('wallet');
          if (!isBag) return false;
        } else if (catLower === 'other') {
          const mainCategories = [
            'electronics',
            'clothing & accessories',
            'bags & wallets',
            'keys',
            'documents & id',
            'jewelry',
          ];
          const isOther = itemCatLower === 'other' || !mainCategories.includes(itemCatLower);
          if (!isOther) return false;
        } else {
          const matches =
            itemCatLower === catLower ||
            itemCatLower.includes(catLower) ||
            catLower.includes(itemCatLower);
          if (!matches) return false;
        }
      }

      // 4. Location filter
      if (locationFilter && locationFilter !== 'all') {
        if (
          item.location !== locationFilter &&
          !item.location?.toLowerCase().includes(locationFilter.toLowerCase())
        ) {
          return false;
        }
      }

      // 5. Date reported filter
      if (dateFilter && dateFilter !== 'all') {
        const itemDate = new Date(item.date || item.createdAt);
        if (!isNaN(itemDate.getTime())) {
          const diffMs = referenceTime - itemDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (dateFilter === 'today' && diffDays > 1.5) return false;
          if (dateFilter === 'week' && diffDays > 7.5) return false;
          if (dateFilter === 'month' && diffDays > 30.5) return false;
          if (dateFilter === 'older' && diffDays <= 30.5) return false;
        }
      }

      return true;
    });
  }, [items, query, type, category, locationFilter, dateFilter, referenceTime]);

  // Sorting logic (Newest, Oldest, Alphabetical A-Z, Z-A)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
      }
      if (sortBy === 'az') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'za') {
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      }
      return 0;
    });
  }, [filteredItems, sortBy]);

  // Paginated slice
  const displayedItems = sortedItems.slice(0, visibleCount);

  // Overall counts for badges
  const totalCount = items.length;
  const lostCount = items.filter((i) => i.type === 'lost').length;
  const foundCount = items.filter((i) => i.type === 'found').length;

  const hasActiveFilters = Boolean(
    query ||
    (type && type !== 'all') ||
    (category && category !== 'all') ||
    (locationFilter && locationFilter !== 'all') ||
    (dateFilter && dateFilter !== 'all') ||
    sortBy !== 'newest'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* 1. Refined Editorial Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#101D36]/10">
        <div>
          <span className="text-xs uppercase tracking-widest font-mono text-[#8999AE] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#101D36]" /> DSCE Campus Registry &bull; Public Archive
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#101D36] tracking-tight mt-1">
            Explore Lost &amp; Found
          </h1>
          <p className="text-sm sm:text-base text-[#8999AE] mt-2 max-w-2xl leading-relaxed">
            Discover verified lost possessions and reported findings across Dayananda Sagar College of Engineering. Search by campus landmark, category, or keyword to match and recover items.
          </p>
        </div>

        {/* Primary Type Segmentation Control (All Items / Lost / Found) */}
        <div className="inline-flex p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs self-start md:self-auto shrink-0">
          {[
            { value: '', label: 'All Items', count: totalCount },
            { value: 'lost', label: 'Lost Items', count: lostCount },
            { value: 'found', label: 'Found Items', count: foundCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTypeChange(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
                type === tab.value
                  ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                  : 'text-[#8999AE] hover:text-[#101D36]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  type === tab.value
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F7F5EF] text-[#8999AE]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Filter & Search Panel */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 border border-[#101D36]/10">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8999AE]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by item title, description, brand, or campus landmark (e.g. iPhone, North Face, Central Library)..."
            className="w-full pl-11 pr-10 py-3.5 text-sm bg-white border border-[#E5E7EB] rounded-2xl text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8999AE] hover:text-[#101D36] p-1 rounded-md hover:bg-gray-100 transition cursor-pointer"
              aria-label="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Category Pills Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8999AE] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#101D36]" /> Filter by Category
            </span>
            {category && (
              <button
                onClick={() => handleCategoryChange('all')}
                className="text-[11px] font-medium text-[#8999AE] hover:text-[#101D36] cursor-pointer"
              >
                Reset category
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin text-xs">
            {QUICK_CATEGORIES.map((cat) => {
              const isSelected =
                (cat.id === 'all' && !category) ||
                category.toLowerCase() === cat.id.toLowerCase();

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(isSelected && cat.id !== 'all' ? 'all' : cat.id)}
                  className={`px-3.5 py-1.5 rounded-full shrink-0 transition text-xs font-medium cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs scale-102 font-semibold'
                      : 'bg-white border border-[#E5E7EB] text-[#5A6A80] hover:text-[#101D36] hover:border-[#8999AE]'
                  }`}
                >
                  {isSelected && cat.id !== 'all' && <Check className="w-3 h-3 text-[#DCE5EF]" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Dropdown Filters Row (Location, Date, Sort, Clear) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
          {/* Location Filter Dropdown */}
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#8999AE] mb-1">
              Campus Location
            </label>
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="appearance-none w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-white border border-[#E5E7EB] rounded-xl text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs cursor-pointer truncate"
              >
                <option value="">All Locations</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
            </div>
          </div>

          {/* Date Reported Filter Dropdown */}
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#8999AE] mb-1">
              Date Reported
            </label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => handleDateChange(e.target.value)}
                className="appearance-none w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-white border border-[#E5E7EB] rounded-xl text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs cursor-pointer"
              >
                {DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#8999AE] mb-1">
              Sort Order
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="appearance-none w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-white border border-[#E5E7EB] rounded-xl text-[#101D36] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE] pointer-events-none" />
            </div>
          </div>

          {/* Clear Filters Action Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
                hasActiveFilters
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                  : 'bg-gray-100 text-[#8999AE] border border-[#E5E7EB] opacity-60 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        </div>

        {/* Active Filters Badges Indicator */}
        {hasActiveFilters && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-[#8999AE] mr-1">Active Criteria:</span>

            {query && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px]">
                Search: &ldquo;{query}&rdquo;
                <button
                  onClick={() => handleSearchChange('')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px]">
                Type: {type === 'lost' ? 'Lost Property' : 'Found Property'}
                <button
                  onClick={() => handleTypeChange('all')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px]">
                Category: {category}
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {locationFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px] max-w-[200px] truncate">
                Locus: {locationFilter}
                <button
                  onClick={() => handleLocationChange('all')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px]">
                Date: {DATE_OPTIONS.find((d) => d.value === dateFilter)?.label}
                <button
                  onClick={() => handleDateChange('all')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101D36]/5 text-[#101D36] border border-[#101D36]/10 font-mono text-[11px]">
                Sort: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <button
                  onClick={() => handleSortChange('newest')}
                  className="hover:text-rose-600 transition ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-[#101D36] hover:underline ml-auto cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* 3. Results Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8999AE]">
        <p className="font-mono">
          Showing <span className="font-bold text-[#101D36]">{sortedItems.length}</span>{' '}
          {sortedItems.length === 1 ? 'item' : 'items'} in current view
          {query && <span> for &ldquo;{query}&rdquo;</span>}
          {category && <span> &bull; Category: {category}</span>}
          {locationFilter && <span> &bull; Location: {locationFilter}</span>}
        </p>

        <span className="text-[11px] font-mono text-[#8999AE] hidden sm:inline">
          {displayedItems.length} of {sortedItems.length} displayed
        </span>
      </div>

      {/* 4. Responsive Item Grid: 3 cols desktop, 2 cols tablet, 1-2 cols mobile */}
      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedItems.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination / Load More Control */}
          {sortedItems.length > visibleCount ? (
            <div className="pt-8 text-center space-y-3">
              <p className="text-xs font-mono text-[#8999AE]">
                Viewing {displayedItems.length} of {sortedItems.length} listings
              </p>

              <div className="max-w-xs mx-auto bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#101D36] h-full transition-all duration-300"
                  style={{
                    width: `${Math.round((displayedItems.length / sortedItems.length) * 100)}%`,
                  }}
                />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-3 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold uppercase tracking-wider hover:bg-[#172944] transition shadow-sm cursor-pointer"
                >
                  Load More Items (+{Math.min(PAGE_SIZE, sortedItems.length - visibleCount)})
                </button>
                <button
                  onClick={() => setVisibleCount(sortedItems.length)}
                  className="px-5 py-3 rounded-xl bg-white border border-[#E5E7EB] text-[#101D36] text-xs font-semibold uppercase tracking-wider hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                >
                  Show All ({sortedItems.length})
                </button>
              </div>
            </div>
          ) : sortedItems.length > PAGE_SIZE ? (
            <div className="pt-6 text-center text-xs font-mono text-[#8999AE]">
              &bull; You have viewed all {sortedItems.length} matching catalog listings &bull;
            </div>
          ) : null}
        </div>
      ) : (
        /* 5. Polished Empty State */
        <div className="glass-card text-center py-20 px-6 rounded-3xl border border-[#101D36]/10 max-w-xl mx-auto shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto shadow-inner">
            <PackageOpen className="w-8 h-8 opacity-80" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#101D36]">
              No Matching Items Found
            </h3>
            <p className="text-sm text-[#8999AE] max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find any lost or found records corresponding to your query. Try broadening your keywords, selecting different categories, or clearing all constraints.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#101D36] bg-white border border-[#101D36]/20 hover:bg-gray-50 transition cursor-pointer shadow-2xs"
            >
              Clear All Filters
            </button>

            <Link
              to="/report"
              className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] transition flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#DCE5EF]" />
              <span>Report an Item</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
