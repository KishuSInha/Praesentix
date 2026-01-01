import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Camera, Shield, BarChart3, ArrowUpRight,
  Twitter, Linkedin, Github
} from "lucide-react";

import Logo from "../components/Logo";
import NotificationCenter from "../components/NotificationCenter";

// Assets
import founderImage from "../assets/founder.jpeg";
import founder2Image from "../assets/founder2.jpeg";
import cofounderImage from "../assets/cofounder.webp";
import subhamImage from "../assets/subham.jpeg";

const Landing = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"loading" | "operational" | "offline">("loading");
  const [latency, setLatency] = useState<number | null>(null);
  const heroRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchStatus = async () => {
      const start = performance.now();
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          const end = performance.now();
          setLatency(Math.round(end - start));
          setSystemStatus("operational");
        } else {
          setSystemStatus("offline");
        }
      } catch (error) {
        console.error("Failed to fetch system status:", error);
        setSystemStatus("offline");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [API_URL]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const reviews = [
    { id: "01", name: "Utkarsh Sinha", role: "2nd Year • CS Engineering", img: founderImage, review: "The neural matching accuracy is incredible. It handles my early morning 'just woke up' face perfectly during 8 AM lectures." },
    { id: "02", name: "Soumya Sagar", role: "3rd Semester • IT & Systems", img: founder2Image, review: "Finally, an attendance system that doesn't feel like a chore. Sub-second verification is a total game changer for our lab entries." },
    { id: "03", name: "Avijit Choudhary", role: "2nd Year • Design & Media", img: cofounderImage, review: "As a design student, I appreciate the UI. It’s rare to see college software that actually looks and feels like it belongs in 2025." },
    { id: "04", name: "Subham Sarangi", role: "Applied Math", img: subhamImage, review: "The backend stability is what impresses me most. No lag, no false negatives—just seamless data logging every single day." },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#121212] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">

      {!isMobile && (
        <motion.div
          className="fixed pointer-events-none z-[9999] w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-tighter mix-blend-difference"
          animate={{
            left: mousePos.x - 48,
            top: mousePos.y - 48,
            scale: isHoveringHero ? 1 : 0,
            opacity: isHoveringHero ? 1 : 0
          }}
          transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.5 }}
        >
          Enter App
        </motion.div>
      )}

      {/* UFO Style Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-8 flex justify-between items-center mix-blend-difference text-white">
        <Logo size="md" variant="dark" />
        <div className="flex items-center gap-8">
          <button onClick={scrollToFeatures} className="hidden md:block text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Features</button>
          <NotificationCenter />
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
          >
            Login
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section
        ref={heroRef}
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
        className="relative pt-44 pb-20 px-6 border-b border-black/5"
      >
        <div className="container mx-auto">
          <div className="flex flex-col mb-16">
            <h1 className="text-[14vw] md:text-[14vw] text-[18vw] leading-[0.8] font-black tracking-tighter uppercase mb-8">
              Praesentix<span className="text-blue-600">.</span>
            </h1>

            <div className="grid md:grid-cols-3 gap-12 border-t border-black pt-10">
              <div className="col-span-1 border-r border-black/5 md:pr-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">[ 01 — Mission ]</span>
                <p className="mt-4 text-xl font-medium leading-tight">
                  Redefining human verification through high-fidelity neural recognition.
                </p>
              </div>
              <div className="col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">[ 02 — Vision ]</span>
                <p className="mt-4 text-xl font-medium text-slate-500 italic">
                  Eliminating friction in institutional security with sub-second biometrics.
                </p>
              </div>
              <div className="col-span-1 flex md:justify-end items-end">
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-2 group text-2xl font-bold tracking-tighter uppercase border-b-2 border-black pb-1 hover:text-blue-600 hover:border-blue-600 transition-all"
                >
                  Start Scanning <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[70vh] bg-slate-200 overflow-hidden cursor-none group">
            <div className="absolute inset-0 bg-blue-900/10 z-10 mix-blend-overlay" />
            <img
              src="https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?auto=format&fit=crop&q=80"
              className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s] ease-out"
              alt="AI Technology"
            />
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="w-full h-[1px] bg-blue-400 shadow-[0_0_20px_#3b82f6] absolute animate-scan" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="container mx-auto">
          <div className="flex justify-between items-end mb-20">
            <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Core<br />Utilities</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest underline decoration-blue-600 underline-offset-8">Scroll to Explore</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 border-t border-l border-black">
            {[
              { icon: User, title: "Manual Entry", desc: "For legacy environments and overrides." },
              { icon: Camera, title: "Face Recognition", desc: "99.9% accuracy with neural matching." },
              { icon: BarChart3, title: "Analytics", desc: "Automated report generation and insights." },
              { icon: Shield, title: "Secure", desc: "Blockchain-ready encryption protocols." }
            ].map((f, i) => (
              <div key={i} className="p-10 border-r border-b border-black group hover:bg-blue-600 transition-colors duration-500">
                <f.icon className="w-8 h-8 mb-8 group-hover:text-white transition-colors" />
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-slate-500 group-hover:text-blue-100 transition-colors leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS SECTION - (Replacing Architect Section) */}
      <section className="py-32 px-6 bg-[#121212] text-white">
        <div className="container mx-auto">
          <div className="mb-20">
            <h2 className="text-[8vw] font-black uppercase tracking-tighter leading-none italic mb-4">Verified<br />Sentiments</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
            {reviews.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.8 }}
                viewport={{ once: true }}
                className="group relative bg-[#1a1a1a] border border-white/5 p-8 flex flex-col justify-between min-h-[500px] hover:bg-blue-600 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              >
                <div className="z-10">
                  <div className="flex justify-between items-start mb-8">
                    <span className="text-[10px] font-black text-white/30 group-hover:text-white/60 tracking-widest">{item.id}</span>
                    <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2 group-hover:translate-x-2 transition-transform duration-500">
                    {item.name}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 group-hover:text-white/80 transition-colors">
                    {item.role}
                  </p>
                </div>

                <div className="relative my-10 z-10 flex justify-center">
                  <div className="relative w-32 h-32 md:w-40 md:h-40">
                    <div className="absolute inset-0 bg-blue-600 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border-2 border-white/10 group-hover:border-white transition-all duration-500 shadow-2xl">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 scale-110 group-hover:scale-100 transition-all duration-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="z-10 mt-auto">
                  <p className="text-sm font-medium leading-relaxed text-slate-400 group-hover:text-white transition-colors italic">
                    "{item.review}"
                  </p>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Logo size="sm" variant="dark" showText={false} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MONOLITHIC FOOTER */}
      <footer className="bg-[#121212] text-white pt-24 pb-12 px-6 overflow-hidden">
        <div className="container mx-auto">
          <div className="border-b border-white/10 pb-20 mb-20">
            <h2 className="text-[15vw] md:text-[15vw] text-[20vw] leading-[0.75] font-black uppercase tracking-tighter opacity-5 select-none pointer-events-none">
              Praesentix
            </h2>
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-[-4vw] gap-12">
              <p className="text-3xl md:text-5xl font-black tracking-tighter max-w-xl leading-[0.9] uppercase text-center md:text-left">
                Ready to automate your <br />
                <span className="text-blue-500 italic underline underline-offset-[12px] decoration-1">presence?</span>
              </p>

              <button
                onClick={() => navigate("/login")}
                className="relative group flex items-center justify-center bg-blue-600 hover:bg-white text-white hover:text-black w-48 h-48 md:w-56 md:h-56 rounded-full transition-all duration-700 transform hover:scale-105"
              >
                <div className="flex flex-col items-center gap-2 z-10">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Launch</span>
                  <ArrowUpRight className="w-8 h-8 group-hover:rotate-45 transition-transform duration-500" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Workspace</span>
                </div>
                <div className="absolute inset-2 border border-dashed border-white/30 rounded-full group-hover:rotate-90 transition-transform duration-[2s]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-24">
            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 underline decoration-2 underline-offset-8">[ Contact ]</span>
              <div className="space-y-3">
                <p className="text-lg font-bold hover:text-blue-500 cursor-pointer transition-colors">support@praesentix.com</p>
              </div>
            </div>

            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">[ Navigation ]</span>
              <ul className="space-y-3 font-bold text-slate-400">
                <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 uppercase tracking-tighter">
                  <div className="w-1 h-1 bg-blue-600 rounded-full" /> Neural Engine
                </li>
                <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 uppercase tracking-tighter">
                  <div className="w-1 h-1 bg-blue-600 rounded-full" /> Privacy Shield
                </li>
                <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2 uppercase tracking-tighter">
                  <div className="w-1 h-1 bg-blue-600 rounded-full" /> API Docs
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">[ Status ]</span>
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStatus === "operational" ? "animate-ping bg-green-400" : systemStatus === "loading" ? "bg-blue-400" : "bg-red-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === "operational" ? "bg-green-500" : systemStatus === "loading" ? "bg-blue-500" : "bg-red-500"}`}></span>
                </div>
                <p className="text-sm font-black uppercase tracking-tighter">
                  {systemStatus === "operational" ? "Operational" : systemStatus === "loading" ? "Checking..." : "Offline"}
                </p>
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                Node: ASIA-SOUTH-1<br />
                {latency !== null ? `Latency: ${latency}ms` : "Latency: --"}
              </p>
            </div>

            <div className="space-y-6 md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">[ Social ]</span>
              <div className="flex md:justify-end gap-4 items-center">
                <a href="#" className="p-3 border border-white/10 rounded-full hover:bg-blue-600 transition-all group">
                  <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className="p-3 border border-white/10 rounded-full hover:bg-[#0077b5] transition-all group">
                  <Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className="p-3 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all group">
                  <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          {/* FINAL REFINED LOGO SECTION */}
          <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6 group">
              <div className="bg-white p-2 rounded-lg group-hover:bg-blue-600 transition-colors duration-500">
                <Logo size="sm" variant="dark" showText={false} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black uppercase tracking-tighter leading-none group-hover:text-blue-500 transition-colors">Praesentix</span>
                <span className="text-[9px] text-slate-600 uppercase tracking-[0.3em] font-black">© 2025 Secure Intelligence</span>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md gap-8 overflow-hidden whitespace-nowrap opacity-10 grayscale">
              <div className="animate-marquee inline-block">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] mx-8 italic">Verified Presence</span>
                <span className="text-[9px] font-black uppercase tracking-[0.5em] mx-8 italic">Neural Matching</span>
              </div>
              <div className="animate-marquee inline-block">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] mx-8 italic">Verified Presence</span>
                <span className="text-[9px] font-black uppercase tracking-[0.5em] mx-8 italic">Neural Matching</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes scan { 0% { top: 0% } 100% { top: 100% } }
        .animate-marquee { display: inline-block; animation: marquee 30s linear infinite; }
        .animate-scan { animation: scan 4s linear infinite; }
      `}} />
    </div>
  );
};

export default Landing;