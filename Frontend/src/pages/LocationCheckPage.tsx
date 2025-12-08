import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

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
        showToast('success', 'Location Matched', 'Proceeding to camera attendance.');
        setTimeout(() => navigate('/camera-attendance'), 1500); // Navigate to camera attendance page
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

  const getStatusIcon = () => {
    switch (locationStatus) {
      case 'checking':
        return <MapPin className="w-12 h-12 text-blue-400 animate-pulse" />;
      case 'matched':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'not_matched':
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <MapPin className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getStatusMessage = () => {
    switch (locationStatus) {
      case 'idle':
        return 'Verifying your location...';
      case 'checking':
        return 'Fetching current location...';
      case 'matched':
        return 'Location matched! Redirecting...';
      case 'not_matched':
        return 'Location not matched. Please try again.';
      case 'error':
        return 'Failed to verify location.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <header className="absolute top-0 left-0 w-full p-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </header>

      <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full text-center flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6">Location Verification</h1>
        
        <div className="mb-6">
          {getStatusIcon()}
        </div>

        <p className="text-muted-foreground mb-4">{getStatusMessage()}</p>
        
        {currentLocation && locationStatus !== 'error' && (
          <p className="text-sm text-muted-foreground mb-4">
            Your location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </p>
        )}

        {(locationStatus === 'not_matched' || locationStatus === 'error') && (
          <button
            onClick={verifyLocation}
            className="btn-primary mt-4"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationCheckPage;