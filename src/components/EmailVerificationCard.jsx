import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EmailVerificationCard({ email, onSuccess, onBack }) {
  const { confirmEmail, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit confirmation code.');
      return;
    }
    if (cleanCode.length < 6) {
      setError('The confirmation code must be 6 digits.');
      return;
    }

    setError('');
    setInfoMessage('');
    setIsVerifying(true);

    try {
      await confirmEmail(email, cleanCode);
      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(email);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to verify confirmation code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfoMessage('');
    setIsResending(true);
    try {
      await resendCode(email);
      setInfoMessage('A new verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend confirmation code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="glass-card rounded-3xl border border-[#101D36]/10 shadow-sm p-7 space-y-5 animate-in fade-in duration-150">
      <div className="w-12 h-12 rounded-2xl bg-[#101D36] text-[#DCE5EF] flex items-center justify-center mx-auto shadow-md">
        <Mail className="w-6 h-6" />
      </div>

      <div className="text-center space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#8999AE]">AWS Cognito Security</span>
        <h2 className="font-serif text-2xl font-bold text-[#101D36]">Verify Your Email</h2>
        <p className="text-xs text-[#8999AE] leading-relaxed">
          We sent a 6-digit security code to <br />
          <strong className="text-[#101D36] font-mono">{email}</strong>
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-sm font-bold text-emerald-900">Email Verified Successfully!</p>
          <p className="text-xs text-emerald-700">Redirecting to login portal...</p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] text-center mb-2">
              Enter 6-Digit Confirmation Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="000000"
              autoFocus
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] font-bold border border-[#E5E7EB] rounded-xl bg-white text-[#101D36] placeholder-[#8999AE]/40 focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 focus:border-[#101D36] transition shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || code.trim().length !== 6}
            className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#DCE5EF]" />
                <span>Confirming Code...</span>
              </>
            ) : (
              <>
                <span>Confirm Verification</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#DCE5EF]" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[#8999AE] hover:text-[#101D36] font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || isVerifying || isSuccess}
          className="inline-flex items-center gap-1.5 text-[#101D36] hover:underline font-semibold transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
          <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
        </button>
      </div>
    </div>
  );
}
