import React from 'react';
import { Shield, ShieldCheck, Users, Smartphone, CheckCircle2, ArrowRight, Search, Fingerprint } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B100E] text-slate-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-200 sticky top-0 bg-white z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
            <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#166534] text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900 tracking-tight leading-none">Rakshak</div>
              <div className="hidden sm:block text-[10px] text-[#166534] font-semibold">Digital Brand Protection</div>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Login
            </button>
            <button
              onClick={onRegister}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] rounded-lg shadow-sm transition"
            >
              Register Your Brand
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 bg-[#0B100E] px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 items-center gap-12 lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#dcfce7] text-[#166534] text-xs font-bold rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
              Digital brand protection
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight max-w-2xl">
              Protect your brand from{' '}
              <span className="text-[#166534]">look-alike identities</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Compare submitted social profiles and live Apple App Store search results with your registered brand assets. Review every finding with its source and evidence.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={onRegister}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#166534] hover:bg-[#14532d] text-white font-semibold rounded-xl shadow-md transition text-sm"
              >
                <Shield className="w-4 h-4" />
                Protect Your Brand
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onLogin}
                className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition text-sm"
              >
                Already have an account? Login
              </button>
            </div>
            <p className="mt-5 text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              A risk score is a review priority, not proof of malicious intent.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg" aria-label="Illustration of the brand comparison workflow">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-sm font-semibold text-slate-900">Brand identity review</div>
                <div className="text-xs text-slate-500 mt-0.5">How Rakshak compares submitted candidates</div>
              </div>
              <Search className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
            <div className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="w-9 h-9 rounded-lg bg-[#166534] text-white grid place-items-center mb-3"><ShieldCheck className="w-5 h-5" /></div>
                <div className="text-sm font-semibold text-slate-900">Registered identity</div>
                <div className="text-xs text-slate-500 mt-1">Official name, logo and listed assets</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0 mx-auto" />
              <div className="min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center mb-3"><Fingerprint className="w-5 h-5" /></div>
                <div className="text-sm font-semibold text-slate-900">Candidate for review</div>
                <div className="text-xs text-slate-500 mt-1">Source and available signals are shown</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
              Illustration only. Social profiles are provided manually or by CSV; no platform-wide search is implied.
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">How Rakshak Protects Your Brand</h2>
          <p className="text-center text-sm text-slate-500 mb-12 max-w-xl mx-auto">
            Register official brand assets, then review candidates using their actual source and available evidence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#dcfce7] text-[#166534] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Protect Brand Identity</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Register your brand name, logo, social handles and apps. Rakshak uses these as the comparison baseline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Detect Social Impersonation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Submit a profile URL manually or import a CSV of candidates for review. Rakshak does not search all of Instagram or other social platforms.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Detect Suspicious Apps</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Search Apple’s App Store and compare candidate apps with registered names and publishers. Google Play appears only in explicitly selected synthetic demo scans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Rakshak does NOT claim */}
      <section className="py-12 px-6 bg-[#f8fafc] border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 text-center">
            Transparency & Limitations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Findings are investigation leads, not confirmed fraud verdicts',
              'Demo mode uses synthetic data — clearly labelled as such',
              'Rakshak cannot remove external accounts or apps',
              'Registering an asset here does not constitute proof of ownership',
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-12 px-6 bg-[#111916] border-t border-slate-200 text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to monitor your brand?</h2>
        <p className="text-slate-500 text-sm mb-6">
          Set up your profile in minutes. No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onRegister}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl shadow transition text-sm"
          >
            <Shield className="w-4 h-4" />
            Protect Your Brand
          </button>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition text-sm"
          >
            Login
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-slate-900 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-[#4ade80]" />
          <span className="font-bold text-white text-sm">Rakshak</span>
        </div>
        <p className="text-slate-400 text-xs">
          Your Brand. Your Identity. Our Protection.
        </p>
        <p className="text-slate-600 text-[11px] mt-2">
          ByteXL Digital Risk Protection — Social &amp; App Monitoring Challenge
        </p>
      </footer>
    </div>
  );
}
