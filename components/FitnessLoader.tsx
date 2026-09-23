import React, { useState, useEffect } from 'react';

export type FitnessLoaderType = 'barbell' | 'bumper' | 'kettlebell' | 'dumbbell';

interface FitnessLoaderProps {
  type?: FitnessLoaderType | 'random';
  label?: string;
  sublabel?: string;
  className?: string;
}

export const BarbellLoader: React.FC = () => (
  <div 
    className="fitness-loader barbell animate-barbell-lift flex items-center justify-center relative py-6 select-none" 
    style={{ '--loader-speed': '1.4s' } as React.CSSProperties}
  >
    {/* Left Weight Stack */}
    <div className="animate-plate-left flex items-center space-x-0.5">
      <div 
        style={{ width: '10px', height: '52px', background: '#ef4444', border: '1.5px solid rgba(0,0,0,0.4)', borderRadius: '3px' }} 
        className="shadow-sm" 
      />
      <div 
        style={{ width: '10px', height: '46px', background: '#ef4444', border: '1.5px solid rgba(0,0,0,0.4)', borderRadius: '3px' }} 
        className="shadow-sm" 
      />
      <div 
        style={{ width: '6px', height: '24px', background: '#64748b', borderRadius: '2px' }} 
        title="Collar" 
      />
    </div>

    {/* Central Steel Bar */}
    <div 
      style={{ 
        width: '110px', 
        height: '8px', 
        background: 'linear-gradient(to bottom, #cbd5e1, #64748b, #334155)', 
        borderRadius: '2px', 
        position: 'relative' 
      }} 
      className="shadow-md"
    >
      <div 
        style={{ 
          position: 'absolute', 
          left: '20%', 
          right: '20%', 
          top: 0, 
          bottom: 0, 
          background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)' 
        }} 
        title="Knurling" 
      />
    </div>

    {/* Right Weight Stack */}
    <div className="animate-plate-right flex items-center space-x-0.5 flex-row-reverse">
      <div 
        style={{ width: '10px', height: '52px', background: '#ef4444', border: '1.5px solid rgba(0,0,0,0.4)', borderRadius: '3px' }} 
        className="shadow-sm" 
      />
      <div 
        style={{ width: '10px', height: '46px', background: '#ef4444', border: '1.5px solid rgba(0,0,0,0.4)', borderRadius: '3px' }} 
        className="shadow-sm" 
      />
      <div 
        style={{ width: '6px', height: '24px', background: '#64748b', borderRadius: '2px' }} 
        title="Collar" 
      />
    </div>
  </div>
);

export const BumperLoader: React.FC = () => (
  <div 
    className="fitness-loader bumper animate-plate-pulse flex items-center justify-center py-6 select-none" 
    style={{ '--loader-speed': '1.5s' } as React.CSSProperties}
  >
    <div 
      style={{ 
        width: '100px', 
        height: '100px', 
        borderRadius: '50%', 
        background: 'radial-gradient(circle, #1e293b 25%, #475569 70%, #1e293b 100%)', 
        border: '4px solid #0f172a', 
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' 
      }} 
      className="flex items-center justify-center relative select-none"
    >
      {/* Inner Steel Hub Ring */}
      <div 
        style={{ 
          width: '38px', 
          height: '38px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #e2e8f0, #475569)', 
          border: '3px solid #0f172a' 
        }} 
        className="flex items-center justify-center shadow"
      >
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#090d16' }} />
      </div>

      {/* Weight Stamp Text */}
      <span 
        style={{ 
          position: 'absolute', 
          top: '8px', 
          fontSize: '8px', 
          fontWeight: 800, 
          letterSpacing: '1px', 
          color: 'rgba(255,255,255,0.95)' 
        }} 
        className="font-ibm font-extrabold"
      >
        45 LBS
      </span>
      <span 
        style={{ 
          position: 'absolute', 
          bottom: '8px', 
          fontSize: '7px', 
          fontWeight: 700, 
          letterSpacing: '0.5px', 
          color: 'rgba(255,255,255,0.7)' 
        }} 
        className="font-ibm font-bold"
      >
        CROSSFIT LAGOS
      </span>
    </div>
  </div>
);

