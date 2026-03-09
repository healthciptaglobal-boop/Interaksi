/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

export interface DrugSuggestion {
  rxcui: string;
  name: string;
  brandName?: string;
  activeIngredient?: string;
}

export interface Interaction {
  severity: string;
  description: string;
  source: string;
}

export const drugService = {
  /**
   * Search for drug suggestions using RxNorm API
   * If not found, uses Gemini to map Indonesian brand name to generic
   */
  async searchDrugs(query: string): Promise<DrugSuggestion[]> {
    if (!query || query.length < 2) return [];
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prompt Gemini to act as a BPOM database and provide suggestions
      const prompt = `
        Anda adalah sistem informasi Merek Dagang Obat Terdaftar di BPOM Indonesia.
        Tugas: Berikan daftar 5 Merek Dagang (Brand Name) obat Indonesia yang resmi terdaftar di BPOM yang dimulai dengan atau mengandung kata: "${query}".
        PENTING: Hanya berikan obat yang umum beredar di apotek Indonesia.
        Untuk setiap merek dagang, berikan juga zat aktif utamanya (INN/Generic name) dalam bahasa Inggris agar bisa dicocokkan dengan database FDA.
        Format jawaban harus JSON array: [{"brand": "Nama Merek Dagang", "generic": "Zat Aktif"}].
        Berikan hanya JSON saja, tanpa teks lain.
      `;
      
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: { responseMimeType: "application/json" },
        contents: prompt,
      });
      
      const rawJson = aiResponse.text.trim();
      let suggestionsData = [];
      try {
        suggestionsData = JSON.parse(rawJson);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", e);
      }
      
      const results: DrugSuggestion[] = [];
      
      for (const item of suggestionsData) {
        // For each generic name, get its RXCUI from RxNorm
        const rxcuiResponse = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(item.generic)}`);
        const rxcuiData = await rxcuiResponse.json();
        const rxcui = rxcuiData.idGroup?.rxnormId?.[0];
        
        if (rxcui) {
          results.push({ 
            rxcui, 
            name: item.generic, 
            brandName: item.brand 
          });
        }
      }

      // If Gemini didn't find much, try RxNorm direct search as fallback
      if (results.length < 2) {
        const response = await fetch(`https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(query)}`);
        const data = await response.json();
        const rxSuggestions = data.suggestionGroup?.suggestionList?.suggestion || [];
        
        for (const name of rxSuggestions.slice(0, 3)) {
          if (results.some(r => r.name.toLowerCase() === name.toLowerCase())) continue;
          
          const rxcuiResponse = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`);
          const rxcuiData = await rxcuiResponse.json();
          const rxcui = rxcuiData.idGroup?.rxnormId?.[0];
          if (rxcui) {
            results.push({ rxcui, name });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching drugs:', error);
      return [];
    }
  },

  /**
   * Get interactions between a list of RXCUIs
   */
  async getInteractions(rxcuis: string[]): Promise<Interaction[]> {
    if (rxcuis.length < 2) return [];
    
    try {
      const rxcuiString = rxcuis.join('+');
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuiString}`);
      const data = await response.json();
      
      const interactions: Interaction[] = [];
      const interactionGroups = data.fullInteractionTypeGroup || [];
      for (const group of interactionGroups) {
        for (const type of group.fullInteractionType) {
          for (const pair of type.interactionPair) {
            interactions.push({
              severity: pair.severity || 'N/A',
              description: pair.description,
              source: group.sourceName
            });
          }
        }
      }
      
      return interactions;
    } catch (error) {
      console.error('Error fetching interactions:', error);
      return [];
    }
  }
};
