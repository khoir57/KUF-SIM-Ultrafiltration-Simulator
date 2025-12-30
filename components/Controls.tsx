import React from 'react';
import { SimulationState, FiltrationMode, HermiaMechanism } from '../types';
import { Play, Pause, Thermometer, Zap, Layers, Beaker, RotateCw, Wind, Waves, Binary, Activity, Maximize2 } from 'lucide-react';

interface Props {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
}

const Controls: React.FC<Props> = ({ state, setState }) => {
  const toggleMode = (mode: FiltrationMode) => {
    setState(prev => ({ ...prev, mode, isRunning: false })); 
  };

  const setMechanism = (n: HermiaMechanism) => {
    setState(prev => ({ ...prev, nValue: n, isRunning: false }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      
      {/* Operation Mode Selection */}
      <div className="md:col-span-1 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
          <Beaker size={14} className="text-indigo-600" />
          <span className="uppercase tracking-widest">Operation Mode</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => toggleMode('DEAD_END')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] transition-all ${
              state.mode === 'DEAD_END' ? 'bg-white shadow-md text-rose-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={14} />
            DEAD-END
          </button>
          <button 
            onClick={() => toggleMode('CROSS_FLOW')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] transition-all ${
              state.mode === 'CROSS_FLOW' ? 'bg-white shadow-md text-cyan-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap size={14} />
            CROSS-FLOW
          </button>
        </div>
      </div>

      {/* Hermia Mechanism Selection */}
      <div className="md:col-span-1 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
          <Binary size={14} className="text-indigo-600" />
          <span className="uppercase tracking-widest">n parameter for fouling mechanism</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-hidden">
          {[0, 1, 1.5, 2].map((n) => (
            <button 
              key={n}
              onClick={() => setMechanism(n as HermiaMechanism)}
              className={`flex-1 py-2 rounded-lg font-black text-[10px] transition-all ${
                state.nValue === n ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              n={n}
            </button>
          ))}
        </div>
      </div>

      {/* TMP Control */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
            <Thermometer size={14} className="text-blue-500" />
            <span>TMP (Pressure)</span>
          </div>
          <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{state.tmp} kPa</span>
        </div>
        <input 
          type="range" 
          min="10" 
          max="400" 
          step="5"
          value={state.tmp} 
          onChange={(e) => setState(prev => ({ ...prev, tmp: Number(e.target.value) }))}
          className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Pore Size Control */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
            <Maximize2 size={14} className="text-purple-500" />
            <span>Nominal Pore Size</span>
          </div>
          <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{state.poreSize} nm</span>
        </div>
        <input 
          type="range" 
          min="5" 
          max="50" 
          step="1"
          value={state.poreSize} 
          onChange={(e) => setState(prev => ({ ...prev, poreSize: Math.min(50, Number(e.target.value)) }))}
          className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
      </div>

      {/* Permeability Control */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
            <Waves size={14} className="text-emerald-500" />
            <span>Permeability</span>
          </div>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{state.permeability} LMH/bar</span>
        </div>
        <input 
          type="range" 
          min="10" 
          max="300" 
          step="5"
          value={state.permeability} 
          onChange={(e) => setState(prev => ({ ...prev, permeability: Number(e.target.value) }))}
          className="w-full h-1 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
      </div>

      {/* Fouling Constant Control (k) */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
            <Activity size={14} className="text-amber-500" />
            <span>Model Constant (k)</span>
          </div>
          <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{(state.kConstant * 1000000).toFixed(1)}e-6</span>
        </div>
        <input 
          type="range" 
          min="0.00001" 
          max="0.001" 
          step="0.00001"
          value={state.kConstant} 
          onChange={(e) => setState(prev => ({ ...prev, kConstant: Number(e.target.value) }))}
          className="w-full h-1 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
      </div>

      {/* Steady State Flux Control (Jss) - Only shown in CROSS_FLOW */}
      <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 md:col-span-2 ${
        state.mode === 'CROSS_FLOW' 
          ? 'bg-cyan-50 border-cyan-100 opacity-100' 
          : 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none grayscale'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-800 font-bold text-[10px] uppercase tracking-wider">
            <Wind size={14} className="text-cyan-500" />
            <span>Jss (Steady State Limiting Flux)</span>
          </div>
          <span className="text-[10px] font-black text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">{state.steadyStateFlux} LMH</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="150" 
          step="1"
          value={state.steadyStateFlux} 
          onChange={(e) => setState(prev => ({ ...prev, steadyStateFlux: Number(e.target.value) }))}
          className="w-full h-1 bg-cyan-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
        />
      </div>

      {/* Play/Pause/Reset */}
      <div className="md:col-span-2 flex gap-4 pt-4">
        <button 
          onClick={() => setState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
          className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            state.isRunning 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-200 shadow-inner' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
          }`}
        >
          {state.isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {state.isRunning ? 'PAUSE CALCULATION' : 'START FILTRATION'}
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
          title="Reset Lab"
        >
          <RotateCw size={18} />
          RESET
        </button>
      </div>
    </div>
  );
};

export default Controls;