import React, { useState, useEffect } from 'react';
import { BadgeStoreItem, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { db, collection, getDocs, doc, setDoc, query, limit } from '../../lib/firebase';
import { ShoppingBag, Plus, Award } from 'lucide-react';

export function AdminGpStoreView() {
  const [items, setItems] = useState<BadgeStoreItem[]>([]);

  useEffect(() => {
    const loadStoreItems = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'gpStore'), limit(30)));
        const loaded: BadgeStoreItem[] = [];
        snapshot.forEach((docSnap) => loaded.push({ id: docSnap.id, ...docSnap.data() } as any));
        setItems(loaded);
      } catch (err) {
        console.warn('GP Store fetch error:', err);
      }
    };
    loadStoreItems();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 to-blue-950 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-400" /> GP Store & Badges Catalog
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Create items, badges, pricing in GP, and user purchase tracking.
          </p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Store Badges & Items</h3>
        <p className="text-slate-400">Items available for GP purchase in the user wallet modal.</p>
      </div>
    </div>
  );
}
