import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Package, CheckCircle, Users, MapPin,
  Sparkles, ShieldCheck, UserCheck, ArrowUpRight, SearchCheck
} from 'lucide-react';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';

const HOW_IT_WORKS = [
  {
    step: '01',
    badge: 'REPORT',
    title: 'Catalog with Precision',
    description: 'Submit photographic evidence, precise campus location, and private custody traits only the rightful owner can verify.',
  },
  {
    step: '02',
    badge: 'DISCOVER',
    title: 'Smart Contextual Matching',
    description: 'Our heuristic engine cross-correlates lost and found registries in real-time by timeline, category, and geo-proximity.',
  },
  {
    step: '03',
    badge: 'RECONNECT',
    title: 'Two-Level Custody Release',
    description: 'Claims require finder validation and administrative verification before a secure campus handover is finalized.',
  },
];

const STATS = [
  { label: 'Verified Reports', value: '3,847', icon: Package, detail: '+12% this week' },
  { label: 'Reunited Possessions', value: '1,691', icon: CheckCircle, detail: '94% resolution rate' },
  { label: 'Campus Members', value: '1,284', icon: Users, detail: 'Active students & staff' },
  { label: 'Monitored Campus Hubs', value: '14', icon: MapPin, detail: 'DSCE campus network' },
];

