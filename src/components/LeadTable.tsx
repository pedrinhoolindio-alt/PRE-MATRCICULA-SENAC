import { Lead, Status } from '../types';
import { Search, ChevronDown, Edit2, Trash2, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';

interface LeadTableProps {
  leads: Lead[];
  onStatusChange: (id: string, newStatus: Status) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (id: string) => void;
}

export default function LeadTable({ leads, onStatusChange, onEdit, onDelete }: LeadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'TODOS'>('TODOS');
  const [atendenteFilter, setAtendenteFilter] = useState<string>('TODOS');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const attendants = useMemo(() => {
    const list = Array.from(new Set(leads.map(l => l.atendente).filter(Boolean)));
    return list.sort();
  }, [leads]);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.cpf.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'TODOS' || l.status === statusFilter;
    const matchesAtendente = atendenteFilter === 'TODOS' || l.atendente === atendenteFilter;

    return matchesSearch && matchesStatus && matchesAtendente;
  });

  const handleDelete = (id: string) => {
    onDelete?.(id);
    setDeletingId(null);
  };

  if (leads.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="BUSCAR ALUNO, CURSO OU CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FCFDFF] border border-border-main rounded-lg py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-senac-blue/50 transition-all uppercase placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-border-main rounded-lg px-3 py-1.5">
            <Filter size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros:</span>
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-border-main rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-tight text-slate-600 outline-none focus:border-senac-blue/50 transition-all"
          >
            <option value="TODOS">TODOS STATUS</option>
            <option value="PENDENTE">PENDENTES</option>
            <option value="PAGO">PAGOS</option>
            <option value="CANCELADO">CANCELADOS</option>
          </select>

          <select 
            value={atendenteFilter}
            onChange={(e) => setAtendenteFilter(e.target.value)}
            className="bg-white border border-border-main rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-tight text-slate-600 outline-none focus:border-senac-blue/50 transition-all"
          >
            <option value="TODOS">TODOS ATENDENTES</option>
            {attendants.map(at => (
              <option key={at} value={at}>{at.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-0">
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Registrado</th>
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Aluno</th>
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Curso</th>
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase text-center">Infor. Atendimento</th>
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase text-center w-24">Status</th>
              <th className="pb-3 text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4 text-[11px] font-medium text-slate-500">{lead.data}</td>
                <td className="py-4 pr-4">
                  <div className="text-[13px] font-bold text-slate-800 uppercase leading-none mb-1">{lead.nome}</div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{lead.cpf || 'CPF NÃO INFORMADO'}</div>
                </td>
                <td className="py-4 pr-4">
                  <div className="text-[13px] font-bold text-senac-blue uppercase leading-none mb-1">{lead.curso}</div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">TURMA: {lead.codigo_turma}</div>
                </td>
                <td className="py-4 px-4 text-center">
                   <div className="text-[11px] font-bold text-slate-700 uppercase leading-none mb-1">{lead.atendente || 'NÃO INF.'}</div>
                   <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">R$ {lead.valor || '0,00'} • {lead.pagamento}</div>
                </td>
                <td className="py-4 text-center">
                  <div className="relative inline-block">
                    <select 
                      value={lead.status}
                      onChange={(e) => onStatusChange(lead.id, e.target.value as Status)}
                      className={`appearance-none pl-3 pr-8 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all outline-none border border-transparent
                        ${lead.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700 hover:border-emerald-200' : 
                          lead.status === 'CANCELADO' ? 'bg-red-100 text-red-700 hover:border-red-200' : 
                          'bg-amber-100 text-amber-700 hover:border-amber-200'}
                      `}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="PAGO">Pago</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2 transition-all">
                    {deletingId === lead.id ? (
                      <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100 animate-in fade-in zoom-in duration-200">
                        <span className="text-[9px] font-bold text-red-600 uppercase px-1">Excluir?</span>
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded hover:bg-red-700 transition-colors uppercase"
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-1 rounded hover:bg-slate-300 transition-colors uppercase"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => onEdit?.(lead)}
                          className="p-2 text-slate-400 hover:text-senac-blue hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-border-main"
                          title="Editar Registro"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(lead.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-border-main"
                          title="Excluir Registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-slate-50 border border-border-main rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-start border-b border-border-main pb-3">
              <div>
                <div className="text-[12px] font-extrabold text-slate-800 uppercase tracking-tight">{lead.nome}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lead.cpf}</div>
              </div>
              <div className="text-[10px] font-bold text-slate-400">{lead.data}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Curso</div>
                <div className="text-[11px] font-bold text-senac-blue uppercase leading-tight">{lead.curso}</div>
                <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase">T: {lead.codigo_turma}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Atendimento</div>
                <div className="text-[11px] font-bold text-slate-700 uppercase leading-tight">{lead.atendente || 'N/I'}</div>
                <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase">R$ {lead.valor} • {lead.pagamento}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="relative inline-block">
                <select 
                  value={lead.status}
                  onChange={(e) => onStatusChange(lead.id, e.target.value as Status)}
                  className={`appearance-none pl-3 pr-8 py-2 rounded text-[10px] font-extrabold uppercase tracking-wide cursor-pointer transition-all outline-none border border-transparent
                    ${lead.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 
                      lead.status === 'CANCELADO' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'}
                  `}
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>

              <div className="flex gap-2">
                {deletingId === lead.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(lead.id)} className="bg-red-600 text-white text-[9px] font-black px-3 py-2 rounded uppercase">VAI EXCLUIR</button>
                    <button onClick={() => setDeletingId(null)} className="bg-slate-200 text-slate-600 text-[9px] font-black px-3 py-2 rounded uppercase">NÃO</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onEdit?.(lead)} className="p-2.5 bg-white border border-border-main rounded-lg text-slate-400">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeletingId(lead.id)} className="p-2.5 bg-white border border-border-main rounded-lg text-slate-400">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredLeads.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">Nenhum registro encontrado para os filtros aplicados</div>
        </div>
      )}
    </div>
  );
}
