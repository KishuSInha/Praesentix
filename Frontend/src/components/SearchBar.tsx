import { useState, useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import Praesentix from '../assets/Praesentix.png';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string, filters?: any) => void;
  filters?: Array<{ key: string; label: string; options: string[] }>;
}

const SearchBar = ({ placeholder = "Search...", onSearch, filters = [] }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = () => {
    onSearch(query, activeFilters);
  };

  const clearSearch = () => {
    setQuery('');
    setActiveFilters({});
    onSearch('', {});
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <img 
            src={Praesentix} 
            alt="Praesentix" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 object-contain"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`${placeholder} (Ctrl+K)`}
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {showFilters && filters.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key}>
                <label className="block text-sm font-medium mb-1">{filter.label}</label>
                <select
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, [filter.key]: e.target.value }))}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="">All</option>
                  {filter.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;