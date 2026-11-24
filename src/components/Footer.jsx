import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, MapPin, Mail, Share2, Globe, ExternalLink, X, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const [modalContent, setModalContent] = useState(null);

  return (
    <footer className="bg-[#101D36] text-[#F7F5EF] border-t border-[#172944] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-2 pr-0 md:pr-8">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-[#172944] border border-[#2A3E5C] flex items-center justify-center shadow-inner group-hover:border-[#DCE5EF]/40 transition">
                <Compass className="w-5 h-5 text-[#DCE5EF]" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-white">FindIt</span>
                <span className="text-[10px] uppercase tracking-widest text-[#8999AE] font-mono -mt-1">Smart Lost &amp; Found</span>
              </div>
            </Link>
            <p className="text-sm text-[#8999AE] leading-relaxed mb-6 max-w-sm">
              A smart, community-powered lost &amp; found registry connecting campus members through two-level verification and administrative integrity.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#172944]/60 border border-[#2A3E5C] text-xs text-[#DCE5EF]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Two-Level Approval &amp; Verified Chain-of-Custody</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#8999AE] font-mono mb-4">Registry</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Browse All Items', href: '/browse' },
                { label: 'Report Lost Property', href: '/report?type=lost' },
                { label: 'Register Found Property', href: '/report?type=found' },
                { label: 'Smart Matches Engine', href: '/matches' },
                { label: 'How FindIt Works', href: '/#how-it-works' },
              ].map((l) => (
                <li key={l.href}>
                  {l.href.startsWith('/#') ? (
                    <a href={l.href} className="text-sm text-[#DCE5EF]/80 hover:text-white transition">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.href} className="text-sm text-[#DCE5EF]/80 hover:text-white transition">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#8999AE] font-mono mb-4">Operations</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Sign In to Portal', href: '/login' },
                { label: 'Create New Account', href: '/register' },
                { label: 'User Dashboard', href: '/dashboard' },
                { label: 'Administrator Console', href: '/admin' },
              ].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-[#DCE5EF]/80 hover:text-white transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#8999AE] font-mono mb-4">Campus Node</h4>
            <div className="flex items-start gap-2.5 text-xs text-[#8999AE] mb-3 leading-relaxed">
              <MapPin className="w-4 h-4 text-[#DCE5EF] shrink-0 mt-0.5" />
              <span>DSCE Campus, Kumaraswamy Layout, Bengaluru 560078</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#8999AE] mb-5">
              <Mail className="w-4 h-4 text-[#DCE5EF] shrink-0" />
              <span>custody@dsce.findit-portal.edu</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { icon: Share2, label: 'Share', action: () => navigator.clipboard?.writeText(window.location.origin) },
                { icon: Globe, label: 'Website', action: () => {} },
                { icon: ExternalLink, label: 'Portal', action: () => {} },
              ].map(({ icon: Icon, label, action }, i) => (
                <button
                  key={i}
                  onClick={action}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#172944] border border-[#2A3E5C] hover:bg-[#203657] text-[#DCE5EF] hover:text-white transition cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-[#172944] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#8999AE]">
            &copy; 2026 FindIt Platform. Built with integrity for Dayananda Sagar College of Engineering.
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setModalContent({ title: 'Privacy & Ownership Protection', text: 'FindIt protects your ownership details. Private verification notes (passcodes, interior serial numbers, engraving details) are encrypted at rest and strictly restricted to the registered finder and verified administrative officers during active claim evaluation.' })}
              className="text-xs text-[#8999AE] hover:text-[#DCE5EF] transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setModalContent({ title: 'Custody Terms of Service', text: 'All items registered on FindIt must be genuine. Submitting fraudulent reports or claims is subject to disciplinary review and campus access termination.' })}
              className="text-xs text-[#8999AE] hover:text-[#DCE5EF] transition cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Info modal */}
      {modalContent && (
        <div className="fixed inset-0 bg-[#101D36]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#172944] text-[#F7F5EF] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2A3E5C] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2A3E5C]">
              <h3 className="font-serif text-lg font-bold text-white">{modalContent.title}</h3>
              <button
                onClick={() => setModalContent(null)}
                className="text-[#8999AE] hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#DCE5EF]/90 leading-relaxed mb-6">{modalContent.text}</p>
            <button
              onClick={() => setModalContent(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#101D36] bg-[#DCE5EF] hover:bg-white transition cursor-pointer"
            >
              Close Notice
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
