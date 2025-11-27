import { useEffect } from "react";
import { notificationsApi } from "../services/api.js";

export default function Bridge() {
  useEffect(() => {
    const handler = (e) => {
      try {
        const data = e.data || {};
        if (data && data.type === 'get_credit_apps') {
          let items = [];
          try { items = JSON.parse(localStorage.getItem('credit:apps')||'[]'); } catch { items = []; }
          const payload = { type: 'credit_apps', items };
          e.source && e.source.postMessage(payload, e.origin);
        }
        if (data && data.type === 'add_notification') {
          try {
            const { nid, title, body } = data;
            notificationsApi.add(nid || 'guest', { title: String(title||'通知'), body: String(body||'') });
            const payload = { type: 'notification_added', ok: true };
            e.source && e.source.postMessage(payload, e.origin);
          } catch {
            const payload = { type: 'notification_added', ok: false };
            e.source && e.source.postMessage(payload, e.origin);
          }
        }
        if (data && data.type === 'add_credit_debt') {
          try {
            const { uid, amount, dueAt } = data;
            const debts = JSON.parse(localStorage.getItem('credit:debts')||'[]');
            debts.unshift({ id: `debt_${Date.now()}`, uid, amount: Number(amount||0), dueAt: Number(dueAt||Date.now()), status: 'active' });
            localStorage.setItem('credit:debts', JSON.stringify(debts));
            window.dispatchEvent(new Event('credit_debt_changed'));
            const payload = { type: 'credit_debt_added', ok: true };
            e.source && e.source.postMessage(payload, e.origin);
          } catch {
            const payload = { type: 'credit_debt_added', ok: false };
            e.source && e.source.postMessage(payload, e.origin);
          }
        }
        if (data && data.type === 'update_credit_app_status') {
          try {
            const { id, phone, amount, status } = data;
            const arr = JSON.parse(localStorage.getItem('credit:apps')||'[]');
            const next = (Array.isArray(arr)?arr:[]).map(x => {
              if ((id && x.id===id) || (String(x.phone||'')===String(phone||'') && Number(x.amount||0)===Number(amount||0))) {
                return { ...x, status: String(status||'pending') };
              }
              return x;
            });
            localStorage.setItem('credit:apps', JSON.stringify(next));
            const payload = { type: 'credit_app_updated', ok: true };
            e.source && e.source.postMessage(payload, e.origin);
          } catch {
            const payload = { type: 'credit_app_updated', ok: false };
            e.source && e.source.postMessage(payload, e.origin);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  return null;
}
