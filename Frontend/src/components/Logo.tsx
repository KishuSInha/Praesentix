import Praesentix from "../assets/Praesentix.png";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

const Logo = ({ size = 'md', showText = true, variant = 'light' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12', 
    lg: 'h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const textColors = {
    light: 'text-gray-900',
    dark: 'text-white'
  };

  const subtextColors = {
    light: 'text-gray-600',
    dark: 'text-gray-300'
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`${sizeClasses[size]} w-auto flex items-center justify-center bg-white rounded-lg p-2 shadow-sm`}>
        <img 
          src={Praesentix} 
          alt="Praesentix" 
          className="h-full w-auto object-contain"
        />
      </div>
      {showText && (
        <div>
          <h1 className={`${textSizes[size]} font-bold ${textColors[variant]}`}>Praesentix</h1>
          <div className="flex items-center space-x-2">
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;