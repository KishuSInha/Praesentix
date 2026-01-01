import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Logo from "../components/Logo";

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userType) {
      alert("Please select a role");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.userType
        })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        navigate(`/dashboard/${formData.userType}`);
      } else {
        alert(result.message || "Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f6f6f4] text-[#0e0e0e]">

      {/* LEFT — EDITORIAL SIDE */}
      <section className="relative hidden lg:flex flex-col justify-between px-20 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200" />

        <div className="relative z-10">
          <Logo size="lg" showText />
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-[5.5vw] leading-[0.9] font-semibold tracking-tight">
            Secure<br />
            Digital<br />
            Identity
          </h1>

          <p className="mt-6 text-sm text-neutral-500 max-w-md">
            A minimal authentication layer designed for distributed
            education systems.
          </p>
        </div>

        <div className="relative z-10 text-[10px] tracking-widest text-neutral-400 uppercase">
          © {new Date().getFullYear()} · Access Protocol
        </div>
      </section>

      {/* RIGHT — HIGH-END AUTH INTERFACE */}
      <section className="relative flex items-center justify-center px-8 sm:px-16 lg:px-24 bg-[#f6f6f4]">

        {/* Architectural guide lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 h-full w-px bg-black/10" />
          <div className="absolute right-0 top-0 h-full w-px bg-black/5" />
        </div>

        <div className="relative w-full max-w-md">

          {/* TOP META */}
          <div className="flex items-center justify-between mb-20">
            <button
              onClick={() => navigate(-1)}
              className="text-[10px] tracking-widest uppercase text-neutral-400 hover:text-black transition"
            >
              ← Back
            </button>

            <span className="text-[10px] tracking-widest uppercase text-neutral-400">
              Authentication
            </span>
          </div>

          {/* TITLE */}
          <div className="mb-20">
            <h2 className="text-4xl font-semibold tracking-tight leading-tight">
              System Access
            </h2>
            <p className="mt-4 text-sm text-neutral-500 leading-relaxed max-w-sm">
              Verify your identity to access the Praesentix secure platform.
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-16">

            {/* ROLE SELECT */}
            <section>
              <p className="text-[9px] tracking-widest uppercase text-neutral-400 mb-6">
                Access Role
              </p>

              <div className="space-y-3">
                {["student", "teacher", "admin", "education"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleChange("userType", role)}
                    className={`
                      w-full flex items-center justify-between
                      py-4 px-5
                      border text-left transition-all
                      ${
                        formData.userType === role
                          ? "border-black text-black"
                          : "border-neutral-300 text-neutral-400 hover:border-black"
                      }
                    `}
                  >
                    <span className="uppercase tracking-widest text-[11px]">
                      {role}
                    </span>

                    {formData.userType === role && (
                      <span className="text-xs tracking-widest">SELECTED</span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* CREDENTIALS */}
            <section className="space-y-12">
              <div className="border-b border-neutral-300 focus-within:border-black transition">
                <label className="block text-[9px] tracking-widest uppercase text-neutral-400 mb-2">
                  User Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="Institution ID"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="w-full bg-transparent py-3 text-xl outline-none"
                />
              </div>

              <div className="border-b border-neutral-300 focus-within:border-black transition">
                <label className="block text-[9px] tracking-widest uppercase text-neutral-400 mb-2">
                  Access Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="w-full bg-transparent py-3 text-xl outline-none"
                />
              </div>
            </section>

            {/* ACTION */}
            <section className="pt-8">
              <button
                type="submit"
                disabled={isLoading}
                className="
                  group w-full flex items-center justify-between
                  border border-black px-6 py-5
                  text-[10px] tracking-[0.35em] uppercase
                  transition-all duration-300
                  hover:bg-black hover:text-white
                  active:scale-[0.98]
                  disabled:opacity-50
                "
              >
                {isLoading ? "Authenticating" : "Enter System"}
                <ChevronRight
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition"
                />
              </button>
            </section>
          </form>

          {/* FOOTNOTE */}
          <p className="mt-24 text-[9px] tracking-widest uppercase text-neutral-400">
            Secure session · Encrypted channel · Real-time validation
          </p>
        </div>
      </section>

    </div>
  );
};

export default Login;
