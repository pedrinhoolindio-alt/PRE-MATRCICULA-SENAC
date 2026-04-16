import { useState, useEffect, useMemo } from 'react';
import { Download, LayoutDashboard, Database, TrendingUp, Settings, FileSpreadsheet, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
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
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

import LeadForm from './components/LeadForm';
import LeadTable from './components/LeadTable';
import EmailModal from './components/EmailModal';
import { Lead } from './types';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  useEffect(() => {
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
  }, []);

  const handleSaveLead = async (leadData: Omit<Lead, 'id'>) => {
    try {
      if (editingLead) {
        const leadRef = doc(db, 'leads', editingLead.id);
        await updateDoc(leadRef, {
          ...leadData,
          updatedAt: serverTimestamp()
        });
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
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Pré-Matrículas', icon: Database },
    { label: 'Planilhas Exportadas', icon: FileSpreadsheet },
    { label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-main font-sans">
      {/* HEADER */}
      <header className="h-[60px] md:h-[70px] bg-white border-b border-border-main flex items-center justify-between px-4 md:px-10 shrink-0 z-30">
        <div className="flex items-center gap-2 font-extrabold text-lg md:text-xl tracking-tighter">
          <span className="text-senac-blue">SENAC</span>
          <em className="not-italic text-senac-orange">SALES</em>
        </div>
        <div className="flex gap-4 md:gap-10 items-center">
            <div className="hidden sm:block text-[10px] md:text-xs text-slate-500 font-medium whitespace-nowrap">Operador: <strong className="text-slate-800">Sales Intelligence</strong></div>
            <button 
              onClick={exportToExcel}
              disabled={leads.length === 0}
              className="bg-senac-blue hover:bg-senac-blue/90 text-white px-3 md:px-5 py-2 rounded-lg font-bold text-[10px] md:text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Download size={14} />
              <span className="hidden xs:inline">Exportar Base</span>
              <span className="xs:hidden">Exportar</span>
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
