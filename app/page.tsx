'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { ArrowRight, Copy, Check, Terminal, Code2, AlertTriangle, FileText } from 'lucide-react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '[YOUR_API_KEY_HERE]' });

type Step = 1 | 2 | 3;

interface ArchitectureData {
  appName: string;
  coreProblem: string;
  targetUser: string;
  coreFeatures: { name: string; description: string }[];
  dataEntities: { entity: string; fields: string[]; purpose: string }[];
  userFlows: string[];
  mvpScope: string;
  potentialChallenges: string[];
}

interface PromptStep {
  step: number;
  title: string;
  focus: string;
  prompt: string;
}

const STEP_2_LOADING_MESSAGES = [
  "Thinking about your core features...",
  "Mapping out your data structure...",
  "Identifying what you really need vs. what's nice-to-have..."
];

const STEP_3_LOADING_MESSAGES = [
  "Writing your first prompt...",
  "Sequencing the build steps...",
  "Making sure nothing gets skipped..."
];

export default function VibeCodeApp() {
  const [step, setStep] = useState<Step>(1);
  const [idea, setIdea] = useState('');
  
  // State for Step 2
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [architecture, setArchitecture] = useState<ArchitectureData | null>(null);
  const [archError, setArchError] = useState<string | null>(null);
  const [rawArchResponse, setRawArchResponse] = useState<string | null>(null);

  // State for Step 3
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [prompts, setPrompts] = useState<PromptStep[] | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [rawPromptResponse, setRawPromptResponse] = useState<string | null>(null);

  // Loading message index
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Rotating messages effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing || isGeneratingPrompts) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % 3);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingPrompts]);

  const handleAnalyze = async () => {
    if (idea.length < 40) return;
    setStep(2);
    setArchitecture(null);
    setArchError(null);
    setRawArchResponse(null);
    setIsAnalyzing(true);
    setLoadingMsgIdx(0);

    const promptText = `
You are a senior software architect and product strategist. A user has described a raw app idea. Analyze it deeply and return a structured JSON object with exactly these fields:

{
  "appName": "A short, punchy suggested name for this app",
  "coreProblem": "One to two sentences describing the real problem being solved",
  "targetUser": "A one-sentence description of the primary user",
  "coreFeatures": [
    { "name": "Feature Name", "description": "What it does and why it matters" }
  ],
  "dataEntities": [
    { "entity": "EntityName", "fields": ["field1", "field2", "field3"], "purpose": "What this data represents" }
  ],
  "userFlows": [
    "Step 1: ...", "Step 2: ...", "Step 3: ..."
  ],
  "mvpScope": "A short paragraph on what belongs in version 1 and what to defer",
  "potentialChallenges": ["challenge 1", "challenge 2", "challenge 3"]
}

The user's idea: ${idea}
Return only valid JSON. No markdown, no explanation outside the JSON.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      const text = response.text || "";
      let parsed: ArchitectureData;
      try {
        parsed = JSON.parse(text);
        setArchitecture(parsed);
      } catch (e) {
        setRawArchResponse(text);
        setArchError("Failed to parse JSON from AI response.");
      }
    } catch (err: any) {
      setArchError(err.message || "An error occurred while calling the Gemini API.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setStep(3);
    setPrompts(null);
    setPromptError(null);
    setRawPromptResponse(null);
    setIsGeneratingPrompts(true);
    setLoadingMsgIdx(0);

    const promptText = `
You are an expert AI prompt engineer who specializes in helping developers build software by writing highly optimized prompts for AI coding assistants.

Using the app idea and architectural analysis below, generate an ordered sequence of 8 to 12 highly specific, self-contained prompts. Each prompt in the sequence should build on the previous one and guide an AI coding assistant step-by-step through the entire build process — from project setup to a working MVP.

Each prompt must:
- Be written as if the developer will paste it directly into an AI coding IDE
- Be specific enough that the AI knows exactly what to build
- Reference prior context naturally
- Cover one focused concern per prompt (setup, data modeling, a specific feature, auth, UI, testing, etc.)
- Be detailed enough to generate real, working code — not vague instructions

Return a JSON array of objects:
[
  {
    "step": 1,
    "title": "Short title for this build step",
    "focus": "What concern this prompt addresses",
    "prompt": "The full, ready-to-paste prompt text the user will copy"
  }
]

Original idea: ${idea}

Architectural analysis:
${JSON.stringify(architecture, null, 2)}

Return only valid JSON. No markdown fences, no explanation outside the array.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      const text = response.text || "";
      let parsed: PromptStep[];
      try {
        parsed = JSON.parse(text);
        setPrompts(parsed);
      } catch (e) {
        setRawPromptResponse(text);
        setPromptError("Failed to parse JSON from AI response.");
      }
    } catch (err: any) {
      setPromptError(err.message || "An error occurred while calling the Gemini API.");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setIdea('');
    setArchitecture(null);
    setPrompts(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Clipboard write failed", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#0d0d0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center font-bold text-lg text-white">V</div>
          <h1 className="text-xl font-semibold tracking-tight uppercase text-white">Vibe-Code <span className="text-violet-500 font-mono text-sm tracking-widest ml-1">{"//"} ARCHITECTURE</span></h1>
        </div>
        
        {/* Progress Indicator */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-violet-900' : 'bg-gray-800'}`}></div>
            <div className={`w-12 h-[2px] ${step >= 1 ? 'bg-violet-600' : 'bg-white/10'}`}></div>
            <div className={`w-4 h-4 rounded-full ${step >= 2 ? 'bg-violet-600 ring-4 ring-violet-500/20' : 'bg-gray-800'}`}></div>
            <div className={`w-12 h-[2px] ${step >= 2 ? 'bg-violet-600' : 'bg-white/10'}`}></div>
            <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-violet-500 ring-4 ring-violet-500/20' : 'bg-white/20'}`}></div>
          </div>
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest ml-4">
            Step 0{step} of 03
          </span>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 pb-24 relative">
        <div className="absolute top-0 left-[20%] w-[60%] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-12 max-w-4xl mx-auto"
            >
              <h1 className="text-5xl font-bold tracking-tight text-white mb-8">What are you building?</h1>
              
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your app idea freely. Don't filter yourself — what problem does it solve? Who is it for? What should it do? Even rough notes are fine."
                className="w-full bg-[#131317] border border-gray-800 focus:border-violet-500 rounded-xl p-6 text-xl leading-relaxed text-gray-200 placeholder-gray-600 outline-none resize-none transition-colors shadow-inner"
                rows={8}
              />
              
              <div className="flex justify-between items-center mt-4">
                <span className={`text-sm ${idea.length < 40 ? 'text-gray-500' : 'text-violet-400'}`}>
                  {idea.length} characters (min. 40)
                </span>
              </div>
              
              <div className="mt-12">
                <button
                  onClick={handleAnalyze}
                  disabled={idea.length < 40}
                  className="group flex items-center space-x-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full font-medium transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
                >
                  <span>Analyze My Idea</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-xs text-gray-500 mt-4 tracking-wide">
                  Your idea stays in your browser. Nothing is saved.
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-12"
            >
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-32 space-y-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xl text-gray-400 font-medium tracking-wide"
                    >
                      {STEP_2_LOADING_MESSAGES[loadingMsgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              {archError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
                  <div className="flex items-center space-x-3 text-red-400 mb-4">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-medium">Generation Error</h3>
                  </div>
                  <p className="text-gray-300 mb-4">{archError}</p>
                  {rawArchResponse && (
                    <div className="bg-black/50 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-xs text-gray-400">
                      <pre>{rawArchResponse}</pre>
                    </div>
                  )}
                  <button 
                    onClick={handleAnalyze}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors font-medium border border-red-500/30"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {architecture && !isAnalyzing && (
                <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-[auto] xl:grid-rows-6 gap-4 animate-in fade-in duration-500 xl:h-[700px]">
                  {/* Column 1: Identity & Scope */}
                  <div className="col-span-1 md:col-span-12 xl:col-span-3 xl:row-span-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                    <div>
                      <label className="text-[10px] text-violet-400 font-mono uppercase tracking-[0.2em] mb-2 block">Suggested Identity</label>
                      <h2 className="text-3xl font-bold text-white leading-tight">{architecture.appName}</h2>
                      <p className="mt-3 text-sm text-white/60 leading-relaxed italic">{architecture.coreProblem}</p>
                      <div className="mt-2 inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 rounded-md px-2 py-1 text-violet-300">
                        <span className="text-[10px] uppercase tracking-wider opacity-70">For</span>
                        <span className="text-xs font-medium">{architecture.targetUser}</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <label className="text-[10px] text-emerald-400 font-mono uppercase tracking-[0.2em] mb-2 block">MVP Scope</label>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <p className="text-xs text-white/70 leading-relaxed">
                          {architecture.mvpScope}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Core Features */}
                  <div className="col-span-1 md:col-span-6 xl:col-span-5 xl:row-span-4 bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col">
                    <label className="text-[10px] text-violet-400 font-mono uppercase tracking-[0.2em] mb-4 block">Prioritized Features</label>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {architecture.coreFeatures.map((feat, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                          <span className="text-violet-500 font-mono font-bold mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{feat.name}</h4>
                            <p className="text-xs text-white/50 mt-1 leading-relaxed">{feat.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Data & Challenges */}
                  <div className="col-span-1 md:col-span-6 xl:col-span-4 xl:row-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto custom-scrollbar">
                    <label className="text-[10px] text-violet-400 font-mono uppercase tracking-[0.2em] mb-4 block">Data Model Overview</label>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {architecture.dataEntities.map((ent, idx) => (
                          <span key={idx} className="px-2 py-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[10px] rounded uppercase font-mono">
                            {ent.entity}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-2 mt-4">
                        {architecture.dataEntities.map((ent, idx) => (
                          <p key={idx} className="text-xs text-white/40 italic">
                            <span className="text-white/60 not-italic font-medium mr-1">{ent.entity}:</span> {ent.purpose}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Challenges block */}
                  <div className="col-span-1 md:col-span-12 xl:col-span-4 xl:row-span-2 bg-red-950/20 border border-red-500/20 rounded-2xl p-6 overflow-y-auto custom-scrollbar">
                    <label className="text-[10px] text-red-400 font-mono uppercase tracking-[0.2em] mb-4 block">Critical Challenges</label>
                    <ul className="space-y-2">
                      {architecture.potentialChallenges.map((c, i) => (
                        <li key={i} className="text-xs flex items-start gap-2 text-white/70">
                          <span className="text-red-500 text-lg leading-none">•</span> 
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Section: Flow & CTA */}
                  <div className="col-span-1 md:col-span-12 xl:col-span-12 xl:row-span-2 bg-violet-950/10 border border-violet-500/20 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center gap-8">
                    <div className="flex-1 w-full overflow-x-auto pb-4 lg:pb-0 custom-scrollbar">
                      <label className="text-[10px] text-violet-400 font-mono uppercase tracking-[0.2em] mb-4 block lg:mb-6">Primary User Flow</label>
                      <div className="flex items-center gap-3 text-xs w-max">
                        {architecture.userFlows.map((stepStr, idx) => (
                          <React.Fragment key={idx}>
                            <div className="flex flex-col items-center gap-1 w-32 text-center">
                              <div className={`w-8 h-8 rounded-full ${idx === 0 ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/80'} flex items-center justify-center font-bold`}>
                                {idx + 1}
                              </div>
                              <span className="opacity-60 leading-tight mt-2">{stepStr.replace(/^Step \d+:\s*/i, '')}</span>
                            </div>
                            {idx < architecture.userFlows.length - 1 && (
                              <div className="w-8 h-[1px] bg-white/20 mt-[-24px]"></div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full lg:w-72 shrink-0">
                      <button
                        onClick={handleGeneratePrompts}
                        className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-600/20 flex justify-center items-center gap-2"
                      >
                        Generate Build Prompts →
                      </button>
                      <button
                        onClick={() => setStep(1)}
                        className="w-full text-xs font-mono text-white/40 uppercase tracking-widest text-center hover:text-white transition-colors py-2"
                      >
                        ← Refine my idea
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-12 max-w-4xl mx-auto"
            >
              {isGeneratingPrompts && (
                <div className="flex flex-col items-center justify-center py-32 space-y-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xl text-gray-400 font-medium tracking-wide"
                    >
                      {STEP_3_LOADING_MESSAGES[loadingMsgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              {promptError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
                  <div className="flex items-center space-x-3 text-red-400 mb-4">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-medium">Generation Error</h3>
                  </div>
                  <p className="text-gray-300 mb-4">{promptError}</p>
                  {rawPromptResponse && (
                    <div className="bg-black/50 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-xs text-gray-400">
                      <pre>{rawPromptResponse}</pre>
                    </div>
                  )}
                  <button 
                    onClick={handleGeneratePrompts}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors font-medium border border-red-500/30"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {prompts && architecture && !isGeneratingPrompts && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <header className="mb-12 border-b border-gray-800 pb-8">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
                      {architecture.appName} — Build Sequence
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                      Paste these prompts in order into your AI coding assistant. Each one builds on the last to ensure a solid foundation and complete MVP.
                    </p>
                  </header>

                  <div className="space-y-10">
                    {prompts.map((p, idx) => (
                      <PromptCard key={idx} prompt={p} onCopy={copyToClipboard} />
                    ))}
                  </div>

                  <div className="pt-16 pb-8 flex flex-col items-center space-y-4">
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full max-w-lg">
                      <button
                        onClick={() => {
                          const fullText = prompts.map(p => 
                            `--- STEP ${p.step}: ${p.title} ---\n${p.prompt}\n`
                          ).join('\n\n');
                          copyToClipboard(fullText);
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 bg-white text-black hover:bg-gray-200 px-6 py-4 rounded-full font-medium transition-all transform hover:scale-[1.02] shadow-xl w-full"
                      >
                        <Copy className="w-5 h-5" />
                        <span>Copy All</span>
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            const { jsPDF } = await import('jspdf');
                            const doc = new jsPDF({
                              orientation: 'portrait',
                              unit: 'mm',
                              format: 'a4'
                            });

                            const pageWidth = doc.internal.pageSize.getWidth();
                            const pageHeight = doc.internal.pageSize.getHeight();
                            const margin = 20;
                            const maxLineWidth = pageWidth - margin * 2;
                            let y = margin;

                            // Title
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(22);
                            const titleText = architecture?.appName || 'Prompt Sequences';
                            const titleLines = doc.splitTextToSize(titleText, maxLineWidth);
                            
                            titleLines.forEach((line: string) => {
                              if (y > pageHeight - margin) {
                                doc.addPage();
                                y = margin;
                              }
                              doc.text(line, margin, y);
                              y += 10;
                            });
                            y += 10; // Extra padding below title

                            // Prompts
                            prompts.forEach((p) => {
                              // Heading
                              doc.setFontSize(16);
                              doc.setFont('helvetica', 'bold');
                              const heading = `Prompt ${p.step}: ${p.title}`;
                              const headingLines = doc.splitTextToSize(heading, maxLineWidth);
                              
                              headingLines.forEach((line: string) => {
                                if (y > pageHeight - margin - 20) {
                                  doc.addPage();
                                  y = margin;
                                }
                                doc.text(line, margin, y);
                                y += 8;
                              });
                              y += 4;

                              // Prompt Content
                              doc.setFontSize(11);
                              doc.setFont('courier', 'normal');
                              
                              const paragraphs = p.prompt.split('\n');
                              paragraphs.forEach((paragraph) => {
                                if (paragraph.trim() === '') {
                                  y += 4;
                                  return;
                                }
                                
                                const lines = doc.splitTextToSize(paragraph, maxLineWidth);
                                lines.forEach((line: string) => {
                                  if (y > pageHeight - margin) {
                                    doc.addPage();
                                    y = margin;
                                  }
                                  doc.text(line, margin, y);
                                  y += 5; // Line height
                                });
                              });
                              
                              y += 12; // Spacing after prompt block
                            });

                            doc.save(`${titleText.replace(/\s+/g, '_')}.pdf`);
                          } catch(err) {
                            console.error('Failed to generate PDF', err);
                          }
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 bg-violet-600 text-white hover:bg-violet-500 px-6 py-4 rounded-full font-medium transition-all transform hover:scale-[1.02] shadow-xl w-full"
                      >
                        <FileText className="w-5 h-5" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={resetAll}
                      className="text-gray-500 hover:text-white transition-colors text-sm font-medium underline underline-offset-4 mt-6 block"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Subtle footer noise/gradient */}
      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-50 pointer-events-none"></div>
    </div>
  );
}

function PromptCard({ prompt, onCopy }: { prompt: PromptStep, onCopy: (text: string) => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-xl relative group">
      <div className="flex items-center justify-between bg-white/5 px-6 py-4 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-black text-violet-500 opacity-60 font-mono tracking-tighter">
            {String(prompt.step).padStart(2, '0')}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{prompt.title}</h3>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-md">
            {prompt.focus}
          </span>
        </div>
      </div>
      
      <div className="p-6 relative">
        <div className="sm:hidden mb-4">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-md">
            {prompt.focus}
          </span>
        </div>
        <pre className="font-mono text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap font-medium custom-scrollbar">
          {prompt.prompt}
        </pre>
        
        <button
          onClick={handleCopy}
          className="absolute top-4 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 shadow-sm flex items-center space-x-2 backdrop-blur-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="text-xs font-medium">Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
