import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Smartphone,
  Globe,
  Clock,
  Cloud,
  BarChart3,
  ShieldCheck,
  Mail,
  Phone,
  Facebook,
  Twitter,
  Linkedin,
} from "lucide-react";
import Logo from "../components/Logo";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">

      {/* ================= HEADER ================= */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Login
            </button>
            <button className="bg-[#20c997] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[#18a87e] transition">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <section className="pt-24 pb-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0a1d37]">
            Facial recognition attendance,
            <br className="hidden md:block" />
            made simple
          </h1>

          <p className="text-lg text-slate-500 max-w-3xl mx-auto">
            Mark attendance using any mobile or tablet. No biometric machines,
            no manual registers, and no complex setup.
          </p>

          <div className="flex justify-center gap-4 flex-col sm:flex-row">
            <button className="px-7 py-3 bg-[#0a1d37] text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-blue-900 transition">
              Start free <ArrowRight size={18} />
            </button>
            <button className="px-7 py-3 border border-slate-300 rounded-md font-semibold text-slate-700 hover:bg-white transition">
              See demo
            </button>
          </div>

          <p className="text-sm text-slate-400">
          Cloud based • Works on any device
          </p>
        </div>
      </section>


      {/* ================= FOOTER (WHITE) ================= */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <Logo size="sm" />
              <p className="text-slate-500 text-sm">
                Facial recognition attendance made for modern institutions.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4">
                Quick links
              </h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Features</li>
                <li>Pricing</li>
                <li>Demo</li>
                <li>Contact</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4">
                Contact
              </h4>
              <div className="space-y-3 text-sm text-slate-500">
                <p className="flex items-center gap-2">
                  <Mail size={16} /> contact@praesentix.ai
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={16} /> +91 9....
                </p>
                <div className="flex gap-4 pt-2">
                  <Facebook size={18} />
                  <Twitter size={18} />
                  <Linkedin size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Praesentix Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
