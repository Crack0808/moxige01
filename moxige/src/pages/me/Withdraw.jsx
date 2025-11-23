import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meWithdrawCreate, meWithdrawList, meWithdrawCancel } from "../../services/api";
import { api } from "../../services/api.js";
import { useI18n } from "../../i18n.jsx";

export default function Withdraw() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [methodType, setMethodType] = useState('bank');
  const [bankAccount, setBankAccount] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [wallets, setWallets] = useState([]);
  const [bankCards, setBankCards] = useState([]);
  const [balances, setBalances] = useState({ usd: 0, mxn: 0, usdt: 0 });
  const [toast, setToast] = useState({ show: false, text: '', type: 'ok' });

  useEffect(() => { loadRecords(); loadBindings(); loadBalances(); }, []);
  async function loadRecords() { try { const r = await meWithdrawList(); setRecords(r.items || []); } catch {} }
  async function loadBalances() {
    try {
      const r = await api.get('/me/balances');
      const arr = Array.isArray(r?.balances) ? r.balances : [];
      const map = arr.reduce((m, it) => { m[String(it.currency || '').toUpperCase()] = Number(it.amount || 0); return m; }, {});
      setBalances({ usd: Number(map.USD||0), mxn: Number(map.MXN||0), usdt: Number(map.USDT||0) });
    } catch {}
  }
  async function loadBindings() {
    try {
      const w = await api.get('/me/wallets');
      setWallets(Array.isArray(w?.wallets) ? w.wallets : []);
    } catch {
      try {
        const uid = (typeof localStorage !== 'undefined') ? (JSON.parse(localStorage.getItem('sessionUser')||'null')?.id || JSON.parse(localStorage.getItem('sessionUser')||'null')?.phone || 'guest') : 'guest';
        const arr = JSON.parse(localStorage.getItem(`wallets:${uid}`) || '[]');
        setWallets(Array.isArray(arr) ? arr : []);
      } catch {}
    }
    try {
      const c = await api.get('/me/bank-cards');
      setBankCards(Array.isArray(c?.cards) ? c.cards : []);
    } catch {
      try {
        const s = (typeof localStorage !== 'undefined') ? JSON.parse(localStorage.getItem('sessionUser')||'null') : null;
        const id = s?.id || s?.phone || 'guest';
        const cached = JSON.parse(localStorage.getItem(`bankcards:${id}`) || '[]');
        setBankCards(Array.isArray(cached) ? cached : []);
      } catch {}
    }
  }

  function onCurrencyChange(e) {
    const c = e.target.value;
    setCurrency(c);
    setMethodType(c === 'USDT' ? 'usdt' : 'bank');
    if (c === 'USDT') {
      const it = wallets && wallets.length ? wallets[0] : null;
      setUsdtAddress(it?.address || '');
      setUsdtNetwork(it?.network || '');
    } else {
      const it = bankCards && bankCards.length ? bankCards[0] : null;
      const masked = it ? `${it.bank_name || 'Bank'} ${String(it.bin||'').slice(0,4)}****${String(it.last4||'').slice(-4)}` : '';
      setBankAccount(masked);
    }
  }

  async function submit() {
    setError('');
    try {
      const curBal = currency === 'USD' ? Number(balances.usd||0) : (currency === 'MXN' ? Number(balances.mxn||0) : Number(balances.usdt||0));
      const amt = Number(amount||0);
      if (!Number.isFinite(amt) || amt <= 0) { setError(t('errorAmountInvalid') || 'Invalid amount'); return; }
      if (amt > curBal) { setError(t('errorInsufficientBalance') || 'Insufficient balance'); return; }
      const payload = { currency, amount: Number(amount||0), method_type: methodType, bank_account: bankAccount, usdt_address: usdtAddress, usdt_network: usdtNetwork };
      await meWithdrawCreate(payload);
      await loadRecords();
      await loadBalances();
      setAmount('');
      setToast({ show: true, type: 'ok', text: (t('withdrawSubmitted') || '提现申请已提交') });
      setTimeout(() => setToast({ show: false, type: 'ok', text: '' }), 1000);
    } catch (e) { setError(e?.message || '提交失败'); }
  }
  async function cancel(id) { try { await meWithdrawCancel(id); await loadRecords(); } catch {} }

  return (
    <div className="screen">
      {toast.show && (
        <div style={{ position:'fixed', top:10, left:0, right:0, display:'grid', placeItems:'center', zIndex:1000 }}>
          <div className={`top-toast ${toast.type}`}>{toast.text}</div>
        </div>
      )}
      <div className="card">
        <div className="title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{t('withdrawTitle')}</span>
          <button className="btn" onClick={()=>nav('/me/withdraw/records')}>{t('withdrawRecordsLink')}</button>
        </div>
        <div className="form">
          <label>{t('currencyLabel')}</label>
          <select value={currency} onChange={onCurrencyChange}>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
            <option value="USDT">USDT</option>
          </select>
          {currency !== 'USDT' ? (
            <>
              <label>{t('bankCardLabel')}</label>
              {bankCards.length > 0 ? (
                <select value={bankAccount} onChange={e=>setBankAccount(e.target.value)}>
                  {bankCards.map(it => {
                    const m = `${it.bank_name || 'Bank'} ${String(it.bin||'').slice(0,4)}****${String(it.last4||'').slice(-4)}`;
                    return (<option key={it.id} value={m}>{m}</option>);
                  })}
                </select>
              ) : (
                <input className="input" value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder={t('bankCardLabel')} />
              )}
            </>
          ) : (
            <>
              <label>{t('usdtAddressLabel')}</label>
              {wallets.length > 0 ? (
                <select value={usdtAddress} onChange={e=>{
                  const addr = e.target.value; setUsdtAddress(addr);
                  const it = wallets.find(w=>String(w.address)===addr);
                  setUsdtNetwork(it?.network || '');
                }}>
                  {wallets.map(it => (<option key={it.id} value={it.address}>{it.address}</option>))}
                </select>
              ) : (
                <input className="input" value={usdtAddress} onChange={e=>setUsdtAddress(e.target.value)} placeholder={t('usdtAddressLabel')} />
              )}
              <label>{t('networkLabel')}</label>
              {wallets.length > 0 ? (
                <input className="input" value={usdtNetwork} onChange={e=>setUsdtNetwork(e.target.value)} placeholder={t('networkLabel')} />
              ) : (
                <input className="input" value={usdtNetwork} onChange={e=>setUsdtNetwork(e.target.value)} placeholder={t('networkLabel')} />
              )}
            </>
          )}
          <label>{t('amountLabel')}</label>
          <input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={t('amountLabel')} />
          <div className="desc muted" style={{ marginTop: 6 }}>
            {t('balanceLabel') || '余额'}：{currency==='USD' ? Number(balances.usd||0).toFixed(2) : currency==='MXN' ? Number(balances.mxn||0).toFixed(2) : Number(balances.usdt||0).toFixed(2)} {currency}
          </div>
          {error ? <div className="error">{error}</div> : null}
          <div className="sub-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn" onClick={()=>nav('/me')}>{t('btnBackProfile')}</button>
            <button className="btn primary" onClick={submit}>{t('btnSubmitWithdraw')}</button>
          </div>
        </div>
        {/* 记录独立页面展示，当前页不再显示 */}
      </div>
    </div>
  );
}