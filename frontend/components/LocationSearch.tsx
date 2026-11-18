import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';

interface Result { display_name: string; lat: number; lon: number; type: string }
interface Props {
  onSelect: (point: { lat: number; lng: number; name: string }) => void;
  placeholder: string; initialValue?: string; textColor?: string;
}
export default function LocationSearch({ onSelect, placeholder, initialValue = '', textColor = 'text-white' }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  const search = async () => {
    if (query.trim().length < 3) { setMessage('Enter at least three characters.'); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const generation = ++version.current;
    setLoading(true); setMessage(''); setResults([]);
    try {
      const response = await api.get('/geocode', { params: { query: query.trim() }, signal: controller.signal });
      if (generation !== version.current) return;
      setResults(response.data.results);
      if (!response.data.results.length) setMessage('No matching places. Try another search or use the map.');
    } catch (error) {
      if (!controller.signal.aborted && generation === version.current) setMessage(errorMessage(error));
    } finally { if (generation === version.current) setLoading(false); }
  };
  return <div className="relative space-y-2">
    <div className="flex gap-2">
      <input aria-label={placeholder} value={query} placeholder={placeholder} maxLength={200}
        onChange={event => { request.current?.abort(); version.current++; setLoading(false); setQuery(event.target.value); setResults([]); setMessage(''); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }}
        className={`w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg ${textColor}`} />
      <button type="button" onClick={search} disabled={loading} className="px-4 rounded-lg bg-slate-700 text-white disabled:opacity-50">{loading ? 'Searching…' : 'Search'}</button>
    </div>
    {message && <p role="status" className="text-sm text-amber-300">{message}</p>}
    {results.length > 0 && <ul className="border border-slate-600 rounded-lg max-h-56 overflow-y-auto" aria-label="Search results">
      {results.map((result, i) => <li key={i}><button type="button" className="w-full text-left px-4 py-3 text-white hover:bg-slate-700" onClick={() => { onSelect({ lat: result.lat, lng: result.lon, name: result.display_name }); setQuery(result.display_name); setResults([]); }}>
        {result.display_name}<span className="block text-xs text-slate-400">{result.lat.toFixed(5)}, {result.lon.toFixed(5)}</span>
      </button></li>)}
    </ul>}
  </div>;
}
