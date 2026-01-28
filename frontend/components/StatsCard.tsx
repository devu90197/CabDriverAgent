import { useState } from 'react';
import { Zap, Clock, Route, TrendingUp, Smile } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: 'zap' | 'clock' | 'route' | 'trending-up' | 'smile';
  delay?: string;
  onMouseEnter?: (index: number) => void;
  index?: number;
}

export default function StatsCard({ title, value, description, icon, delay, onMouseEnter, index }: StatsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getIcon = () => {
    switch (icon) {
      case 'zap':
        return <Zap className="w-5 h-5 text-blue-400" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-purple-400" />;
      case 'route':
        return <Route className="w-5 h-5 text-cyan-400" />;
      case 'trending-up':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'smile':
        return <Smile className="w-5 h-5 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (icon) {
      case 'zap':
        return 'from-blue-500/20 to-blue-600/20';
      case 'clock':
        return 'from-purple-500/20 to-purple-600/20';
      case 'route':
        return 'from-cyan-500/20 to-cyan-600/20';
      case 'trending-up':
        return 'from-green-500/20 to-green-600/20';
      case 'smile':
        return 'from-yellow-500/20 to-yellow-600/20';
      default:
        return 'from-gray-500/20 to-gray-600/20';
    }
  };

  const getBorderColor = () => {
    switch (icon) {
      case 'zap':
        return 'border-blue-500/30';
      case 'clock':
        return 'border-purple-500/30';
      case 'route':
        return 'border-cyan-500/30';
      case 'trending-up':
        return 'border-green-500/30';
      case 'smile':
        return 'border-yellow-500/30';
      default:
        return 'border-gray-500/30';
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onMouseEnter && index !== undefined) {
      onMouseEnter(index);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      className={`card-glass card-glass-hover p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${getBgColor()} ${getBorderColor()}`}>
          {getIcon()}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <p className={`text-3xl font-extrabold mb-2 ${value ? 'text-white' : 'text-gray-500'}`}>
        {value || 'Calculating...'}
      </p>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}
