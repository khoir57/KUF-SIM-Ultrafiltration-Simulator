
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationState, TimeUnit, HermiaMechanism } from './types';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import AITutor from './components/AITutor';
import { Activity, Droplets, FlaskConical, Info, Microscope, Clock, Wind, Binary, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

const App: React.FC = () => {
  // Scientific Relationship: J0 = Lp * TMP / 100 (assuming TMP in kPa and Lp in LMH/bar)
  const calculateInitialFlux = (perm: number, pressure: number) => perm * (pressure / 100);

  const [state, setState] = useState<SimulationState>(() => {
    const j0 = calculateInitialFlux(80, 100);
    return {
      tmp: 100,
      poreSize: 15,
      permeability: 80,
      mode: 'DEAD_END',
      isRunning: false,
      flux: j0, 
      initialFlux: j0,
      rejectionRate: 100,
      foulingFactor: 0,
      timeUnit: 'min',
      crossFlowVelocity: 0.5,
      nValue: 0, 
      kConstant: 0.0001,
      steadyStateFlux: 15
    };
  });

  const [history, setHistory] = useState<any[]>([]);
  const fluxRef = useRef(state.flux);

  useEffect(() => {
    fluxRef.current = state.flux;
  }, [state.flux]);

  // Recalculate J0 when permeability or pressure changes while simulation is reset/paused
  useEffect(() => {
    if (!state.isRunning) {
      const j0 = calculateInitialFlux(state.permeability, state.tmp);
      setState(prev => ({ ...prev, flux: j0, initialFlux: j0, foulingFactor: 0 }));
      setHistory([]);
    }
  }, [state.tmp, state.permeability, state.isRunning]);

  // Clear chart when mechanism changes to keep it scientifically distinct
  useEffect(() => {
    if (state.isRunning) setHistory([]);
  }, [state.mode, state.nValue]);

  // Data recording synchronized with 5-minute intervals
  // Captures t=0 immediately and then every 1 second (which is 5 simulated minutes)
  useEffect(() => {
    if (state.isRunning) {
      // Initialize with t=0 point if history is empty
      setHistory(prev => {
        if (prev.length === 0) {
          return [{
            rawTime: 0,
            displayTime: '0',
            flux: parseFloat(fluxRef.current.toFixed(2))
          }];
        }
        return prev;
      });

      const interval = setInterval(() => {
        setHistory(prev => {
          const lastPoint = prev[prev.length - 1];
          const lastRawTime = lastPoint ? lastPoint.rawTime : 0;
          
          // Increment by 5 simulated minutes
          const newRawTime = lastRawTime + 5; 
          
          const newPoint = {
            rawTime: newRawTime,
            displayTime: state.timeUnit === 'min' ? newRawTime.toFixed(0) : (newRawTime / 60).toFixed(1),
            flux: parseFloat(fluxRef.current.toFixed(2))
          };
          
          // Store up to 300 points (1500 simulated minutes)
          return [...prev, newPoint].slice(-300); 
        });
      }, 1000); // Record a point every 1 real second (5 sim mins)
      return () => clearInterval(interval);
    }
  }, [state.isRunning, state.timeUnit]);

  const updateStats = useCallback((flux: number, rejection: number, fouling: number) => {
    setState(prev => ({ ...prev, flux, rejectionRate: rejection, foulingFactor: fouling }));
  }, []);

  const handleTimeUnitChange = (unit: TimeUnit) => {
    setState(prev => ({ ...prev, timeUnit: unit }));
    setHistory([]);
  };

  const mechanismNames: Record<HermiaMechanism, string> = {
    0: 'Cake Filtration (n=0)',
    1: 'Intermediate Blocking (n=1)',
    1.5: 'Standard Blocking (n=1.5)',
    2: 'Complete Blocking (n=2)'
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Microscope size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase leading-none">KUF-SIM Ultrafiltration Simulator</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Filtration performance simulation. Version v.1.0</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200">
             <div className="flex items-center gap-1.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
              <span className="text-[9px] font-black text-slate-600 uppercase">Solvent</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 border-l border-slate-200">
              <div className="w-2.5 h-2.5 bg-yellow-400 rotate-45"></div>
              <span className="text-[9px] font-black text-slate-600 uppercase">Salts</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 border-l border-slate-200">
              <div className="w-3.5 h-3.5 bg-red-400 rotate-45"></div>
              <span className="text-[9px] font-black text-slate-600 uppercase">Virus</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 border-l border-slate-200">
              <div className="w-4.5 h-4.5 rounded-full bg-orange-400 opacity-80"></div>
              <span className="text-[9px] font-black text-slate-600 uppercase">Colloids</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 border-l border-slate-200">
              <div className="w-6 h-3 bg-red-600 rounded-full"></div>
              <span className="text-[9px] font-black text-slate-600 uppercase">Bacteria</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="text-indigo-600" size={20} />
                Dynamic Interface
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black uppercase shadow-sm">
                  <Binary size={12} />
                  {mechanismNames[state.nValue]}
                </div>
                <div className={`px-4 py-1.5 text-xs font-black rounded-full border transition-all shadow-sm ${
                  state.isRunning ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-200 text-slate-500 border-slate-300'
                }`}>
                  {state.mode === 'DEAD_END' ? 'DEAD-END' : 'CROSS-FLOW'}
                </div>
              </div>
            </div>
            <SimulationCanvas state={state} onUpdateStats={updateStats} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="text-indigo-600" size={20} />
              Parameters
            </h2>
            <Controls state={state} setState={setState} />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                  <Droplets size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Permeate Flux (J) over Time</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-indigo-500 font-black bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Hermia Curve</span>
                    <span className="text-[10px] text-emerald-500 font-black bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">
                      Rejection: {state.rejectionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button 
                  onClick={() => handleTimeUnitChange('min')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${state.timeUnit === 'min' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  MIN
                </button>
                <button 
                  onClick={() => handleTimeUnitChange('hour')}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${state.timeUnit === 'hour' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  HRS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-3 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="displayTime" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickMargin={12} 
                      axisLine={false} 
                      tickLine={false}
                    >
                      <Label value={`Time (${state.timeUnit})`} offset={-10} position="insideBottom" fontSize={11} fontWeight="800" fill="#64748b" />
                    </XAxis>
                    <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} domain={[0, 'auto']}>
                       <Label value="Flux (LMH)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontWeight: '800', fill: '#64748b' }} />
                    </YAxis>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                      labelFormatter={(val) => `Time: ${val} ${state.timeUnit}`}
                      formatter={(val: number) => [`${val.toFixed(2)} LMH`, 'Flux']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="flux" 
                      stroke={state.mode === 'DEAD_END' ? '#f43f5e' : '#6366f1'} 
                      strokeWidth={4} 
                      dot={true} 
                      isAnimationActive={false} 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#818cf8' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Instantaneous Flux</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black tracking-tighter ${state.flux < (state.initialFlux * 0.15) ? 'text-rose-500' : 'text-indigo-600'}`}>
                      {state.flux.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">LMH</span>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div 
                    className="absolute left-0 bottom-0 h-1.5 bg-rose-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, (1 - state.flux/state.initialFlux) * 100)}%` }}
                  />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Total Flux Decline</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black tracking-tighter ${state.flux < state.initialFlux * 0.2 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {((1 - state.flux/state.initialFlux) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Drop</span>
                  </div>
                </div>

                <div className="mt-auto p-4 bg-indigo-600 rounded-2xl text-white shadow-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-indigo-200" />
                    <div>
                      <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Operation Time</p>
                      <p className="text-lg font-black leading-none">
                        {history.length > 0 ? history[history.length-1].displayTime : '0'} {state.timeUnit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <AITutor simState={state} />

          <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 uppercase text-xs tracking-widest">
              <Info size={16} className="text-indigo-600" />
              Fouling Classification
            </h3>
            <div className="space-y-5">
              <div className="flex flex-col gap-1 border-l-2 border-slate-200 pl-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700 uppercase">
                  <span>Cake (n=0)</span>
                  <span className="text-indigo-500">Large Solids</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">Particles accumulate on surface forming a porous layer.</p>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-amber-500 pl-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700 uppercase">
                  <span>Intermediate (n=1)</span>
                  <span className="text-amber-500">Partial Block</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">Probability-based blocking of pores by larger species.</p>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-rose-500 pl-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700 uppercase">
                  <span>Standard (n=1.5)</span>
                  <span className="text-rose-500">Internal Constrict</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">Particles adsorb to inner pore walls, reducing radius.</p>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-red-600 pl-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700 uppercase">
                  <span>Complete (n=2)</span>
                  <span className="text-red-600">Sealing</span>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">Each particle seals a pore completely. Rapid decline.</p>
              </div>
            </div>
          </section>

          <section className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-3 uppercase text-xs tracking-widest">
              <BookOpen size={16} className="text-indigo-600" />
              About the fouling model
            </h3>
            <p className="text-[10px] text-indigo-800/80 leading-relaxed font-medium whitespace-pre-line">
              Fouling model used in this simulator refers to:
              Trans. Inst. Chem. Eng. V., 60 (1982), pp. 183-187.
              Sep Purif. Technol., 141 (2015), pp. 160-169.
              Surf. Interfaces, 19 (2020), Article 100464.
              Mater. Res. Express, 5 (2018), Article 034009.
              J. Memb. Sci., 287 (2007), pp. 138-145.
              Desalination, 360 (2015), pp. 87-96.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-3 text-white font-black text-lg tracking-tighter">
            <div className="bg-indigo-500 p-1 rounded shadow-sm">
               <Microscope size={20} className="text-white" />
            </div>
            <span className="uppercase">KUF-SIM Ultrafiltration Simulator</span>
          </div>
          <div className="max-w-md">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.1em] leading-relaxed mb-1">
              (c)2025. Industrial Membrane Technology Course
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Created by <a href="mailto:khoiruddin@cheitb.id" className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold underline underline-offset-4 decoration-indigo-400/30">khoiruddin@cheitb.id</a>; powered by <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Google AI Studio</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
