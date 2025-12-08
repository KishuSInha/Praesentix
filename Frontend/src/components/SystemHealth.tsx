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
          name: 'Network',
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
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
      <h3 className="text-sm font-semibold mb-3 flex items-center">
        <Activity className="w-4 h-4 mr-2" />
        System Health
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`p-1 rounded ${getStatusColor(metric.status)}`}>
                {metric.icon}
              </div>
              <span className="text-xs">{metric.name}</span>
            </div>
            <span className="text-xs font-medium">{metric.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealth;