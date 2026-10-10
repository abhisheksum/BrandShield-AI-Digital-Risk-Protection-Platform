import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { registerUser, loginUser, type ApiError } from '../services/api';
import type { AppUser } from '../types';

interface AuthPageProps {
  mode: 'login' | 'register';
  onSuccess: (token: string, user: AppUser) => void;
  onBack: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export function AuthPage({ mode, onSuccess, onBack, onSwitchMode }: AuthPageProps) {
  const [form, setForm] = useState({
    email: '',
    organisation_name: '',
    password: '',
    website: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (mode === 'register' && form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (mode === 'register') {
      if (!form.organisation_name.trim()) {
        errors.organisation_name = 'Organisation name is required';
      }
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await registerUser({
          email: form.email.trim().toLowerCase(),
          organisation_name: form.organisation_name.trim(),
          password: form.password,
          website: form.website.trim() || undefined,
        });
      } else {
        res = await loginUser({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
      }

      const { access_token, user } = res.data;
      localStorage.setItem('rakshak_token', access_token);
      localStorage.setItem('rakshak_user', JSON.stringify(user));
      onSuccess(access_token, user);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const detail = apiError?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => (typeof d === 'string' ? d : d?.msg || 'Invalid input')).join(', '));
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-[#0B100E] text-slate-100 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900">Rakshak</span>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 text-center bg-[#f0fdf4]">
              <div className="w-12 h-12 rounded-xl bg-[#166534] text-white flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'register' ? 'Register Your Organisation' : 'Welcome Back'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'register'
                  ? 'Create an account to start protecting your brand'
                  : 'Sign in to your Rakshak account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              {/* Global error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Organisation Name (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Organisation / Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={form.organisation_name}
                    onChange={(e) => update('organisation_name', e.target.value)}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition ${
                      fieldErrors.organisation_name ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                    }`}
                  />
                  {fieldErrors.organisation_name && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.organisation_name}</p>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {mode === 'register' ? 'Official Email Address' : 'Email Address'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@yourorganisation.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition ${
                    fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Website (register only, optional) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Official Website{' '}
                    <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourorganisation.com"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] transition ${
                      fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Disclaimer for register */}
              {mode === 'register' && (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  Rakshak does not verify email ownership during registration. Your password is securely hashed before storage using industry-standard PBKDF2.
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#166534] hover:bg-[#14532d] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading
                  ? 'Please wait…'
                  : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
              </button>

              {/* Switch mode */}
              <p className="text-center text-sm text-slate-500">
                {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode(mode === 'register' ? 'login' : 'register')}
                  className="text-[#166534] font-semibold hover:underline"
                >
                  {mode === 'register' ? 'Log in' : 'Register'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
