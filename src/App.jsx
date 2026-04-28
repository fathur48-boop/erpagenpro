import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  updateDoc, deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  BrainCircuit, Bot, Zap, ShieldCheck, TrendingUp, 
  Package, ShoppingCart, LayoutGrid, ChevronRight, 
  RefreshCw, Sparkles, Target, AlertTriangle, CheckCircle2, 
  Plus, Trash2, X, Receipt, Wallet, ArrowUpRight, Settings
} from 'lucide-react';

// --- MASUKKAN FIREBASE CONFIG ASLI KAMU DI SINI ---
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = "production-erp-v1";
const GEMINI_API_KEY = ""; // Kosongkan jika menggunakan sistem serverless atau masukkan key Anda

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [agentResults, setAgentResults] = useState({ auditor: null, supply: null, growth: null });
  const [showModal, setShowModal] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const path = ['artifacts', APP_ID, 'users', user.uid];
    const unsub = [
      onSnapshot(collection(db, ...path, 'products'), s => 
        setProducts(s.docs.map(d => ({id: d.id, ...d.data()})))),
      onSnapshot(collection(db, ...path, 'transactions'), s => 
        setTransactions(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b)=>b.timestamp - a.timestamp)))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user]);

  const stats = useMemo(() => {
    const revenue = transactions.reduce((s, t) => s + (t.total || 0), 0);
    const cost = transactions.reduce((s, t) => s + (t.totalCost || 0), 0);
    return { revenue, profit: revenue - cost, orders: transactions.length, lowStock: products.filter(p => p.stock < 5).length };
  }, [transactions, products]);

  const checkout = async () => {
    if (cart.length === 0 || !user) return;
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const totalCost = cart.reduce((s, i) => s + (i.cost * i.qty), 0);
    const trxData = { items: cart, total, totalCost, timestamp: Date.now(), date: new Date().toLocaleString('id-ID') };

    try {
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'transactions'), trxData);
      for (const item of cart) {
        const pRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'products', item.id);
        await updateDoc(pRef, { stock: Math.max(0, item.stock - item.qty) });
      }
      setReceiptTrx({ id: docRef.id, ...trxData });
      setCart([]);
    } catch (e) { alert("Checkout Gagal!"); }
  };

  const runAi = async () => {
    if (!user) return;
    setIsProcessingAi(true);
    // Logika fetch Gemini API (Sama seperti versi sebelumnya)
    // Simulasi loading AI
    setTimeout(() => {
      setAgentResults({
        auditor: { score: 85, insight: "Margin laba stabil di 20%.", suggestion: "Kurangi biaya operasional 5%." },
        supply: { score: 70, insight: "Stok kopi hampir habis.", suggestion: "Restock 50kg hari ini." },
        growth: { score: 90, insight: "Pelanggan menyukai promo pagi.", suggestion: "Buat promo bundling sarapan." }
      });
      setIsProcessingAi(false);
    }, 2000);
  };

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-white font-black text-indigo-600 animate-pulse"><BrainCircuit size={48} className="mb-4" /> LOADING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-[60] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><BrainCircuit size={22} /></div>
          <div><h1 className="font-black text-lg tracking-tight uppercase leading-none">ERP Agent Pro</h1><span className="text-[10px] text-emerald-500 font-bold">AI OPERATIONAL</span></div>
        </div>
        <button onClick={() => setView('ai')} className="bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 hover:scale-105 transition-all"><Zap size={14} className="text-amber-400" /> AI ANALYST</button>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
             <KPICard label="Omzet" val={formatIDR(stats.revenue)} icon={TrendingUp} color="indigo" />
             <KPICard label="Laba" val={formatIDR(stats.profit)} icon={Wallet} color="emerald" />
             <KPICard label="Pesanan" val={stats.orders} icon={Receipt} color="rose" />
             <KPICard label="Stok Kritis" val={stats.lowStock} icon={AlertTriangle} color="amber" />
          </div>
        )}

        {view === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <button key={p.id} onClick={() => setCart([...cart, {...p, qty: 1}])} className="bg-white p-6 rounded-[2rem] border shadow-sm text-left hover:border-indigo-500 transition-all">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-indigo-600 font-black">{formatIDR(p.price)}</p>
                    <div className="mt-4 text-[9px] font-black text-slate-400 uppercase">Stok: {p.stock}</div>
                  </button>
                ))}
             </div>
             <div className="bg-white border rounded-[3rem] p-8 shadow-xl h-fit sticky top-28">
                <h3 className="font-black text-xl mb-6">Keranjang</h3>
                {cart.map((item, idx) => <div key={idx} className="flex justify-between text-sm mb-2 font-bold">{item.name} <span>{formatIDR(item.price)}</span></div>)}
                <button onClick={checkout} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-6">BAYAR</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-max bg-white/90 backdrop-blur-2xl border rounded-full flex items-center gap-2 p-2 shadow-2xl z-50">
         <NavBtn icon={LayoutGrid} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
         <NavBtn icon={ShoppingCart} active={view === 'pos'} onClick={() => setView('pos')} />
         <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white cursor-pointer" onClick={() => setView('ai')}><Bot size={24}/></div>
         <NavBtn icon={Package} active={view === 'inventory'} onClick={() => setView('inventory')} />
         <NavBtn icon={Settings} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
      </nav>

      {receiptTrx && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4"/>
              <h3 className="text-2xl font-black">Berhasil!</h3>
              <p className="text-sm font-bold my-4">Total: {formatIDR(receiptTrx.total)}</p>
              <button onClick={()=>setReceiptTrx(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">TUTUP</button>
           </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ label, val, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={24}/></div>
    <div><p className="text-[10px] font-black text-slate-400 uppercase">{label}</p><h4 className="text-lg font-black">{val}</h4></div>
  </div>
);

const NavBtn = ({ icon: Icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-full transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}><Icon size={20}/></button>
);

export default App;
