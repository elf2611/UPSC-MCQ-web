"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/useAuth";

export function ImportModal({ onClose, onImported }: { onClose: () => void, onImported: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const processFile = async (file: File) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let data: Record<string, unknown>[] = [];
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const isCsv = file.name.endsWith(".csv");

      if (!isExcel && !isCsv) throw new Error("Please upload a .csv or .xlsx file");

      if (isCsv) {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data as Record<string, unknown>[];
        if (result.errors.length > 0) throw new Error(`CSV Parsing Error: ${result.errors[0].message}`);
      } else if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      }

      if (data.length === 0) throw new Error("The file is empty or could not be parsed.");

      // Minimal validation: check if question_text and options exist in the first row
      const firstRow = data[0];
      if (!firstRow.question_text || !firstRow.option_a || !firstRow.correct_option) {
        throw new Error("Missing required columns. Please ensure you have 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', and 'correct_option' columns.");
      }

      // Convert data to match backend expectations
      const payload = data.map((row: Record<string, unknown>) => ({
        ...row,
        // Ensure string conversions where necessary, handling Excel quirks
        tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',').map((t: string) => t.trim()) : row.tags) : [],
        difficulty: row.difficulty ? String(row.difficulty).toLowerCase() : 'medium',
        correct_option: row.correct_option ? String(row.correct_option).toLowerCase() : 'a',
      }));

      // Reuse the existing save-questions API
      const response = await fetch('/api/admin/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: payload,
          userId: user?.uid,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to import questions");

      if (result.failed > 0) {
        setError(`Successfully imported ${result.saved}. Failed: ${result.failed}. Error: ${result.errors?.[0]}`);
      } else {
        setSuccess(`Successfully imported ${result.saved} questions to the staging area.`);
        setTimeout(() => {
          onImported();
          onClose();
        }, 2000);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Import Questions
        </h2>

        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/20 text-green-400 rounded-lg text-sm">{success}</div>}

        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors relative bg-white/5">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center gap-3">
            {loading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-white font-medium mb-1">Click or drag file to upload</p>
                  <p className="text-gray-400 text-sm">Supports .csv and .xlsx</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200">
          <strong>Pro Tip:</strong> Ensure your file has a header row matching the database columns exactly (e.g., <code className="bg-black/30 px-1 py-0.5 rounded text-amber-100">question_text</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-amber-100">correct_option</code>).
        </div>
      </div>
    </div>
  );
}