export default function LandingPage() {
  const { items } = useItems();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const recentItems = items
    .filter((item) => activeTab === 'all' || item.type === activeTab)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Editorial Hero Section */}
      <section className="relative pt-6 md:pt-12 overflow-hidden">
        {/* Subtle architectural grid pattern background */}
        <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #101D36 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#DCE5EF] shadow-xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-[#101D36] tracking-tight">Verified Campus Lost &amp; Found Portal</span>
                <span className="text-xs text-[#8999AE]">&bull;</span>
                <span className="text-xs text-[#8999AE]">1,691 Possessions Reunited</span>
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#101D36] leading-[1.08]">
                  Lost something? <br />
                  <span className="italic font-normal text-[#172944]">Let's bring it back.</span>
                </h1>
                <p className="text-base sm:text-lg text-[#101D36]/70 max-w-xl font-normal leading-relaxed">
                  A high-integrity community registry and matching engine. Report misplaced belongings, register found possessions, and execute two-level authenticated claim handovers.
                </p>
              </div>

              {/* Glass Search Bar */}
              <div className="space-y-3 max-w-xl">
                <form onSubmit={handleSearch} className="relative">
                  <div className="glass-panel p-2 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                    <div className="pl-3 text-[#8999AE]">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search smartwatches, keys, IDs, backpacks..."
                      className="w-full bg-transparent px-2 py-2.5 text-sm sm:text-base text-[#101D36] placeholder-[#8999AE] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-[#101D36] text-[#F7F5EF] text-sm font-semibold hover:bg-[#172944] active:scale-[0.98] transition shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      Find Item
                    </button>
                  </div>
                </form>

                {/* Compact Category Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#8999AE] shrink-0 mr-1">
                    Categories:
                  </span>
                  {[
                    { label: 'Electronics', value: 'Electronics' },
                    { label: 'Accessories', value: 'Clothing & Accessories' },
                    { label: 'Documents', value: 'Documents & ID' },
                    { label: 'Bags & Wallets', value: 'Bags & Wallets' },
                    { label: 'Keys', value: 'Keys' },
                    { label: 'Other', value: 'Other' },
                  ].map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => navigate(`/browse?category=${encodeURIComponent(cat.value)}`)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 hover:bg-[#101D36] text-[#101D36] hover:text-[#F7F5EF] border border-[#DCE5EF] hover:border-[#101D36] transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual Distinct Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/report?type=lost"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#101D36] text-white text-sm font-semibold hover:bg-[#172944] transition-all shadow-md active:scale-[0.98]"
                >
                  <span>Report Lost Item</span>
                  <ArrowRight className="w-4 h-4 text-[#DCE5EF]" />
                </Link>
                <Link
                  to="/report?type=found"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#101D36] border border-[#DCE5EF] text-sm font-semibold hover:bg-[#F7F5EF] hover:border-[#101D36]/20 transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>Report Found Item</span>
                  <ArrowUpRight className="w-4 h-4 text-[#8999AE]" />
                </Link>
                <Link
                  to="/matches"
                  className="inline-flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold text-[#8999AE] hover:text-[#101D36] transition"
                >
                  <Sparkles className="w-4 h-4 text-[#101D36]" />
                  <span>Explore Smart Matches</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Sophisticated Visual Composition */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Layered Decorative Backdrop */}
                <div className="absolute -inset-2 rounded-3xl bg-linear-to-tr from-[#DCE5EF] to-white/20 blur-xl opacity-70 -z-10" />

                {/* Primary Curated Card */}
                <div className="rounded-2xl overflow-hidden bg-white border border-[#101D36]/10 shadow-2xl relative">
                  <div className="relative h-72 overflow-hidden bg-[#101D36]">
                    <img
                      src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80"
                      alt="Smartwatch in custody"
                      className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#101D36] via-[#101D36]/20 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500 text-white shadow-xs">
                        FOUND IN AUDITORIUM
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-mono uppercase tracking-widest text-[#DCE5EF]/80">Electronics &bull; DSCE Main Auditorium</p>
                      <h3 className="font-serif text-xl font-bold">Space Gray Apple Watch Series 8</h3>
                    </div>
                  </div>

                  <div className="p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#8999AE] border-b border-gray-100 pb-3">
                      <span>Logged: 2 hours ago</span>
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> In Safe Keeping
                      </span>
                    </div>

                    {/* Interactive verification flow preview */}
                    <div className="p-3.5 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#101D36] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#101D36]" />
                          Two-Level Release Required
                        </span>
                        <span className="text-[10px] font-mono text-[#8999AE]">STEP 1 OF 2</span>
                      </div>
                      <p className="text-[11px] text-[#8999AE] leading-relaxed">
                        To claim, supply serial number or lockscreen pattern. Finder and admin approval required prior to pickup.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Glass Badges */}
                <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#101D36]/10 shadow-xl hidden sm:flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#101D36] text-[#DCE5EF] flex items-center justify-center">
                    <SearchCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#101D36]">94% Resolution</p>
                    <p className="text-[11px] text-[#8999AE]">Claims matched via AI heuristics</p>
                  </div>
                </div>

                <div className="absolute -top-6 -right-4 bg-white/95 backdrop-blur-md py-2.5 px-4 rounded-xl border border-[#101D36]/10 shadow-lg hidden sm:flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-[#101D36]">Zero Unverified Handouts</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Editorial Statistics Ribbon */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#101D36]/10 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/60">
            {STATS.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`text-left ${idx > 0 ? 'sm:pl-8' : ''} ${idx > 0 && idx % 2 === 0 ? 'pt-4 sm:pt-0' : ''}`}>
                  <div className="flex items-center gap-2 text-[#8999AE] mb-2">
                    <Icon className="w-4 h-4 text-[#101D36]" />
                    <span className="text-xs uppercase tracking-wider font-mono font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36]">{stat.value}</p>
                  </div>
                  <p className="text-[11px] text-[#8999AE] mt-1 font-mono">{stat.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Curated Marketplace Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#101D36]/10">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest font-mono text-[#8999AE]">Real-Time Registry</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36]">Recently Reported Items</h2>
            <p className="text-sm text-[#8999AE] max-w-xl">
              Browse recently cataloged lost belongings and discovered property across Dayananda Sagar College of Engineering.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-xs self-start sm:self-auto">
            {['all', 'lost', 'found'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#101D36] text-[#F7F5EF] shadow-xs'
                    : 'text-[#8999AE] hover:text-[#101D36]'
                }`}
              >
                {tab === 'all' ? 'All Items' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-white border border-[#101D36]/15 text-[#101D36] hover:bg-[#F7F5EF] hover:border-[#101D36]/30 transition shadow-xs"
          >
            <span>Explore All {items.length} Active Listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-[#101D36] text-[#F7F5EF] rounded-3xl p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl">
          {/* Subtle geometric background motif */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-[#172944] blur-3xl opacity-50 pointer-events-none" />

          <div className="relative max-w-2xl mb-12">
            <span className="text-xs uppercase tracking-widest font-mono text-[#DCE5EF]/70">The Protocol</span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
              Engineered for custody, certainty, and speed.
            </h2>
            <p className="text-sm sm:text-base text-[#8999AE] leading-relaxed">
              We replaced informal social media group chats with an auditable custody chain featuring photographic verification and administrative oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="bg-[#172944]/80 border border-[#2A3E5C] rounded-2xl p-6 sm:p-7 space-y-4 hover:border-[#DCE5EF]/40 transition group">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-3xl font-bold text-[#DCE5EF] group-hover:text-white transition">
                    {step.step}
                  </span>
                  <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded bg-[#101D36] text-[#8999AE] border border-[#2A3E5C]">
                    {step.badge}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white pt-2">{step.title}</h3>
                <p className="text-xs sm:text-sm text-[#8999AE] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Verification Pillar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl p-8 md:p-12 border border-[#101D36]/10 shadow-sm">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE5EF]/60 text-[#101D36] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#101D36]" />
              <span>Two-Level Claim Security Protocol</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#101D36] leading-tight">
              Why our two-level approval guarantees safe returns.
            </h2>
            <p className="text-sm sm:text-base text-[#8999AE] leading-relaxed">
              Anyone can claim an item online, but on FindIt, high-value possessions require proof of ownership. Claimants provide hidden details (such as wallpaper descriptions, engraved serials, or private bag contents).
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#101D36]">Level 1: Finder Validation</h4>
                  <p className="text-xs text-[#8999AE]">The person who physically holds the item verifies the claimant's private descriptors.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-[#101D36] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#101D36]">Level 2: Campus Administrator Sign-Off</h4>
                  <p className="text-xs text-[#8999AE]">DSCE department custody leads review disputes and confirm item release documentation.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-4">
              <h4 className="font-serif text-lg font-bold text-[#101D36]">Security in Numbers</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-[#8999AE]">Fraudulent Claims Prevented</span>
                  <span className="font-mono font-bold text-[#101D36]">100%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-[#8999AE]">Average Time to Reunification</span>
                  <span className="font-mono font-bold text-[#101D36]">4.2 Hours</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8999AE]">Handover Confirmation Rate</span>
                  <span className="font-mono font-bold text-emerald-700">99.8%</span>
                </div>
              </div>
              <Link
                to="/register"
                className="w-full mt-4 py-3 rounded-xl bg-[#101D36] text-[#F7F5EF] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#172944] transition"
              >
                Join the DSCE Lost &amp; Found Network
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Newsletter / Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-3xl p-8 sm:p-12 text-center bg-linear-to-b from-white to-[#F7F5EF] border border-[#101D36]/10 shadow-sm space-y-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36]">
            Ready to reunite with your belongings?
          </h2>
          <p className="text-sm sm:text-base text-[#8999AE] max-w-xl mx-auto leading-relaxed">
            Report a lost item within seconds or browse recent found items across campus departments.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report"
              className="px-6 py-3.5 rounded-xl bg-[#101D36] text-white text-sm font-semibold hover:bg-[#172944] transition shadow-md"
            >
              Report an Item Now
            </Link>
            <Link
              to="/browse"
              className="px-6 py-3.5 rounded-xl bg-white border border-[#101D36]/20 text-[#101D36] text-sm font-semibold hover:bg-gray-50 transition"
            >
              Browse Public Listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
