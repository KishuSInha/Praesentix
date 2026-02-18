import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Camera, BarChart3,
  RefreshCw, ShieldCheck, Activity,
  ChevronRight, Calendar, Settings,
  History as LucideHistory, Bell, Search, Plus
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import Logo from "../../components/Logo";
import LogoutButton from "../../components/LogoutButton";
import apiService from "../../utils/api";
//hello world 
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadDashboardData();
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    setLoadingRecords(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await apiService.getPeriodAttendance(today);
      if (result.success && result.data) setAttendanceRecords(result.data.slice(0, 8));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const result = await apiService.getTeacherStats();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = [
    { name: 'Mon', attendance: 85, engagement: 70 },
    { name: 'Tue', attendance: 88, engagement: 72 },
    { name: 'Wed', attendance: 92, engagement: 85 },
    { name: 'Thu', attendance: 80, engagement: 65 },
    { name: 'Fri', attendance: 95, engagement: 90 },
  ];

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-950 font-['Outfit'] antialiased flex flex-col overflow-hidden">
      <header className="px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <nav className="hidden lg:flex items-center gap-6 border-l border-slate-100 pl-8">
            <a href="#" className="label-caps-accent text-[#C4F582]">Overview</a>
            <a href="#" className="label-caps opacity-40 hover:opacity-100 transition-opacity">Students</a>
            <a href="#" className="label-caps opacity-40 hover:opacity-100 transition-opacity">Schedule</a>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Console</span>
          </div>
          <button className="relative p-2 text-slate-400 hover:text-slate-950 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#C4F582] rounded-full border-2 border-white" />
          </button>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden md:block">
              <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{user?.fullName || 'Faculty'}</span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Authorized Faculty</span>
            </div>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-950 tracking-tighter">
              Hello, <span className="text-slate-400">{user?.fullName?.split(' ')[0] || 'Professor'}</span>
            </h2>
            <p className="text-slate-500 font-medium mt-2">Manage your classes and verify student attendance.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/camera-attendance')}
              className="btn-cta bg-[#C4F582] text-slate-950 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#C4F582]/10 active:scale-95 transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Start Attendance
            </button>
            <button className="px-8 py-4 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-950 hover:text-slate-950 transition-all shadow-sm active:scale-95">
              Export Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: "Attendance Rate", val: stats?.averageAttendance ? `${stats.averageAttendance}%` : "94.2%", change: "+2.4%", icon: ShieldCheck, color: "text-slate-950", bg: "bg-[#C4F582]" },
            { label: "Active Sessions", val: stats?.totalClasses || "12", change: "Current Week", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Verification Score", val: stats?.verificationScore ? `${stats.verificationScore}%` : "99.8%", change: "Secure", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-8 border border-slate-100 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="label-caps mb-2">{stat.label}</p>
              <div className="flex items-baseline gap-3">
                <h3 className="text-4xl font-bold text-slate-950 tracking-tight">{stat.val}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.change}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Chart Section */}
          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">Efficiency Overview</h3>
                <p className="label-caps opacity-40 mt-1">Weekly Participation Metrics</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C4F582]" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth</span>
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#020617" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#020617" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '12px', padding: '12px' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                    itemStyle={{ color: '#C4F582', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', padding: '0' }}
                  />
                  <Area type="monotone" dataKey="attendance" stroke="#020617" fillOpacity={1} fill="url(#colorAtt)" strokeWidth={4} />
                  <Area type="monotone" dataKey="engagement" stroke="#C4F582" fill="none" strokeWidth={4} strokeDasharray="8 8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <LucideHistory className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="label-caps text-white/40">Recent History</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-[#C4F582] hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                  {attendanceRecords.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No recent activity</p>
                    </div>
                  ) : (
                    attendanceRecords.map((r, i) => (
                      <div key={i} className="flex items-center justify-between group/item">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white group-hover/item:bg-[#C4F582] group-hover/item:text-slate-950 transition-all">
                            {r.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white leading-none mb-1">{r.name}</p>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">{r.time}</p>
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C4F582]" />
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => navigate('/camera-attendance')}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  Open Verification Portal
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="label-caps mb-8 text-slate-400">Quick Access</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: "Users" },
                  { icon: Calendar, label: "Events" },
                  { icon: BarChart3, label: "Reports" },
                  { icon: Settings, label: "Config" }
                ].map((item, i) => (
                  <button key={i} className="flex flex-col items-center gap-3 p-4 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all group active:scale-95">
                    <item.icon className="w-5 h-5 text-slate-300 group-hover:text-slate-950 transition-colors" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-950 transition-colors">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;