/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Pill, AlertTriangle, Info, Trash2, Loader2, CheckCircle2, ChevronRight, ArrowRight, ArrowLeft, ShieldCheck, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { drugService, type DrugSuggestion, type Interaction } from './services/drugService';
import { geminiService } from './services/geminiService';

type Step = 1 | 2 | 3;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [searchQueries, setSearchQueries] = useState<string[]>(['', '', '', '', '']);
  const [selectedDrugs, setSelectedDrugs] = useState<(DrugSuggestion | null)[]>([null, null, null, null, null]);
  const [suggestions, setSuggestions] = useState<DrugSuggestion[][]>([[], [], [], [], []]);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle search for a specific index
  const handleSearch = async (index: number, query: string) => {
    const newQueries = [...searchQueries];
    newQueries[index] = query;
    setSearchQueries(newQueries);

    if (query.length >= 2) {
      setSearchingIndex(index);
      const results = await drugService.searchDrugs(query);
      const newSuggestions = [...suggestions];
      newSuggestions[index] = results;
      setSuggestions(newSuggestions);
      setSearchingIndex(null);
    } else {
      const newSuggestions = [...suggestions];
      newSuggestions[index] = [];
      setSuggestions(newSuggestions);
    }
  };

  const selectDrug = (index: number, drug: DrugSuggestion) => {
    const newSelected = [...selectedDrugs];
    newSelected[index] = drug;
    setSelectedDrugs(newSelected);
    
    const newSuggestions = [...suggestions];
    newSuggestions[index] = [];
    setSuggestions(newSuggestions);
    
    const newQueries = [...searchQueries];
    newQueries[index] = drug.brandName ? `${drug.brandName} (${drug.name})` : drug.name;
    setSearchQueries(newQueries);

    // Auto focus next empty input
    const nextIndex = newSelected.findIndex((d, i) => i > index && d === null);
    if (nextIndex !== -1) {
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 50);
    }
  };

  const removeDrug = (index: number) => {
    const newSelected = [...selectedDrugs];
    newSelected[index] = null;
    setSelectedDrugs(newSelected);
    
    const newQueries = [...searchQueries];
    newQueries[index] = '';
    setSearchQueries(newQueries);
  };

  const analyzeInteractions = async () => {
    const activeDrugs = selectedDrugs.filter((d): d is DrugSuggestion => d !== null);
    if (activeDrugs.length < 2) {
      alert('Pilih setidaknya 2 obat untuk dianalisis.');
      return;
    }

    setStep(3);
    setLoading(true);
    setError(null);
    setInteractions([]);
    setAiSummary(null);

    try {
      const rxcuis = activeDrugs.map(d => d.rxcui);
      const results = await drugService.getInteractions(rxcuis);
      setInteractions(results);

      const summary = await geminiService.summarizeInteractions(
        activeDrugs.map(d => d.brandName || d.name),
        results
      );
      setAiSummary(summary);
    } catch (err) {
      console.error(err);
      setError('Gagal memeriksa interaksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1E293B] font-sans selection:bg-emerald-100">
      <AnimatePresence mode="wait">
        {/* STEP 1: LANDING PAGE */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-12"
          >
            <div className="space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center"
              >
                <img 
                  src="https://unmas.ac.id/wp-content/uploads/2021/05/Logo-Unmas-Denpasar.png" 
                  alt="Unmas Denpasar Logo" 
                  className="h-32 w-auto drop-shadow-xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              
              <div className="space-y-2">
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 sm:text-6xl">
                  Interaksi Obat <span className="text-emerald-600">Indonesia</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg max-w-lg mx-auto">
                  Sistem deteksi dini interaksi obat berbasis database global FDA & RxNorm untuk keamanan pasien Indonesia.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(2)}
              className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-200 flex items-center gap-3 hover:bg-emerald-700 transition-all group"
            >
              Mulai Analisis
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <div className="pt-12 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Powered by</p>
              <div className="flex items-center gap-8 justify-center opacity-60 grayscale hover:grayscale-0 transition-all">
                <span className="font-bold text-slate-600">Unmas Denpasar</span>
                <span className="font-bold text-slate-600">BPOM</span>
                <span className="font-bold text-slate-600">FDA Amerika</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: SEARCH PAGE */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-3xl mx-auto px-6 py-12 space-y-10"
          >
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-900">Input Daftar Obat</h2>
                <p className="text-sm text-slate-500">Masukkan hingga 5 nama obat (Merk BPOM atau Generik)</p>
              </div>
            </div>

            <div className="space-y-4">
              {searchQueries.map((q, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="text-slate-300 font-bold text-sm mr-3">0{idx + 1}</span>
                    <Pill className={`w-5 h-5 ${selectedDrugs[idx] ? 'text-emerald-500' : 'text-slate-300'}`} />
                  </div>
                  <input
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    placeholder="Cari Merek Dagang BPOM (misal: Panadol, Amoxsan)..."
                    className={`w-full bg-white border ${selectedDrugs[idx] ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'} rounded-2xl py-4 pl-16 pr-12 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm font-medium`}
                    value={q}
                    onChange={(e) => handleSearch(idx, e.target.value)}
                    disabled={!!selectedDrugs[idx]}
                  />
                  
                  {searchingIndex === idx && (
                    <div className="absolute right-4 inset-y-0 flex items-center">
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                    </div>
                  )}

                  {selectedDrugs[idx] && (
                    <button
                      onClick={() => removeDrug(idx)}
                      className="absolute right-4 inset-y-0 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {suggestions[idx].length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-20"
                      >
                        {suggestions[idx].map((drug) => (
                          <button
                            key={drug.rxcui}
                            onClick={() => selectDrug(idx, drug)}
                            className="w-full text-left px-6 py-4 hover:bg-emerald-50 flex items-center justify-between group transition-colors border-b border-slate-100 last:border-0"
                          >
                            <div>
                              <span className="font-bold text-slate-700">{drug.brandName || drug.name}</span>
                              {drug.brandName && <span className="ml-2 text-xs text-slate-400 font-medium italic">({drug.name})</span>}
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-slate-200 group-hover:text-emerald-500 transition-colors" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={analyzeInteractions}
                disabled={selectedDrugs.filter(d => d !== null).length < 2}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                Analisis Interaksi Sekarang
                <ShieldCheck className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: RESULTS PAGE */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="max-w-4xl mx-auto px-6 py-12 space-y-8"
          >
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                Kembali
              </button>
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                <Globe className="w-3.5 h-3.5" />
                Global Database Match
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                  <Pill className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Mengekstrak Zat Aktif...</h3>
                  <p className="text-slate-500 animate-pulse">Mencocokkan dengan database FDA & RxNorm</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 rounded-3xl p-10 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-xl font-bold text-red-900">Terjadi Kesalahan</h3>
                <p className="text-red-700">{error}</p>
                <button onClick={() => setStep(2)} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold">Coba Lagi</button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* AI Summary Section */}
                {aiSummary && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50"
                  >
                    <div className="bg-emerald-600 px-8 py-6 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white">
                        <ShieldCheck className="w-6 h-6" />
                        <h3 className="text-xl font-bold">Hasil Analisis Keamanan</h3>
                      </div>
                    </div>
                    <div className="p-10 prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-ul:list-disc prose-li:text-slate-600">
                      <Markdown>{aiSummary}</Markdown>
                    </div>
                  </motion.div>
                )}

                {/* Technical Details */}
                {interactions.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-px bg-slate-200 flex-1" />
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Technical Interaction Data</h4>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {interactions.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white border border-slate-200 rounded-3xl p-6 flex items-start gap-5 hover:border-amber-200 transition-all group"
                        >
                          <div className={`p-3 rounded-2xl shrink-0 ${item.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.severity === 'high' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                                {item.severity} Risk
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source: {item.source}</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed">{item.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No interactions */}
                {interactions.length === 0 && !loading && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-16 text-center space-y-6">
                    <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-emerald-900">Aman: Tidak Ada Interaksi Mayor</h3>
                      <p className="text-emerald-700 font-medium max-w-md mx-auto">Database global tidak menemukan interaksi berbahaya yang terdokumentasi antar obat-obat ini.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Footer Disclaimer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-loose max-w-2xl mx-auto">
          Disclaimer: Aplikasi ini adalah alat bantu edukasi & Database Global. 
          Hasil analisis bukan merupakan resep atau saran medis final. 
          Selalu konsultasikan dengan dokter di Unmas Denpasar atau fasilitas kesehatan terdekat.
        </p>
      </footer>
    </div>
  );
}