export const KettlebellLoader: React.FC = () => (
  <div 
    className="fitness-loader kettlebell flex flex-col items-center justify-center py-6 select-none" 
    style={{ '--loader-speed': '1.5s' } as React.CSSProperties}
  >
    <div className="animate-kettlebell-swing flex flex-col items-center">
      {/* Handle Loop */}
      <div 
        style={{ 
          width: '46px', 
          height: '30px', 
          border: '7px solid #475569', 
          borderBottom: 'none', 
          borderRadius: '20px 20px 0 0', 
          marginBottom: '-6px' 
        }} 
      />
      {/* Kettlebell Body */}
      <div 
        style={{ 
          width: '72px', 
          height: '68px', 
          borderRadius: '42% 42% 50% 50%', 
          background: 'radial-gradient(circle at 35% 35%, #ef4444, #b91c1c 70%, #0f172a 100%)', 
          border: '2px solid rgba(0,0,0,0.5)' 
        }} 
        className="flex items-center justify-center shadow-xl"
      >
        <span className="font-ibm font-black text-[10px] text-slate-950 tracking-tighter bg-white/20 px-1.5 py-0.5 rounded">
          35 LB
        </span>
      </div>
    </div>
    {/* Floor Shadow */}
    <div 
      className="animate-shadow-pulse mt-3" 
      style={{ 
        width: '50px', 
        height: '6px', 
        background: 'rgba(0,0,0,0.5)', 
        borderRadius: '50%', 
        filter: 'blur(2px)' 
      }} 
    />
  </div>
);

export const DumbbellLoader: React.FC = () => (
  <div 
    className="fitness-loader dumbbell animate-dumbbell-curl flex items-center justify-center py-6 select-none" 
    style={{ '--loader-speed': '1.5s' } as React.CSSProperties}
  >
    {/* Left Weight Block */}
    <div 
      style={{ 
        width: '22px', 
        height: '48px', 
        background: 'linear-gradient(to right, #b91c1c, #ef4444)', 
        borderRadius: '4px', 
        border: '2px solid #0f172a' 
      }} 
      className="shadow-md" 
    />
    
    {/* Bar Handle */}
    <div 
      style={{ 
        width: '44px', 
        height: '10px', 
        background: 'linear-gradient(to bottom, #cbd5e1, #475569)', 
        borderRadius: '2px', 
        position: 'relative' 
      }}
    >
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' 
        }} 
      />
    </div>
    
    {/* Right Weight Block */}
    <div 
      style={{ 
        width: '22px', 
        height: '48px', 
        background: 'linear-gradient(to left, #b91c1c, #ef4444)', 
        borderRadius: '4px', 
        border: '2px solid #0f172a' 
      }} 
      className="shadow-md" 
    />
  </div>
);

const LOADER_TYPES: FitnessLoaderType[] = ['barbell', 'bumper', 'kettlebell', 'dumbbell'];

export const FitnessLoader: React.FC<FitnessLoaderProps> = ({
  type = 'random',
  label = 'Loading Whiteboard...',
  sublabel = 'CROSSFIT LAGOS',
  className = ''
}) => {
  const [activeType, setActiveType] = useState<FitnessLoaderType>(() => {
    if (type !== 'random') return type;
    const randomIndex = Math.floor(Math.random() * LOADER_TYPES.length);
    return LOADER_TYPES[randomIndex];
  });

  useEffect(() => {
    if (type === 'random') {
      const randomIndex = Math.floor(Math.random() * LOADER_TYPES.length);
      setActiveType(LOADER_TYPES[randomIndex]);
    } else {
      setActiveType(type);
    }
  }, [type]);

  const renderLoaderElement = () => {
    switch (activeType) {
      case 'bumper':
        return <BumperLoader />;
      case 'kettlebell':
        return <KettlebellLoader />;
      case 'dumbbell':
        return <DumbbellLoader />;
      case 'barbell':
      default:
        return <BarbellLoader />;
    }
  };

  return (
    <div className={`loader-wrapper flex flex-col items-center justify-center p-8 bg-brand-dark border border-brand-border rounded-2xl shadow-xl min-h-[260px] animate-fadeIn ${className}`}>
      <div id="loader-container" className="flex items-center justify-center min-h-[120px]">
        {renderLoaderElement()}
      </div>
      {label && (
        <p className="text-xs font-bold uppercase tracking-widest text-brand-textPrimary mt-4 text-center">
          {label}
        </p>
      )}
      {sublabel && (
        <span className="text-[10px] font-bold text-brand-textSecondary/70 uppercase tracking-wider mt-1 text-center font-ibm">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default FitnessLoader;
