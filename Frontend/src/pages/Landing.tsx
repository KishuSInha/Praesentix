import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Cpu, Globe, Lock, CheckCircle2 } from "lucide-react";
import Logo from "../components/Logo";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white text-slate-900 font-['Outfit'] antialiased">

      {/* NAVBAR */}
      <header className="absolute top-0 w-full z-50 px-8 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <div className="hidden lg:flex gap-10 text-[11px] font-semibold tracking-[0.2em] text-slate-500">
            <a className="hover:text-slate-900 transition">PLATFORM</a>
            <a className="hover:text-slate-900 transition">SOLUTIONS</a>
            <a className="hover:text-slate-900 transition">SECURITY</a>
            <a className="hover:text-slate-900 transition">COMPANY</a>
          </div>
          <div className="flex gap-6 items-center">
            <button onClick={() => navigate("/login")} className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 hover:text-slate-900">
              SIGN IN
            </button>
            <button onClick={() => navigate("/selection")} className="bg-slate-900 text-white px-8 py-3 rounded-full text-[11px] font-semibold tracking-[0.2em] hover:bg-slate-700 transition">
              CONTACT SALES
            </button>
          </div>
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="min-h-screen flex items-center px-8 pt-32">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <span className="text-[11px] tracking-[0.3em] text-slate-400 font-semibold uppercase">
                AI Biometric Infrastructure
              </span>

              <h1 className="text-6xl md:text-7xl font-black leading-tight mt-6">
                Attendance Intelligence.
                <br />
                Built for Institutions.
              </h1>

              <p className="text-lg text-slate-500 mt-8 max-w-xl leading-relaxed">
                Preseantix provides real-time facial recognition attendance
                infrastructure for schools, universities and enterprises.
                Accurate. Secure. Globally scalable.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ABOUT PLATFORM */}
        <section className="py-32 border-t border-slate-100 px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl font-black tracking-tight">
              A Complete Attendance Ecosystem.
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              From biometric capture to real-time dashboards, Preseantix
              connects identity verification, attendance logging, and
              institutional analytics into one seamless platform.
            </p>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="pb-32 px-8">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">

            <Feature icon={Cpu} title="Real-Time Recognition"
              desc="Optimized AI models delivering sub-second face matching across devices." />

            <Feature icon={Shield} title="Advanced Liveness Detection"
              desc="Protection against spoofing attacks using intelligent verification layers." />

            <Feature icon={Lock} title="Enterprise Privacy"
              desc="End-to-end encryption and GDPR-aligned data governance architecture." />

          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="py-32 bg-slate-50 px-8">
          <div className="max-w-6xl mx-auto text-center space-y-12">
            <h2 className="text-4xl font-black">Trusted Across Industries</h2>
            <div className="grid md:grid-cols-3 gap-12 text-slate-600 text-sm">
              <div>Universities & Colleges</div>
              <div>Corporate Enterprises</div>
              <div>Government Institutions</div>
            </div>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="py-32 px-8 border-t border-slate-100">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-black">Security & Compliance</h2>
            <p className="text-lg text-slate-500">
              Designed with global compliance standards in mind.
            </p>
            <div className="flex justify-center gap-8 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} /> GDPR Ready
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} /> 99.9% Uptime SLA
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} /> Encrypted Data
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 bg-slate-900 text-white text-center px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-black">
              Ready to modernize attendance?
            </h2>
            <button
              onClick={() => navigate("/selection")}
              className="bg-white text-slate-900 px-10 py-4 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase hover:scale-105 transition"
            >
              Request Demo
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-20 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm text-slate-500">

          <div>
            <Logo size="sm" showText={false} />
            <p className="mt-6 text-xs">
              Enterprise-grade biometric attendance infrastructure.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>Overview</li>
              <li>Security</li>
              <li>Compliance</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Solutions</h4>
            <ul className="space-y-2">
              <li>Education</li>
              <li>Enterprise</li>
              <li>Government</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-16 border-t border-slate-100 pt-8 flex justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Preseantix Labs</span>
          <span>Privacy Policy • Terms of Service</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;


/* Feature Component */
type FeatureProps = {
  icon: React.ElementType;
  title: string;
  desc: string;
};

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, desc }) => (
  <div className="space-y-6">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
      <Icon className="w-6 h-6 text-slate-700" />
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
  </div>
);
