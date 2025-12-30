
import React, { useRef, useEffect, useCallback } from 'react';
import { Particle, MoleculeType, SimulationState } from '../types';

interface Props {
  state: SimulationState;
  onUpdateStats: (flux: number, rejection: number, fouling: number) => void;
}

type ShapeType = 'circle' | 'diamond' | 'hexagon' | 'blob' | 'rod';

const PARTICLE_CONFIG: Record<MoleculeType, { diameter: number; radius: number; color: string; speed: number; shape: ShapeType }> = {
  [MoleculeType.SOLVENT]: { diameter: 0.3, radius: 2, color: '#60a5fa', speed: 5.5, shape: 'circle' },
  [MoleculeType.SALT]: { diameter: 0.8, radius: 2.5, color: '#facc15', speed: 4.8, shape: 'diamond' },
  [MoleculeType.VIRUS]: { diameter: 45, radius: 6, color: '#f87171', speed: 3.5, shape: 'hexagon' }, 
  [MoleculeType.COLLOID]: { diameter: 80, radius: 9, color: '#fb923c', speed: 2.8, shape: 'blob' }, 
  [MoleculeType.BACTERIA]: { diameter: 1200, radius: 14, color: '#dc2626', speed: 2.2, shape: 'rod' } 
};

const SimulationCanvas: React.FC<Props> = ({ state, onUpdateStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const flowOffsetRef = useRef<number>(0);
  
  // Time Compression: 1 real second = 5 simulated minutes
  const TIME_COMPRESSION = 300; 
  const simTimeRef = useRef<number>(0); // in simulated minutes
  const currentFluxRef = useRef<number>(state.initialFlux);
  const lastStateUpdateRef = useRef<number>(0);

  const drawShape = (ctx: CanvasRenderingContext2D, p: Particle) => {
    const config = PARTICLE_CONFIG[p.type];
    if (!config) return;
    
    ctx.beginPath();
    ctx.fillStyle = config.color;
    
    if (p.passed) {
      ctx.globalAlpha = 0.3;
    } else if (p.stuckTime > 0 && state.mode === 'DEAD_END') {
      ctx.fillStyle = '#475569'; 
    }

    switch (config.shape) {
      case 'circle':
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(p.x, p.y - p.radius);
        ctx.lineTo(p.x + p.radius, p.y);
        ctx.lineTo(p.x, p.y + p.radius);
        ctx.lineTo(p.x - p.radius, p.y);
        break;
      case 'rod':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.passed ? 0 : Math.PI / 4);
        ctx.beginPath();
        ctx.arc(-p.radius + p.radius / 2, 0, p.radius / 2, Math.PI / 2, 3 * Math.PI / 2);
        ctx.lineTo(p.radius - p.radius / 2, -p.radius / 2);
        ctx.arc(p.radius - p.radius / 2, 0, p.radius / 2, 3 * Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-p.radius + p.radius / 2, p.radius / 2);
        ctx.fill();
        ctx.restore();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = p.x + p.radius * Math.cos(angle);
          const y = p.y + p.radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        break;
      case 'blob':
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        break;
    }
    
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.closePath();
  };

  const drawFlowArrows = (ctx: CanvasRenderingContext2D, width: number, height: number, membraneX: number) => {
    ctx.save();
    const arrowSize = 12;
    const spacing = 80;
    const fluxMagnitude = currentFluxRef.current / state.initialFlux;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    if (state.mode === 'DEAD_END') {
      for (let y = spacing / 2; y < height; y += spacing) {
        const x = 20 + (flowOffsetRef.current % spacing);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 30, y);
        ctx.lineTo(x + 30 - arrowSize, y - arrowSize / 2);
        ctx.lineTo(x + 30 - arrowSize, y + arrowSize / 2);
        ctx.fill();
      }
    } else {
      const feedZoneWidth = membraneX - 30;
      for (let x = spacing / 2; x < feedZoneWidth; x += spacing) {
        const y = 20 + (flowOffsetRef.current % spacing);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 30);
        ctx.lineTo(x - arrowSize / 2, y + 30 - arrowSize);
        ctx.lineTo(x + arrowSize / 2, y + 30 - arrowSize);
        ctx.fill();
      }
    }

    ctx.strokeStyle = `rgba(96, 165, 250, ${0.4 * fluxMagnitude + 0.1})`;
    ctx.fillStyle = `rgba(96, 165, 250, ${0.4 * fluxMagnitude + 0.1})`;
    const permeateSpacing = 60;
    const permeateArrowOffset = (flowOffsetRef.current * 1.5) % permeateSpacing;
    for (let y = 30; y < height; y += permeateSpacing) {
      const startX = membraneX + 15 + permeateArrowOffset;
      if (startX < width - 40) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + 20, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(startX + 20, y);
        ctx.lineTo(startX + 20 - arrowSize * 0.7, y - arrowSize * 0.35);
        ctx.lineTo(startX + 20 - arrowSize * 0.7, y + arrowSize * 0.35);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const initParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const counts = {
      [MoleculeType.SOLVENT]: 60, [MoleculeType.SALT]: 35, [MoleculeType.VIRUS]: 18, [MoleculeType.COLLOID]: 14, [MoleculeType.BACTERIA]: 12
    };
    let idCounter = 0;
    Object.entries(counts).forEach(([type, count]) => {
      const config = PARTICLE_CONFIG[type as MoleculeType];
      for (let i = 0; i < count; i++) {
        // Particles start further back for better visual flow in accelerated mode
        const startX = state.mode === 'CROSS_FLOW' ? Math.random() * 300 : Math.random() * 300 - 400;
        const startY = Math.random() * 400;
        newParticles.push({
          id: idCounter++, type: type as MoleculeType, x: startX, y: startY,
          vx: (Math.random() * 0.8 + 1.2) * config.speed, // Increased horizontal velocity
          vy: state.mode === 'CROSS_FLOW' ? (Math.random() * 0.5 + 1.5) * config.speed : (Math.random() - 0.5) * 1.0,
          radius: config.radius, color: config.color, passed: false, stuckTime: 0
        });
      }
    });
    particlesRef.current = newParticles;
  }, [state.mode]);

  useEffect(() => {
    initParticles();
    if (!state.isRunning) {
      simTimeRef.current = 0;
      currentFluxRef.current = state.initialFlux;
    }
  }, [initParticles, state.isRunning, state.initialFlux]);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const membraneX = canvas.width / 2;

    if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
    const dtSeconds = (time - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = time;

    // --- Physics and Flux Decline ---
    if (state.isRunning) {
      // Scale simulation time: 1 real sec = 5 simulated minutes
      // t is now in simulated minutes
      simTimeRef.current += (dtSeconds * TIME_COMPRESSION) / 60; 
      const t = simTimeRef.current;
      const J0 = state.initialFlux;
      
      // Adjusted k scaling for minutes time-scale
      const k = state.kConstant * 25; 

      let J = J0;

      if (state.mode === 'DEAD_END') {
        switch (state.nValue) {
          case 0: // Cake Filtration (n=0)
            J = J0 / Math.sqrt(1 + 2 * k * Math.pow(J0, 1.2) * t);
            break;
          case 1: // Intermediate Blocking (n=1)
            J = J0 / (1 + k * (J0 / 10) * t);
            break;
          case 1.5: // Standard Blocking (n=1.5)
            J = J0 / Math.pow(1 + (k / 15) * Math.sqrt(J0) * t, 2);
            break;
          case 2: // Complete Blocking (n=2)
            J = J0 * Math.exp(-(k / 4) * t);
            break;
        }
      } else {
        const Jss = state.steadyStateFlux;
        const decayRate = (k / 5); 
        J = Jss + (J0 - Jss) * Math.exp(-decayRate * t);
      }
      currentFluxRef.current = Math.max(0.01, J);
    }

    const declineRatio = 1 - (currentFluxRef.current / state.initialFlux);
    let effectivePoreSize = state.poreSize;
    if (state.nValue === 1.5) {
      effectivePoreSize = state.poreSize * (1 - (declineRatio * 0.85));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, membraneX, canvas.height);
    ctx.fillStyle = '#0a0f1e'; ctx.fillRect(membraneX, 0, canvas.width - membraneX, canvas.height);

    if (state.isRunning) {
      flowOffsetRef.current += 3.0; // Increased visual flow speed
      drawFlowArrows(ctx, canvas.width, canvas.height, membraneX);
    }

    const cakeThickness = declineRatio * 55; 
    if (declineRatio > 0.01) {
      const grad = ctx.createLinearGradient(membraneX - cakeThickness, 0, membraneX, 0);
      grad.addColorStop(0, 'rgba(185, 28, 28, 0)');
      grad.addColorStop(1, `rgba(185, 28, 28, ${declineRatio * 0.75})`);
      ctx.fillStyle = grad;
      ctx.fillRect(membraneX - cakeThickness, 0, cakeThickness, canvas.height);
    }

    const visualPoreRendering = Math.max(0.5, effectivePoreSize * 0.5); 
    ctx.strokeStyle = declineRatio > 0.9 ? '#b91c1c' : '#334155';
    ctx.lineWidth = 16;
    ctx.setLineDash([18, visualPoreRendering]);
    ctx.beginPath(); ctx.moveTo(membraneX, 0); ctx.lineTo(membraneX, canvas.height); ctx.stroke();
    ctx.setLineDash([]);

    let passedSpeciesCount = 0;
    let totalSpeciesCount = 0;
    const targetSpecies = [MoleculeType.VIRUS, MoleculeType.BACTERIA, MoleculeType.COLLOID];

    particlesRef.current.forEach((p) => {
      const isTarget = targetSpecies.includes(p.type);
      if (isTarget) totalSpeciesCount++;

      if (state.isRunning) {
        // Convection boost ensures particles don't feel slow even as flux declines
        const convectionRatio = Math.max(0.4, (currentFluxRef.current / state.initialFlux));
        if (p.passed) {
          p.x += 4.5; p.y += (Math.random() - 0.5) * 0.2;
        } else {
          const particleDiameter = PARTICLE_CONFIG[p.type].diameter;
          const isSmallerThanPore = particleDiameter < effectivePoreSize;
          const wallBoundary = membraneX - (p.stuckTime > 0 ? (cakeThickness * 0.6) : 2);

          if (state.mode === 'DEAD_END') {
            if (p.stuckTime > 0) {
              p.stuckTime++;
              p.x = Math.max(p.x, wallBoundary - p.radius);
            } else {
              p.x += p.vx * convectionRatio;
              p.y += p.vy * 0.4;
            }
          } else {
            if (p.x + p.radius >= wallBoundary) {
              p.x = wallBoundary - p.radius - 1;
              p.y += (state.crossFlowVelocity * 15) + (p.vy * 0.8); 
              p.vx = Math.abs(p.vx) * -0.3;
            } else {
              p.x += (p.vx * (isSmallerThanPore ? 1.4 : 0.8)) * convectionRatio;
              p.y += (p.vy + state.crossFlowVelocity * 10) * convectionRatio;
            }
          }

          if (!p.passed && p.x + p.radius >= wallBoundary) {
            if (isSmallerThanPore) {
              p.passed = true;
              p.x = membraneX + p.radius + 3;
            } else if (state.mode === 'DEAD_END') {
              p.stuckTime = 1;
              p.x = wallBoundary - p.radius;
            }
          }
        }

        const isOffScreen = p.x > canvas.width || p.y > canvas.height || p.y < -300 || p.x < -600;
        if (isOffScreen) {
          p.passed = false; p.stuckTime = 0;
          if (state.mode === 'DEAD_END') { p.x = -200; p.y = Math.random() * canvas.height; }
          else { p.x = Math.random() * (membraneX * 0.7); p.y = -80; }
        }
      }
      drawShape(ctx, p);
      if (p.passed && isTarget) passedSpeciesCount++;
    });

    if (time - lastStateUpdateRef.current > 50) {
      const rejection = totalSpeciesCount === 0 ? 100 : 100 - (passedSpeciesCount / totalSpeciesCount) * 100;
      onUpdateStats(currentFluxRef.current, rejection, declineRatio);
      lastStateUpdateRef.current = time;
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [state.isRunning, state.initialFlux, state.steadyStateFlux, state.kConstant, state.nValue, state.mode, state.poreSize, state.crossFlowVelocity, onUpdateStats]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  return (
    <div className="relative w-full h-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
      <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">Feed Solution</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white bg-blue-600/30 px-3 py-1 rounded-full border border-blue-500/40 backdrop-blur-sm uppercase">
                {state.mode.replace('_', ' ')} FEED (Accelerated)
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">Permeate J(t)</span>
            <div className="flex items-center justify-end gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded transition-colors duration-300 ${currentFluxRef.current > state.steadyStateFlux + 5 ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-amber-400 bg-amber-950/40 border border-amber-500/30'}`}>
                {state.mode === 'DEAD_END' ? (currentFluxRef.current > (state.initialFlux * 0.05) ? 'Transient' : 'Blocked') : (currentFluxRef.current > state.steadyStateFlux + 1 ? 'Transient' : 'Steady State')}
              </span>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} width={800} height={400} className="w-full h-full" />
    </div>
  );
};

export default SimulationCanvas;
