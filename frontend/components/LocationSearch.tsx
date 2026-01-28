import { useState, useEffect, useRef } from 'react';

interface LocationResult {
  display_name: string;
  lat: number;
  lon: number;
  type: string;
}

interface LocationSearchProps {
  onSelect: (location: { lat: number; lng: number; name: string }) => void;
  placeholder: string;
  initialValue?: string;
  // Added text color prop
  textColor?: string;
}

export default function LocationSearch({ onSelect, placeholder, initialValue, textColor = 'text-black' }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (query.length >= 3) {
      debounceTimeout.current = setTimeout(() => {
        searchLocations(query);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const searchLocations = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Get backend URL from environment variables
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/geocode?query=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result: LocationResult) => {
    onSelect({
      lat: result.lat,
      lng: result.lon,
      name: result.display_name
    });
    setQuery(result.display_name);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg ${textColor} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              className="px-4 py-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/50 last:border-b-0"
              onClick={() => handleSelect(result)}
            >
              <div className="font-medium text-white truncate">{result.display_name}</div>
              <div className="text-xs text-gray-400 mt-1">
                {result.type} • {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}