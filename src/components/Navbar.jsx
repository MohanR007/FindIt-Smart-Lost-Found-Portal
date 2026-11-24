import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Compass, LogOut, LayoutDashboard, Shield, PlusCircle, ArrowRight, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  // Navigation order: Home, Browse, Smart Matches
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Browse', href: '/browse' },
    { label: 'Smart Matches', href: '/matches' },
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    if (href === '/browse') return location.pathname === '/browse';
    if (href === '/matches') return location.pathname === '/matches';
    return location.pathname === href;
  };

  return (
    <nav className="glass-nav sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Brand Masthead - Navigates to Home */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 group py-1"
            aria-label="FindIt Home"
          >
            <div className="w-10 h-10 rounded-xl bg-[#101D36] text-[#F7F5EF] flex items-center justify-center shadow-[0_4px_12px_rgba(16,29,54,0.15)] group-hover:bg-[#172944] transition-colors">
              <Compass className="w-5 h-5 text-[#DCE5EF]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-[#101D36] leading-none">
                FindIt
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#8999AE] mt-0.5 font-mono">
                Smart Lost &amp; Found
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links: Home, Browse, Smart Matches */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 ml-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-xs font-semibold uppercase tracking-wider transition-all py-1 ${
                  isActive(link.href)
                    ? 'text-[#101D36] font-bold border-b-2 border-[#101D36]'
                    : 'text-[#5A6A80] hover:text-[#101D36]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8999AE]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-[#E5E7EB] rounded-full bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs placeholder-[#8999AE]"
              />
            </div>
          </form>

          {/* Right Primary Action & Auth: Report Item, Sign In / Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Primary Action: Report Item */}
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] active:scale-[0.98] transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#DCE5EF]" />
              <span>Report Item</span>
            </Link>

            {/* Auth Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/80 border border-transparent hover:border-[#E5E7EB] transition cursor-pointer"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#101D36] text-[#DCE5EF] flex items-center justify-center text-xs font-bold shadow-xs">
                    {getInitials(currentUser.name)}
                  </div>
                  <span className="text-xs font-semibold text-[#101D36]">{currentUser.name.split(' ')[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 glass-card rounded-2xl shadow-xl py-1.5 z-50 border border-[#E5E7EB] animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-[#E5E7EB]">
                      <p className="text-xs font-bold text-[#101D36]">{currentUser.name}</p>
                      <p className="text-[11px] text-[#8999AE] truncate">{currentUser.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#101D36] hover:bg-[#F7F5EF] transition"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#8999AE]" />
                      <span>My Dashboard</span>
                    </Link>
                    <Link
                      to="/finder"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#101D36] hover:bg-[#F7F5EF] transition"
                    >
                      <Inbox className="w-4 h-4 text-[#8999AE]" />
                      <span>Finder Dashboard</span>
                    </Link>
                    {currentUser.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#101D36] hover:bg-[#F7F5EF] transition"
                      >
                        <Shield className="w-4 h-4 text-[#8999AE]" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                    <div className="border-t border-[#E5E7EB] my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 w-full text-left transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold uppercase tracking-wider text-[#101D36] hover:text-[#172944] px-3.5 py-2 rounded-xl transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold uppercase tracking-wider text-[#101D36] bg-white border border-[#E5E7EB] hover:bg-gray-50 px-3.5 py-2 rounded-xl transition shadow-2xs"
                >
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 rounded-xl text-[#101D36] hover:bg-white/80 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Compact Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden bg-[#F7F5EF]/98 backdrop-blur-xl border-t border-[#E5E7EB] px-5 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Search */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8999AE]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lost or found items..."
                className="w-full pl-10 pr-4 py-2.5 text-xs border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20"
              />
            </div>
          </form>

          {/* Navigation Links in Clean Order */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl transition ${
                  isActive(link.href)
                    ? 'bg-[#101D36] text-[#F7F5EF]'
                    : 'text-[#101D36] hover:bg-white'
                }`}
              >
                <span>{link.label}</span>
                {isActive(link.href) && <ArrowRight className="w-3.5 h-3.5 text-[#DCE5EF]" />}
              </Link>
            ))}
            
            {/* Primary Action Button */}
            <Link
              to="/report"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider py-3 px-3 rounded-xl bg-[#101D36] text-white shadow-xs mt-2"
            >
              <PlusCircle className="w-4 h-4 text-[#DCE5EF]" />
              <span>Report Item</span>
            </Link>
          </div>

          {/* Mobile Auth Shortcuts */}
          <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between text-xs font-semibold text-[#101D36] py-2 px-3 rounded-lg hover:bg-white"
                >
                  <span>My Dashboard ({currentUser.name})</span>
                  <LayoutDashboard className="w-4 h-4 text-[#8999AE]" />
                </Link>
                <Link
                  to="/finder"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between text-xs font-semibold text-[#101D36] py-2 px-3 rounded-lg hover:bg-white"
                >
                  <span>Finder Dashboard</span>
                  <Inbox className="w-4 h-4 text-[#8999AE]" />
                </Link>
                {currentUser.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between text-xs font-semibold text-[#101D36] py-2 px-3 rounded-lg hover:bg-white"
                  >
                    <span>Admin Console</span>
                    <Shield className="w-4 h-4 text-[#8999AE]" />
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center justify-between text-xs font-semibold text-rose-600 py-2 px-3 w-full text-left rounded-lg hover:bg-rose-50 cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center text-xs font-semibold uppercase tracking-wider text-[#101D36] bg-white border border-[#E5E7EB] py-2.5 rounded-xl shadow-2xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] py-2.5 rounded-xl shadow-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}