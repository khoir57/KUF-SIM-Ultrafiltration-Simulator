import { GoogleGenAI } from "@google/genai";
import { SimulationState } from "../types";

export const getAITutorResponse = async (
  prompt: string,
  history: { role: 'user' | 'assistant', content: string }[],
  simState: SimulationState
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const mechanismNames: Record<number, string> = {
    0: 'Cake Filtration',
    1: 'Intermediate Blocking',
    1.5: 'Standard Blocking',
    2: 'Complete Blocking'
  };

  const systemInstruction = `
    You are an expert biophysics professor named "Dr. Filter". 
    You are helping students use the "Hermia Ultrafiltration Membrane Simulator".
    
    Current Hermia Parameters:
    - active Mechanism: ${mechanismNames[simState.nValue]} (n=${simState.nValue})
    - Mode: ${simState.mode}
    - Constant k: ${simState.kConstant}
    - J0 (Initial Flux): ${simState.initialFlux.toFixed(1)} LMH
    - J(t) (Current Flux): ${simState.flux.toFixed(1)} LMH
    - Jss (Steady State): ${simState.steadyStateFlux} LMH
    
    Guidance:
    - Explain the mathematical significance of 'n'. 
      - n=2 (Complete): Each particle seals a pore.
      - n=1.5 (Standard): Pore radius decreases.
      - n=1 (Intermediate): Probabilistic blocking.
      - n=0 (Cake): Layer formation on surface.
    - In Cross-flow, explain why flux approaches Jss rather than zero.
    - Use terms like "numerical integration", "Euler method", "flux decline rate", and "surface versus internal fouling".
    - Be academic, precise, and helpful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.6,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The differential equations are stabilizing. Remember: Hermia models provide a fundamental framework for characterizing fouling mechanisms via flux decline analysis.";
  }
};