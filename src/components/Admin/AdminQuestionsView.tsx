import React, { useState, useEffect } from 'react';
import { QuestionItem, InstitutionCategory, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { db, collection, getDocs, doc, setDoc, deleteDoc, query, limit } from '../../lib/firebase';
import { logManagerActivity } from '../../lib/adminPermissions';
import { useApp } from '../../context/AppContext';
import { HelpCircle, Plus, Search, Edit3, Trash2 } from 'lucide-react';

export function AdminQuestionsView() {
  const { userProfile } = useApp();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'gusQuestions'), limit(80)));
        const loaded: QuestionItem[] = [];
        snapshot.forEach((docSnap) => loaded.push({ id: docSnap.id, ...docSnap.data() } as any));
        setQuestions(loaded);
      } catch (err) {
        console.warn('Questions fetch error:', err);
      }
    };
    loadQuestions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 to-blue-950 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-blue-400" /> Central Question Bank
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Questions for Institutional League, Champions League, GUS, and Group Battles.
          </p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Question Bank Items ({questions.length})</h3>
        <p className="text-slate-400">Questions are linked to live match rooms, timers, and automatic score evaluations.</p>
      </div>
    </div>
  );
}
