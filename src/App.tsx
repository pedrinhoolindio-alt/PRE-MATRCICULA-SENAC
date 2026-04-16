import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Download, LayoutDashboard, Database, TrendingUp, Settings, FileSpreadsheet, PieChart as PieChartIcon, BarChart3, LogOut, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { db, auth } from './firebase';

import LeadForm from './components/LeadForm';
import LeadTable from './components/LeadTable';
import EmailModal from './components/EmailModal';
import { Lead, Role } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('ATENDENTE');
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Pré-Matrículas'); 
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Determine if we need to show loading while syncing roles
          const userDocRef = doc(db, 'users', currentUser.uid);
          let syncRole: Role = 'ATENDENTE';
          
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              syncRole = userDoc.data().role as Role;
            } else {
              // Create user profile if not exists
              const defaultRole: Role = currentUser.email === 'pedrinhoolindio@gmail.com' ? 'ADMIN' : 'ATENDENTE';
              syncRole = defaultRole;
              
              const fallbackName = currentUser.email?.split('@')[0] || 'Usuário';
              const finalName = currentUser.displayName || (fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));

              await setDoc(userDocRef, {
                name: finalName,
                email: currentUser.email,
                role: defaultRole,
                createdAt: serverTimestamp()
              });
            }
          } catch (fireError) {
            console.error("Firestore sync error during auth:", fireError);
            // Fallback for role if Firestore fails but Auth succeeded
            if (currentUser.email === 'pedrinhoolindio@gmail.com') syncRole = 'ADMIN';
          }
          
          setRole(syncRole);
          if (syncRole === 'ADMIN') setActiveTab('Dashboard');
          else setActiveTab('Pré-Matrículas');
        }
        setUser(currentUser);
      } catch (authErr) {
        console.error("Auth state change processing error:", authErr);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Leads Sync (Only if authenticated)
  useEffect(() => {
    if (!user) {
      setLeads([]);
      return;
    }

    const q = query(collection(db, 'leads'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setLeads(leadsData);
    }, (error) => {
      console.error("Erro ao sincronizar Firestore:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      const errorCode = error.code;
      
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setAuthError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso. Tente fazer login.');
      } else if (errorCode === 'auth/weak-password') {
        setAuthError('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        setAuthError('O login por e-mail e senha não está ativado no Firebase Console.');
      } else if (errorCode === 'auth/too-many-requests') {
        setAuthError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setAuthError(`Erro: ${error.message || 'Ocorreu um erro ao acessar o sistema.'}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveLead = async (leadData: Omit<Lead, 'id'>) => {
    try {
      if (editingLead) {
        const leadRef = doc(db, 'leads', editingLead.id);
        const updatedLead = { ...leadData, id: editingLead.id } as Lead;
        await updateDoc(leadRef, {
          ...leadData,
          updatedAt: serverTimestamp()
        });
        setCurrentLead(updatedLead);
        setIsModalOpen(true);
        setEditingLead(null);
      } else {
        const docRef = await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        const newLead: Lead = {
          ...leadData,
          id: docRef.id,
        };
        setCurrentLead(newLead);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'leads', id));
    } catch (error) {
      console.error("Erro ao deletar do Firestore:", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      const leadRef = doc(db, 'leads', id);
      await updateDoc(leadRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao atualizar status no Firestore:", error);
    }
  };

  const exportToExcel = () => {
    if (leads.length === 0) return;
    const exportData = leads.map(l => ({
      Data: l.data,
      Canal: l.canal,
      Unidade: l.unidade,
      Curso: l.curso,
      'Cód. Turma': l.codigo_turma,
      Nome: l.nome,
      CPF: l.cpf,
      'Data Nasc.': l.nascimento,
      Email: l.mail,
      Telefone: l.telefone,
      CEP: l.cep,
      Logradouro: l.logradouro,
      Número: l.numero,
      Complemento: l.complemento,
      'Resp. Aluno?': l.isAlunoResp ? 'SIM' : 'NÃO',
      'Nome Resp.': l.resp_nome || '-',
      'CPF Resp.': l.resp_cpf || '-',
      Pagamento: l.pagamento,
      Status: l.status,
      Atendente: l.atendente,
      OBS: l.obs
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base de Leads");
    XLSX.writeFile(wb, `RELATORIO_SENAC_SALES_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = [
    { label: 'Registros Hoje', value: leads.filter(l => l.data === new Date().toISOString().split('T')[0]).length, color: 'text-slate-900' },
    { label: 'Pendentes', value: leads.filter(l => l.status === 'PENDENTE').length, color: 'text-amber-600' },
    { label: 'Arrecadação (R$)', value: leads.filter(l => l.status === 'PAGO').reduce((acc, curr) => acc + (parseFloat(curr.valor?.replace(',', '.') || '0') || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), color: 'text-emerald-600' },
    { label: 'Cancelados', value: leads.filter(l => l.status === 'CANCELADO').length, color: 'text-red-600' },
  ];

  // Dados para os gráficos
  const chartData = useMemo(() => {
    // 1. Leads por Status
    const statusCounts = leads.reduce((acc: any, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    
    const pieData = Object.keys(statusCounts).map(key => ({
      name: key === 'PAGO' ? 'Matriculado' : key === 'CANCELADO' ? 'Cancelado' : 'Pendente',
      value: statusCounts[key]
    }));

    // 2. Registros por Unidade (Top 5)
    const unitCounts = leads.reduce((acc: any, lead) => {
      acc[lead.unidade] = (acc[lead.unidade] || 0) + 1;
      return acc;
    }, {});

    const barData = Object.keys(unitCounts)
      .map(key => ({ name: key || 'N/A', total: unitCounts[key] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { pieData, barData };
  }, [leads]);

  const COLORS = ['#004587', '#FF9A00', '#EF4444', '#64748B'];

  const navItems = [
    ...(role === 'ADMIN' ? [{ label: 'Dashboard', icon: LayoutDashboard }] : []),
    { label: 'Pré-Matrículas', icon: Database },
    { label: 'Planilhas Exportadas', icon: FileSpreadsheet },
    { label: 'Configurações', icon: Settings },
  ];

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-main">
        <Loader2 className="animate-spin text-senac-blue mb-4" size={48} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Iniciando Senac Sales...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg-main p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-border-main p-8 md:p-12 rounded-[2rem] shadow-2xl shadow-senac-blue/5 max-w-md w-full"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 font-extrabold text-3xl tracking-tighter mb-2">
              <span className="text-senac-blue">SENAC</span>
              <em className="not-italic text-senac-orange">SALES</em>
            </div>
            <div className="h-1 w-12 bg-senac-orange rounded-full"></div>
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">
            {isSignUp ? 'Criar Nova Conta' : 'Acesso ao Sistema'}
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed text-center">
            {isSignUp 
              ? 'Cadastre-se para começar a gerenciar leads.' 
              : 'Entre com suas credenciais para continuar.'}
          </p>

          {email.trim().toLowerCase() === 'pedrinhoolindio@gmail.com' && !isSignUp && (
            <div className="mb-6 p-4 bg-senac-blue/5 border border-senac-blue/10 rounded-2xl">
              <div className="flex items-center gap-2 text-senac-blue mb-1">
                <ShieldCheck size={14} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Acesso Master Detectado</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Se você já criou sua senha na aba "Cadastrar-se", entre agora. Caso contrário, alterne para o cadastro primeiro.
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Corporativo</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none focus:border-senac-blue focus:ring-4 focus:ring-senac-blue/5 transition-all"
                placeholder="exemplo@gmail.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none focus:border-senac-blue focus:ring-4 focus:ring-senac-blue/5 transition-all"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 p-3 rounded-xl text-center uppercase tracking-wide"
              >
                {authError}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-senac-blue hover:bg-senac-blue/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-senac-blue/20 mt-6 disabled:opacity-50 disabled:cursor-wait"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm uppercase tracking-wider">Acessando...</span>
                </>
              ) : (
                <span className="text-sm uppercase tracking-wider">{isSignUp ? 'Cadastrar Atendente' : 'Entrar no Portal'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] font-bold text-slate-400 hover:text-senac-blue uppercase tracking-widest transition-colors underline underline-offset-4"
            >
              {isSignUp ? 'Já possui conta? Fazer Login' : 'Não tem conta? Cadastrar-se'}
            </button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Seguro</span>
            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
            <span>Cloud Sync</span>
            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
            <span>AES-256</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-main font-sans">
      {/* HEADER */}
      <header className="h-[60px] md:h-[70px] bg-white border-b border-border-main flex items-center justify-between px-4 md:px-10 shrink-0 z-30">
        <div className="flex items-center gap-2 font-extrabold text-lg md:text-xl tracking-tighter">
          <span className="text-senac-blue">SENAC</span>
          <em className="not-italic text-senac-orange">SALES</em>
        </div>
        
        <div className="flex gap-4 md:gap-8 items-center">
            <div className="hidden sm:flex items-center gap-3 border-r border-slate-100 pr-8 mr-2">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-800 uppercase leading-none mb-1">
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {role === 'ADMIN' ? <ShieldCheck size={10} className="text-emerald-500" /> : <UserIcon size={10} className="text-slate-400" />}
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{role}</span>
                  </div>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                    <UserIcon size={14} />
                  </div>
                )}
            </div>

            <button 
              onClick={exportToExcel}
              disabled={leads.length === 0}
              className="bg-senac-blue hover:bg-senac-blue/90 text-white px-3 md:px-5 py-2 rounded-lg font-bold text-[10px] md:text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Download size={14} />
              <span className="hidden xs:inline">Exportar Base</span>
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Sair do sistema"
            >
              <LogOut size={18} />
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ASIDE / SIDEBAR - Desktop only */}
        <aside className="hidden md:flex w-[240px] border-r border-border-main p-8 flex-col gap-2 shrink-0 bg-white/50">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                activeTab === item.label 
                ? 'bg-blue-50 text-senac-blue shadow-sm shadow-blue-500/5' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={18} className={activeTab === item.label ? 'text-senac-blue' : 'text-slate-400 group-hover:text-slate-500'} />
              {item.label}
            </button>
          ))}
        </aside>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-10 space-y-6 md:space-y-8 scroll-smooth pb-24 md:pb-10">
          {activeTab === 'Dashboard' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pt-2 md:pt-0">
              {/* STATS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white border border-border-main p-4 md:p-6 rounded-2xl shadow-sm">
                    <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest block mb-1 md:mb-2 text-slate-400">
                      {stat.label}
                    </span>
                    <div className={`text-xl md:text-3xl font-bold tracking-tight ${stat.color}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white border border-border-main rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-senac-blue">
                    <PieChartIcon size={16} />
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest">Conversão de Status</h3>
                  </div>
                  <div className="h-[220px] md:h-[250px] w-full">
                    {leads.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.pieData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 text-[10px] uppercase font-bold">Sem dados para exibir</div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-border-main rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-senac-blue">
                    <BarChart3 size={16} />
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest">Volume por Unidade (Top 5)</h3>
                  </div>
                  <div className="h-[220px] md:h-[250px] w-full">
                    {leads.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 8, fontWeight: 700, fill: '#64748B' }}
                            interval={0}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 8, fontWeight: 700, fill: '#64748B' }}
                          />
                          <Tooltip 
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="total" fill="#004587" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 text-[10px] uppercase font-bold">Sem dados para exibir</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Pré-Matrículas' && (
            <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pt-2 md:pt-0">
              <section>
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <h3 className="text-[10px] md:text-sm font-bold text-senac-blue uppercase tracking-[0.2em] whitespace-nowrap">
                    {editingLead ? 'Editando Registro' : 'Novo Registro'}
                  </h3>
                  <div className="h-px bg-border-main w-full"></div>
                </div>
                <LeadForm 
                  onSubmit={handleSaveLead} 
                  initialData={editingLead} 
                  onCancel={() => setEditingLead(null)} 
                />
              </section>

              <section className="bg-white border border-border-main rounded-2xl p-4 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <h3 className="text-[10px] md:text-sm font-bold text-senac-blue uppercase tracking-[0.2em] whitespace-nowrap">Banco de Dados</h3>
                  <div className="h-px bg-border-main w-full"></div>
                </div>
                <LeadTable 
                  leads={leads} 
                  onStatusChange={handleUpdateStatus} 
                  onEdit={handleEditLead}
                  onDelete={handleDeleteLead}
                  onViewEmail={(lead) => {
                    setCurrentLead(lead);
                    setIsModalOpen(true);
                  }}
                  isAdmin={role === 'ADMIN'}
                />
              </section>
            </div>
          )}

          {activeTab === 'Planilhas Exportadas' && (
            <div className="bg-white border border-border-main rounded-2xl p-10 md:p-20 text-center animate-in fade-in duration-500 mt-2 md:mt-0">
               <div className="max-w-xs mx-auto">
                 <FileSpreadsheet className="mx-auto text-slate-200 mb-6" size={48} md:size={64} />
                 <h3 className="text-base md:text-lg font-bold text-slate-800 mb-2">Histórico de Arquivos</h3>
                 <p className="text-slate-400 text-[10px] md:text-sm leading-relaxed mb-8">Todas as planilhas baixadas ficam registradas localmente para consulta rápida.</p>
                 <button className="text-senac-blue font-bold text-[10px] md:text-xs uppercase tracking-widest hover:underline">Ver Histórico</button>
               </div>
            </div>
          )}

          {activeTab === 'Configurações' && (
            <div className="bg-white border border-border-main rounded-2xl p-10 md:p-20 text-center animate-in fade-in duration-500 mt-2 md:mt-0">
               <div className="max-w-xs mx-auto">
                 <Settings className="mx-auto text-slate-200 mb-6" size={48} md:size={64} />
                 <h3 className="text-base md:text-lg font-bold text-slate-800 mb-2">Painel de Ajustes</h3>
                 <p className="text-slate-400 text-[10px] md:text-sm leading-relaxed mb-8">Personalize as unidades, cursos e permissões de acesso do sistema.</p>
                 <button className="text-senac-blue font-bold text-[10px] md:text-xs uppercase tracking-widest hover:underline">Acessar Ajustes</button>
               </div>
            </div>
          )}
        </main>

        {/* BOTTOM NAV - Mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-main px-4 py-3 flex justify-around items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.label ? 'text-senac-blue' : 'text-slate-400'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <EmailModal 
            lead={currentLead} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
