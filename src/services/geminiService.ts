/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

export const geminiService = {
  async summarizeInteractions(drugs: string[], interactions: any[]) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const prompt = `
      Anda adalah asisten medis ahli farmakologi. 
      Diberikan daftar obat: ${drugs.join(', ')}.
      Diberikan data interaksi teknis: ${JSON.stringify(interactions)}.
      
      Tugas Anda:
      1. Ringkas interaksi obat ini dalam bahasa Indonesia yang mudah dimengerti pasien.
      2. Berikan peringatan keamanan yang paling kritis.
      3. Berikan saran umum (misalnya: "Konsultasikan dengan dokter").
      4. Gunakan format Markdown yang rapi.
      
      PENTING: Selalu tambahkan disclaimer berikut di akhir jawaban Anda:
      "DISCLAIMER: Analisis ini hanya bersifat informatif. Informasi ini bukan merupakan pengganti saran, diagnosis, atau perawatan medis profesional. Selalu konsultasikan kondisi kesehatan Anda dengan dokter atau tenaga medis berwenang sebelum mengonsumsi atau mengombinasikan obat-obatan."
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return "Maaf, terjadi kesalahan saat menganalisis interaksi dengan AI.";
    }
  }
};
