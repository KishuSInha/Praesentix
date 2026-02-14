import { useState, useEffect } from 'react';
import { Activity, Database, Wifi, Server } from 'lucide-react';

interface HealthMetric {
  name: string;
  value: number;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
}

const SystemHealth = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      const newMetrics: HealthMetric[] = [
        {
          name: 'Database',
          value: Math.floor(Math.random() * 20) + 80,
          status: 'good',
          icon: <Database className="w-4 h-4" />
        },
        {
          name: 'API Response',
          value: Math.floor(Math.random() * 30) + 70,
          status: Math.random() > 0.8 ? 'warning' : 'good',
          icon: <Server className="w-4 h-4" />
        },
        {
          name: 'Network Status',
          value: Math.floor(Math.random() * 25) + 75,
          status: 'good',
          icon: <Wifi className="w-4 h-4" />
        },
        {
          name: 'System Load',
          value: Math.floor(Math.random() * 40) + 60,
          status: Math.random() > 0.9 ? 'error' : 'good',
          icon: <Activity className="w-4 h-4" />
        }
      ];
      setMetrics(newMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-slate-950 bg-[#C4F582]';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'error': return 'text-white bg-slate-950';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
      <h3 className="label-caps !text-slate-950 flex items-center gap-3">
        <Activity className="w-4 h-4 text-slate-400" />
        System Health
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border border-white/20 shadow-sm ${getStatusColor(metric.status)}`}>
                {metric.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{metric.name}</span>
            </div>
            <span className="text-xs font-black text-slate-950">{metric.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealth;