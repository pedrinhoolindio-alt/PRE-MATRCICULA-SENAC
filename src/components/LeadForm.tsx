import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Lead, Canal, Pagamento, Status } from '../types';
import { maskCPF, maskTel, maskCEP } from '../utils/masks';
import { Send, MapPin, CreditCard, User, GraduationCap, Save, X } from 'lucide-react';

interface LeadFormProps {
  onSubmit: (lead: Omit<Lead, 'id'>) => void;
  initialData?: Lead | null;
  onCancel?: () => void;
}

export default function LeadForm({ onSubmit, initialData, onCancel }: LeadFormProps) {
  const emptyState = {
    data: new Date().toISOString().split('T')[0],
    canal: 'WHATSAPP' as Canal,
    unidade: '',
    curso: '',
    codigo_turma: '',
    nome: '',
    cpf: '',
    nascimento: '',
    mail: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    isAlunoResp: true,
    resp_nome: '',
    resp_cpf: '',
    pagamento: 'BOLETO' as Pagamento,
    valor: '',
    status: 'PENDENTE' as Status,
    atendente: '',
    obs: '',
  };

  const [formData, setFormData] = useState(emptyState);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(emptyState);
    }
  }, [initialData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (typeof value === 'string' && name !== 'mail' && name !== 'data' && name !== 'nascimento' && type !== 'date') {
      // Converte para caixa alta exceto email e campos de data
      newValue = value.toUpperCase();
    }

    if (name === 'cpf' || name === 'resp_cpf') newValue = maskCPF(newValue);
    if (name === 'telefone') newValue = maskTel(newValue);
    if (name === 'cep') newValue = maskCEP(newValue);

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const buscaCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if (!d.erro) {
          setFormData(prev => ({
            ...prev,
            logradouro: d.logradouro.toUpperCase(),
            complemento: `${d.bairro}, ${d.localidade}-${d.uf}`.toUpperCase()
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) setFormData(emptyState);
  };

  const inputClass = "bg-[#FCFDFF] border border-border-main text-slate-800 rounded-lg p-3 text-sm w-full transition-all focus:border-senac-blue focus:ring-4 focus:ring-senac-blue/5 outline-none placeholder:text-slate-400 font-medium";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block";
  const sectionHeader = "text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3 text-senac-blue";
  const sectionLine = "h-px bg-border-main flex-1";

  return (
    <form onSubmit={handleSubmit} className={`bg-white border rounded-2xl p-4 md:p-8 shadow-sm transition-all ${initialData ? 'border-senac-orange ring-4 ring-senac-orange/5' : 'border-border-main'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* LADO ESQUERDO */}
        <div className="space-y-8 md:space-y-10">
          {/* DADOS DO CURSO */}
          <section>
            <h3 className={sectionHeader}>
              <GraduationCap size={14} className="opacity-50" />
              {initialData ? 'Editando Pré-Matrícula' : 'Dados da Pré-Matrícula'}
              <span className={sectionLine}></span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="field">
                <label className={labelClass}>Data</label>
                <input type="date" name="data" value={formData.data} onChange={handleChange} className={inputClass} required />
              </div>
              <div className="field">
                <label className={labelClass}>Canal</label>
                <select name="canal" value={formData.canal} onChange={handleChange} className={inputClass}>
                  <option value="WHATSAPP">WHATSAPP</option>
                  <option value="INSTAGRAM">INSTAGRAM</option>
                  <option value="SITE">SITE</option>
                  <option value="BALCÃO">BALCÃO</option>
                  <option value="PANFLETO">PANFLETO</option>
                  <option value="JORNAL">JORNAL</option>
                  <option value="CALLCENTER">CALLCENTER</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="col-span-1">
                <label className={labelClass}>Unidade</label>
                <input type="text" name="unidade" placeholder="EX: CENTRO" value={formData.unidade} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2 lg:col-span-2">
                <label className={labelClass}>Nome do Curso</label>
                <input type="text" name="curso" placeholder="EX: TÉC. EM ENFERMAGEM" value={formData.curso} onChange={handleChange} className={inputClass} required />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Turma</label>
                <input type="text" name="codigo_turma" placeholder="2024.1" value={formData.codigo_turma} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nome Completo do Aluno</label>
              <input type="text" name="nome" placeholder="EX: MARIA OLIVEIRA SANTOS" value={formData.nome} onChange={handleChange} className={inputClass} required />
            </div>
          </section>

          {/* IDENTIFICAÇÃO */}
          <section>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className={labelClass}>CPF do Aluno</label>
                <input type="text" name="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} className={inputClass} />
              </div>
              <div className="field">
                <label className={labelClass}>Nascimento</label>
                <input type="date" name="nascimento" value={formData.nascimento} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </section>
        </div>

        {/* LADO DIREITO */}
        <div className="space-y-8 md:space-y-10">
          {/* CONTATO E ENDEREÇO */}
          <section>
            <h3 className={sectionHeader}>
              <MapPin size={14} className="opacity-50" />
              Contato & Financeiro
              <span className={sectionLine}></span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="field">
                <label className={labelClass}>E-mail</label>
                <input type="email" name="mail" placeholder="aluno@exemplo.com" value={formData.mail} onChange={handleChange} className={inputClass} />
              </div>
              <div className="field">
                <label className={labelClass}>Telefone</label>
                <input type="text" name="telefone" placeholder="(00) 00000-0000" value={formData.telefone} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="w-1/3">
                <label className={labelClass}>CEP</label>
                <input type="text" name="cep" value={formData.cep} onChange={handleChange} onBlur={buscaCEP} className={inputClass} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Logradouro</label>
                <input type="text" name="logradouro" value={formData.logradouro} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-1">
                <label className={labelClass}>Número</label>
                <input type="text" name="numero" placeholder="EX: 123" value={formData.numero} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Complemento / Bairro</label>
                <input type="text" name="complemento" placeholder="SALA, APTO OU REFERÊNCIA" value={formData.complemento} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="field">
                <label className={labelClass}>Forma de Pagamento</label>
                <select name="pagamento" value={formData.pagamento} onChange={handleChange} className={inputClass}>
                  <option value="BOLETO">BOLETO BANCÁRIO</option>
                  <option value="CARTÃO CRÉDITO">CARTÃO DE CRÉDITO</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>
              <div className="field">
                <label className={labelClass}>Valor (R$)</label>
                <input type="text" name="valor" placeholder="0,00" value={formData.valor} onChange={handleChange} className={inputClass} />
              </div>
              <div className="field">
                <label className={labelClass}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="PAGO">PAGO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Nome do Atendente</label>
              <input type="text" name="atendente" placeholder="EX: JOÃO SILVA" value={formData.atendente} onChange={handleChange} className={inputClass} />
            </div>
          </section>

          {/* RESPONSAVEL CHECK */}
          <section className="bg-slate-50 p-4 rounded-xl border border-border-main/50">
             <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  name="isAlunoResp"
                  checked={formData.isAlunoResp} 
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-border-main bg-white cursor-pointer accent-senac-blue"
                />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-none pt-0.5">Aluno é o responsável financeiro</span>
              </label>

              {!formData.isAlunoResp && (
                <div className="mt-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="field">
                    <label className={labelClass}>Nome do Responsável</label>
                    <input type="text" name="resp_nome" value={formData.resp_nome} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="field">
                    <label className={labelClass}>CPF do Responsável</label>
                    <input type="text" name="resp_cpf" value={formData.resp_cpf} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              )}
          </section>
        </div>
      </div>

      <div className="mt-10 flex flex-col md:flex-row gap-4 items-stretch border-t border-border-main pt-8">
        <div className="flex-1">
          <label className={labelClass}>Observações</label>
          <textarea 
            name="obs" 
            placeholder="NOTAS ADICIONAIS SOBRE O CURSO OU FORMA DE PAGAMENTO..." 
            value={formData.obs}
            onChange={handleChange}
            className={`${inputClass} h-[52px] resize-none pt-2`}
          ></textarea>
        </div>
        <div className="flex gap-4">
          {initialData && onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="px-8 bg-white border border-border-main text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              <X size={14} />
              Cancelar
            </button>
          )}
          <button 
            type="submit" 
            className={`md:w-72 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-lg ${
              initialData 
              ? 'bg-senac-orange hover:bg-senac-orange/90 text-white shadow-senac-orange/10' 
              : 'bg-senac-blue hover:bg-senac-blue/90 text-white shadow-senac-blue/10'
            }`}
          >
            <span className="uppercase tracking-widest text-xs flex items-center gap-2">
              {initialData ? <Save size={14} /> : null}
              {initialData ? 'Atualizar Registro' : 'Salvar & Gerar'}
            </span>
            {!initialData && <span className="text-[10px] opacity-70 font-medium">E-mail Padronizado</span>}
          </button>
        </div>
      </div>
    </form>
  );
}
