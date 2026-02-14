import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, XCircle, RefreshCw, Navigation, Shield } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';

const INSTITUTION_LAT = 20.246894911026796;
const INSTITUTION_LNG = 85.80228785100186;
const ALLOWED_DISTANCE_METERS = 1000;

// Haversine formula to calculate distance between two lat/lng points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
};

const LocationCheckPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'matched' | 'not_matched' | 'error'>('idle');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    verifyLocation();
  }, []);

  const verifyLocation = async () => {
    setLocationStatus('checking');
    if (!navigator.geolocation) {
      showToast('error', 'Geolocation not supported', 'Your browser does not support geolocation.');
      setLocationStatus('error');
      return;
    }

    try {
      const position: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });

      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });

      const distance = getDistance(latitude, longitude, INSTITUTION_LAT, INSTITUTION_LNG);

      if (distance <= ALLOWED_DISTANCE_METERS) {
        setLocationStatus('matched');
        showToast('success', 'Location Matched', 'Proceeding to attendance system.');
        setTimeout(() => navigate('/camera-attendance'), 2000);
      } else {
        setLocationStatus('not_matched');
        showToast('error', 'Location not matched', 'Be within the institution premises and try again.');
      }
    } catch (error: any) {
      console.error("Error fetching location:", error);
      if (error.code === error.PERMISSION_DENIED) {
        showToast('error', 'Location access denied', 'Please allow location access to mark attendance.');
      } else if (error.code === error.TIMEOUT) {
        showToast('error', 'Location request timed out', 'Could not retrieve your location. Please try again.');
      } else {
        showToast('error', 'Error fetching location', 'Could not retrieve your location. Please try again.');
      }
      setLocationStatus('error');
    }
  };

  const getStatusDisplay = () => {
    switch (locationStatus) {
      case 'checking':
        return {
          icon: <RefreshCw className="w-10 h-10 text-slate-950 animate-spin" />,
          title: "Connecting...",
          color: "text-slate-950"
        };
      case 'matched':
        return {
          icon: <CheckCircle className="w-10 h-10 text-slate-950" />,
          title: "Verified",
          color: "text-slate-950",
          bg: "bg-[#C4F582]"
        };
      case 'not_matched':
      case 'error':
        return {
          icon: <XCircle className="w-10 h-10 text-rose-500" />,
          title: "Restricted",
          color: "text-rose-500"
        };
      default:
        return {
          icon: <Navigation className="w-10 h-10 text-slate-400" />,
          title: "Ready",
          color: "text-slate-400"
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-['Outfit'] antialiased flex flex-col items-center justify-center p-6">
      <header className="absolute top-0 left-0 w-full p-8 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm text-slate-400 hover:text-slate-950"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo size="sm" />
      </header>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-12 max-w-md w-full text-center flex flex-col items-center space-y-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#C4F582]/20" />

        <div className="space-y-3">
          <h2 className="label-caps text-slate-400">Security Validation</h2>
          <h1 className="text-4xl font-bold text-slate-950 leading-tight tracking-tighter">Location <br />Check.</h1>
        </div>

        <div className={`w-32 h-32 ${display.bg || 'bg-slate-50'} rounded-[3rem] flex items-center justify-center border-8 border-white shadow-xl transition-all duration-500 ${locationStatus === 'checking' ? 'scale-110' : 'scale-100'}`}>
          {display.icon}
        </div>

        <div className="space-y-4">
          <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${display.color}`}>
            {locationStatus === 'checking' ? 'Syncing Coordinates' : display.title}
          </div>
          <p className="label-caps text-slate-400 max-w-[200px] mx-auto">
            Verification required to access the local attendance system.
          </p>
        </div>

        <AnimatePresence>
          {currentLocation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-4 px-8 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C4F582]" />
                {currentLocation.latitude.toFixed(6)} N, {currentLocation.longitude.toFixed(6)} E
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {(locationStatus === 'not_matched' || locationStatus === 'error') && (
          <button
            onClick={verifyLocation}
            className="w-full bg-slate-900 text-white rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
          >
            Retry Validation
          </button>
        )}

        <div className="pt-4">
          <div className="flex items-center gap-8 label-caps text-slate-200">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure Session</span>
            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> System Active</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LocationCheckPage;
