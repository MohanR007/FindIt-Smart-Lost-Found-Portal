import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Compass, AlertCircle, Loader2, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmailVerificationCard from '../components/EmailVerificationCard';

export default function LoginPage() {
  const { login, loginAsDemoUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);
  const [successNotice, setSuccessNotice] = useState(
    searchParams.get('verified')
      ? 'Email verified successfully! You may now sign in with your credentials.'
      : searchParams.get('registered')
      ? 'Registration complete! Check your email for confirmation or sign in below.'
      : ''
  );

  // If login indicates unconfirmed email, switch to verification screen
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccessNotice('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanEmail = form.email.trim().toLowerCase();

    if (!cleanEmail || !form.password) {
      setError('Please fill in both email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError('');
      const result = await login(cleanEmail, form.password);

      // Handle unconfirmed email step
      if (result?.step === 'CONFIRM_SIGN_UP') {
        setUnconfirmedEmail(cleanEmail);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      // Check if error is unconfirmed user
      if (err.message?.toLowerCase().includes('not verified') || err.message?.toLowerCase().includes('not confirmed')) {
        setUnconfirmedEmail(cleanEmail);
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    }
  }

  // Demo login helper (populates credentials or allows fast preview)
  function fillDemo(role) {
    if (role === 'user') {
      setForm({ email: 'sarah.johnson@example.com', password: 'Password123!' });
    }
    if (role === 'admin') {
      setForm({ email: 'emma.wilson@example.com', password: 'Password123!' });
    }
    setError('');
    setForgotNotice(false);
  }

  function handleDemoBypass(role) {
    try {
      loginAsDemoUser(role);
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#101D36] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#101D36] flex items-center justify-center shadow-md group-hover:bg-[#172944] transition">
              <Compass className="w-5 h-5 text-[#DCE5EF]" />
            </div>
            <span className="font-serif text-3xl font-bold tracking-tight text-[#101D36]">FindIt</span>
          </Link>
          <span className="text-xs uppercase font-mono tracking-widest text-[#8999AE] block">
            AWS Cognito Authenticated Portal
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#101D36] mt-2">Sign in to Registry</h1>
          <p className="text-xs text-[#8999AE] mt-1">
            Access your claim petitions and registered campus items via Amazon Cognito.
          </p>
        </div>

        {/* Unconfirmed Email Verification Card */}
        {unconfirmedEmail ? (
          <EmailVerificationCard
            email={unconfirmedEmail}
            onSuccess={() => {
              setUnconfirmedEmail(null);
              setSuccessNotice('Email verified! You can now sign in.');
            }}
            onBack={() => setUnconfirmedEmail(null)}
          />
        ) : (
          <>
            {/* Quick Demo Helper Card */}
            <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-[#DCE5EF] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#8999AE]">
                  Demo Credentials &amp; Quick Sign-in:
                </p>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  AWS Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('user')}
                  className="text-xs font-semibold py-2 px-3 bg-[#F7F5EF] hover:bg-[#DCE5EF]/60 text-[#101D36] rounded-xl border border-[#E5E7EB] transition cursor-pointer text-center"
                >
                  Fill Demo Student
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin')}
                  className="text-xs font-semibold py-2 px-3 bg-[#101D36] hover:bg-[#172944] text-white rounded-xl transition cursor-pointer text-center shadow-xs"
                >
                  Fill Demo Admin
                </button>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-[#8999AE]">
                <span>Testing without Cognito account?</span>
                <button
                  type="button"
                  onClick={() => handleDemoBypass('user')}
                  className="font-semibold text-[#101D36] hover:underline cursor-pointer"
                >
                  Offline Demo Mode &rarr;
                </button>
              </div>
            </div>

            {/* Main Form Glass Card */}
            <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-sm p-7 space-y-5">
              {successNotice && (
                <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successNotice}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {forgotNotice && (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Password Reset Instructions</p>
                    <p className="mt-0.5">
                      For registered Cognito accounts, password reset codes are sent to your verified email. You can also create a fresh account on the Join page.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                    Campus Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="sarah.johnson@example.com"
                    className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36]">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotNotice(!forgotNotice)}
                      className="text-xs text-[#8999AE] hover:text-[#101D36] font-mono cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-10 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8999AE] hover:text-[#101D36] p-1 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#DCE5EF]" />
                      <span>Verifying with Cognito...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Cognito</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#DCE5EF]" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-[#8999AE] pt-2">
                Need a new campus account?{' '}
                <Link to="/register" className="font-semibold text-[#101D36] hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
