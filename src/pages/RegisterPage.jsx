import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Compass, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmailVerificationCard from '../components/EmailVerificationCard';

function PasswordStrength({ password }) {
  if (!password) return null;

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMet = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong (Cognito Ready)'];
  const colors = ['', 'bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= criteriaMet ? colors[criteriaMet] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span
          className={
            criteriaMet <= 2
              ? 'text-rose-600'
              : criteriaMet <= 4
              ? 'text-amber-700'
              : 'text-emerald-700 font-semibold'
          }
        >
          {labels[criteriaMet]}
        </span>
        <span className="text-[#8999AE]">8+ chars, upper, lower, #, symbol</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { register, isLoading, verificationPending, setVerificationPending } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    name: '',
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isConfirming, setIsConfirming] = useState(
    Boolean(searchParams.get('confirm') || verificationPending?.email)
  );
  const [confirmEmailAddress, setConfirmEmailAddress] = useState(
    searchParams.get('email') || verificationPending?.email || ''
  );

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setSubmitError('');
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Full legal name is required.';
    if (!form.email) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      newErrors.password = 'Cognito policy requires at least 8 characters.';
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[a-z]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter.';
    } else if (!/[0-9]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one digit.';
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one symbol (!@#$%^&*).';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitError('');
      const cleanEmail = form.email.trim().toLowerCase();
      const res = await register({
        name: form.name.trim(),
        email: cleanEmail,
        password: form.password,
      });

      setConfirmEmailAddress(cleanEmail);
      if (!res.isSignUpComplete) {
        setIsConfirming(true);
      } else {
        navigate(`/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
      }
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
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
            AWS Cognito Secured Registry
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#101D36] mt-2">
            {isConfirming ? 'Confirm Verification Code' : 'Create Free Account'}
          </h1>
          <p className="text-xs text-[#8999AE] mt-1">
            {isConfirming
              ? 'Enter the 6-digit verification code to activate your account.'
              : 'Join the verified Dayananda Sagar College of Engineering lost & found network.'}
          </p>
        </div>

        {/* Step 2: Confirmation Screen */}
        {isConfirming ? (
          <EmailVerificationCard
            email={confirmEmailAddress}
            onSuccess={(verifiedEmail) => {
              navigate(`/login?verified=true&email=${encodeURIComponent(verifiedEmail)}`);
            }}
            onBack={() => {
              setIsConfirming(false);
              setVerificationPending(null);
            }}
          />
        ) : (
          /* Step 1: Registration Form */
          <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-sm p-7 space-y-5">
            {submitError && (
              <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                  autoComplete="name"
                />
                {errors.name && <p className="text-xs text-rose-600 mt-1 font-mono">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                  Campus Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="rahul.sharma@example.com"
                  className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-rose-600 mt-1 font-mono">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                    autoComplete="new-password"
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
                <PasswordStrength password={form.password} />
                {errors.password && <p className="text-xs text-rose-600 mt-1 font-mono">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 text-sm border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8999AE] hover:text-[#101D36] p-1 cursor-pointer"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-600 mt-1 font-mono">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Requirement 8: Security Notice */}
              <div className="p-3 bg-[#DCE5EF]/40 rounded-xl border border-[#DCE5EF] text-[11px] text-[#101D36]/80 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#101D36] shrink-0 mt-0.5" />
                <span>
                  All new enrollments are verified by AWS Cognito. Campus role permissions are authorized by the backend custody registry.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#DCE5EF]" />
                    <span>Contacting AWS Cognito...</span>
                  </>
                ) : (
                  <>
                    <span>Create Cognito Account</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#DCE5EF]" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-[#8999AE] space-y-1">
              <p>
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-[#101D36] hover:underline">
                  Sign in
                </Link>
              </p>
              <p>
                Have a pending code?{' '}
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  className="font-semibold text-[#101D36] hover:underline cursor-pointer"
                >
                  Enter code
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
