"use client";

import { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const questionSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  year: z.coerce.number().min(1950).max(new Date().getFullYear() + 1),
  question_text: z.string().min(10, "Question must be at least 10 characters"),
  option_a: z.string().min(1, "Option A is required"),
  option_b: z.string().min(1, "Option B is required"),
  option_c: z.string().min(1, "Option C is required"),
  option_d: z.string().min(1, "Option D is required"),
  correct_option: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().min(10, "Explanation is required"),
  
  // Extended fields
  option_a_explanation: z.string().optional(),
  option_b_explanation: z.string().optional(),
  option_c_explanation: z.string().optional(),
  option_d_explanation: z.string().optional(),
  elimination_tip: z.string().optional(),
  memory_trick: z.string().optional(),
  static_topic_link: z.string().url().optional().or(z.literal("")),
  related_current_affairs: z.string().optional(),
  estimated_solving_time: z.coerce.number().min(5).max(300).default(60),
  revision_priority: z.enum(["high", "normal", "low"]).default("normal"),
  source: z.string().default("original"),
  tags: z.string().optional(),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  initialData?: QuestionFormValues;
  subjects: Record<string, unknown>[];
  topics: Record<string, unknown>[];
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuestionForm({ initialData, subjects, topics, userId, onSuccess, onCancel }: QuestionFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as unknown as Resolver<QuestionFormValues>,
    defaultValues: initialData || {
      difficulty: "medium",
      year: new Date().getFullYear(),
      correct_option: "a",
      estimated_solving_time: 60,
      revision_priority: "normal",
      source: "original",
    }
  });

  const onSubmit = async (data: QuestionFormValues) => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Tags processing
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const payload = { ...data, tags: tagsArray };
      delete payload.id;

      if (initialData?.id) {
        // Edit mode (call secure API to trigger version history)
        const token = await user?.getIdToken();
        const res = await fetch('/api/admin/edit-question', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ questionId: initialData.id, updates: payload })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to update question");
      } else {
        // Add mode (insert directly)
        const { error } = await supabase.from('questions').insert([payload]);
        if (error) throw error;
      }
      
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!initialData?.id;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-xl border border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{isEdit ? "Edit Question" : "Add New Question"}</h2>
        {errorMsg && <div className="text-red-400 text-sm bg-red-400/10 px-3 py-1 rounded">{errorMsg}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
            <select {...form.register("subject")} className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id as string} value={s.name as string}>{s.name as string}</option>)}
            </select>
            {form.formState.errors.subject && <p className="text-red-400 text-xs mt-1">{form.formState.errors.subject.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Topic</label>
            <select {...form.register("topic")} className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white">
              <option value="">Select Topic</option>
              {topics.filter(t => t.subject_id === subjects.find(s => s.name === form.watch("subject"))?.id).map(t => (
                <option key={t.id as string} value={t.name as string}>{t.name as string}</option>
              ))}
            </select>
            {form.formState.errors.topic && <p className="text-red-400 text-xs mt-1">{form.formState.errors.topic.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
              <select {...form.register("difficulty")} className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
              <input type="number" {...form.register("year")} className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-white" />
            </div>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Question Text</label>
          <textarea 
            {...form.register("question_text")} 
            rows={6}
            className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary"
            placeholder="Type your question here..."
          />
          {form.formState.errors.question_text && <p className="text-red-400 text-xs mt-1">{form.formState.errors.question_text.message as string}</p>}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4 rounded-lg border border-white/5">
        {(['a', 'b', 'c', 'd'] as const).map(opt => (
          <div key={opt} className={`p-3 rounded-lg border transition-colors ${form.watch('correct_option') === opt ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'}`}>
            <div className="flex items-center gap-3 mb-2">
              <input 
                type="radio" 
                {...form.register("correct_option")} 
                value={opt} 
                className="w-4 h-4 text-primary bg-background border-gray-600 focus:ring-primary" 
              />
              <label className="text-sm font-semibold text-white uppercase">Option {opt} {form.watch('correct_option') === opt && '(Correct)'}</label>
            </div>
            <textarea 
              {...form.register(`option_${opt}` as keyof QuestionFormValues)} 
              rows={2}
              className="w-full bg-background border border-white/10 rounded-lg p-2 text-sm text-white"
              placeholder={`Text for Option ${opt.toUpperCase()}`}
            />
            {form.formState.errors[`option_${opt}` as keyof QuestionFormValues] && (
              <p className="text-red-400 text-xs mt-1">{form.formState.errors[`option_${opt}` as keyof QuestionFormValues]?.message as string}</p>
            )}
            
            {/* Extended: Specific Option Explanation */}
            {form.watch('correct_option') !== opt && (
              <div className="mt-2">
                <input 
                  type="text" 
                  {...form.register(`option_${opt}_explanation` as keyof QuestionFormValues)} 
                  placeholder={`Why is ${opt.toUpperCase()} wrong? (Optional)`}
                  className="w-full bg-background/50 border border-white/10 rounded p-1.5 text-xs text-gray-300" 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* General Explanation & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Detailed Explanation</label>
          <textarea 
            {...form.register("explanation")} 
            rows={5}
            className="w-full bg-background border border-white/10 rounded-lg p-3 text-white"
          />
          {form.formState.errors.explanation && <p className="text-red-400 text-xs mt-1">{form.formState.errors.explanation.message as string}</p>}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Elimination Tip (Optional)</label>
            <input type="text" {...form.register("elimination_tip")} className="w-full bg-background border border-white/10 rounded-lg p-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Memory Trick / Mnemonic (Optional)</label>
            <input type="text" {...form.register("memory_trick")} className="w-full bg-background border border-white/10 rounded-lg p-2 text-white text-sm" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Add Question'}
        </button>
      </div>
    </form>
  );
}
