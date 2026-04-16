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
    const saved = localStorage.getItem('senac-leads');
    if (saved) {
      try {
        setLeads(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar leads:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('senac-leads', JSON.stringify(leads));
  }, [leads]);

  const handleSaveLead = (leadData: Omit<Lead, 'id'>) => {
    if (editingLead) {
      const updatedLead = { ...leadData, id: editingLead.id } as Lead;
      setLeads(prev => prev.map(l => l.id === editingLead.id ? updatedLead : l));
      setEditingLead(null);
    } else {
      const newLead: Lead = {
        ...leadData,
        id: crypto.randomUUID(),
      };
      setLeads(prev => [newLead, ...prev]);
      setCurrentLead(newLead);
      setIsModalOpen(true);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateStatus = (id: string, newStatus: any) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
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
      <header className="h-[70px] bg-white border-b border-border-main flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-2 font-extrabold text-xl tracking-tighter">
          <span className="text-senac-blue">SENAC</span>
          <em className="not-italic text-senac-orange">SALES</em>
        </div>
        <div className="flex gap-10 items-center">
            <div className="text-xs text-slate-500 font-medium">Operador: <strong className="text-slate-800">Sales Intelligence</strong></div>
            <button 
              onClick={exportToExcel}
              disabled={leads.length === 0}
              className="bg-senac-blue hover:bg-senac-blue/90 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Download size={14} />
              Exportar Base
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ASIDE */}
        <aside className="w-[240px] border-r border-border-main p-8 flex flex-col gap-2 shrink-0 bg-white/50">
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
        <main className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth">
          {activeTab === 'Dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* STATS */}
              <div className="grid grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white border border-border-main p-6 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold tracking-widest block mb-2 text-slate-400">
                      {stat.label}
                    </span>
                    <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-border-main rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-senac-blue">
                    <PieChartIcon size={16} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Conversão de Status</h3>
                  </div>
                  <div className="h-[250px] w-full">
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

                <div className="bg-white border border-border-main rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-senac-blue">
                    <BarChart3 size={16} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Volume por Unidade (Top 5)</h3>
                  </div>
                  <div className="h-[250px] w-full">
                    {leads.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                            interval={0}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                          />
                          <Tooltip 
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="total" fill="#004587" radius={[4, 4, 0, 0]} barSize={40} />
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
            <div className="space-y-12 animate-in fade-in duration-500">
              {/* REST OF THE TABS REMAIN THE SAME */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-sm font-bold text-senac-blue uppercase tracking-widest whitespace-nowrap">
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

              <section className="bg-white border border-border-main rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-sm font-bold text-senac-blue uppercase tracking-widest whitespace-nowrap">Banco de Dados</h3>
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
            <div className="bg-white border border-border-main rounded-2xl p-20 text-center animate-in fade-in duration-500">
               <div className="max-w-xs mx-auto">
                 <FileSpreadsheet className="mx-auto text-slate-200 mb-6" size={64} />
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Histórico de Arquivos</h3>
                 <p className="text-slate-400 text-sm leading-relaxed mb-8">Todas as planilhas baixadas ficam registradas localmente para consulta rápida.</p>
                 <button className="text-senac-blue font-bold text-xs uppercase tracking-widest hover:underline">Ver Histórico</button>
               </div>
            </div>
          )}

          {activeTab === 'Configurações' && (
            <div className="bg-white border border-border-main rounded-2xl p-20 text-center animate-in fade-in duration-500">
               <div className="max-w-xs mx-auto">
                 <Settings className="mx-auto text-slate-200 mb-6" size={64} />
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Painel de Ajustes</h3>
                 <p className="text-slate-400 text-sm leading-relaxed mb-8">Personalize as unidades, cursos e permissões de acesso do sistema.</p>
                 <button className="text-senac-blue font-bold text-xs uppercase tracking-widest hover:underline">Acessar Ajustes</button>
               </div>
            </div>
          )}
        </main>
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
