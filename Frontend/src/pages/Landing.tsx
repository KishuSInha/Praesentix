import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Camera, Shield, BarChart3, ArrowUpRight, 
  Twitter, Linkedin, Github 
} from "lucide-react";

import Logo from "../components/Logo";
import NotificationCenter from "../components/NotificationCenter";
import founderImage from "../assets/founder.jpeg";
import founder2Image from "../assets/founder2.jpeg";
import cofounderImage from "../assets/cofounder.webp";
import subhamImage from "../assets/subham.jpeg";

const Landing = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const heroRef = useRef(null);

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

  const teamMembers = [
    { name: "Utkarsh Sinha", role: "Founder", img: founderImage },
    { name: "Soumya Sagar Nayak", role: "Co-Founder", img: founder2Image },
    { name: "Avijit Choudhary", role: "Co-Founder", img: cofounderImage },
    { name: "Subham Sarangi", role: "Chief AI Architect", img: subhamImage },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#121212] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* Custom Magnetic Cursor */}
      <div 
        className={`fixed pointer-events-none z-[9999] w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-tighter transition-transform duration-300 ease-out mix-blend-difference ${isHoveringHero ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
        style={{ left: mousePos.x - 48, top: mousePos.y - 48 }}
      >
        Enter App
      </div>

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
            <h1 className="text-[14vw] leading-[0.8] font-black tracking-tighter uppercase mb-8">
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
            <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Core<br/>Utilities</h2>
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

      {/* TEAM SECTION */}
      <section className="py-24 px-6 bg-[#121212] text-white">
        <div className="container mx-auto">
          <h2 className="text-[8vw] font-black uppercase tracking-tighter leading-none mb-20 italic">Architects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="relative group overflow-hidden bg-slate-800 aspect-[3/4]">
                <img 
                  src={member.img} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                  alt={member.name} 
                />
                <div className="absolute bottom-0 left-0 p-6 w-full bg-gradient-to-t from-black to-transparent">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">{member.role}</p>
                  <h4 className="text-xl font-bold uppercase tracking-tighter">{member.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MONOLITHIC FOOTER */}
      <footer className="bg-[#121212] text-white pt-24 pb-12 px-6 overflow-hidden">
        <div className="container mx-auto">
          <div className="border-b border-white/10 pb-20 mb-20">
            <h2 className="text-[15vw] leading-[0.75] font-black uppercase tracking-tighter opacity-5 select-none pointer-events-none">
              Praesentix
            </h2>
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-[-4vw] gap-12">
              <p className="text-3xl md:text-5xl font-black tracking-tighter max-w-xl leading-[0.9] uppercase text-center md:text-left">
                Ready to automate your <br/>
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
                <p className="text-lg font-bold">+91 91421 95378</p>
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <p className="text-sm font-black uppercase tracking-tighter">Operational</p>
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                Node: ASIA-SOUTH-1<br/> Latency: 14ms
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes scan { 0% { top: 0% } 100% { top: 100% } }
        .animate-marquee { display: inline-block; animation: marquee 30s linear infinite; }
        .animate-scan { animation: scan 4s linear infinite; }
      `}} />
    </div>
  );
};

export default Landing;