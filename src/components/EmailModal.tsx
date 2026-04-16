import { X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Lead } from '../types';

interface EmailModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export default function EmailModal({ lead, onClose }: EmailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  const respTexto = lead.isAlunoResp 
    ? "O PRÓPRIO ALUNO" 
    : `${lead.resp_nome?.toUpperCase()} (CPF: ${lead.resp_cpf})`;

  const emailText = `
ASSUNTO: PRÉ-MATRÍCULA | SENAC ${lead.unidade.toUpperCase()} - ${lead.curso.toUpperCase()} (${lead.codigo_turma})

PREZADA UNIDADE SENAC ${lead.unidade.toUpperCase()},

REGISTRAMOS UMA NOVA DEMANDA DE PRÉ-MATRÍCULA:

DADOS DO CURSO
-------------------------------------------
UNIDADE: SENAC ${lead.unidade.toUpperCase()}
CURSO: ${lead.curso.toUpperCase()}
CÓDIGO DA TURMA: ${lead.codigo_turma}
DATA DO REGISTRO: ${lead.data}

DADOS DO PROSPECT
-------------------------------------------
NOME COMPLETO: ${lead.nome.toUpperCase()}
CPF: ${lead.cpf}
DATA NASCIMENTO: ${lead.nascimento}
CONTATO: ${lead.telefone}
E-MAIL: ${lead.mail.toUpperCase()}
ENDEREÇO: ${lead.logradouro.toUpperCase()}, Nº ${lead.numero.toUpperCase()} (${lead.complemento.toUpperCase()})

GESTÃO FINANCEIRA
-------------------------------------------
RESPONSÁVEL FINANCEIRO: ${respTexto}
FORMA DE PAGAMENTO: ${lead.pagamento.toUpperCase()}
VALOR DO CURSO: R$ ${lead.valor || '0,00'}
STATUS DA DEMANDA: ${lead.status.toUpperCase()}

OBSERVAÇÕES:
${lead.obs.toUpperCase() || 'NENHUMA.'}

-------------------------------------------
ATENCIOSAMENTE,
EQUIPE DE VENDAS SALES SENAC
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-border-main w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
        >
          <div className="flex justify-between items-center p-6 md:p-8 border-b border-border-main bg-slate-50/50">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase">Conteúdo Gerado</h2>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">E-mail padronizado para envio</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-white border border-border-main w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh] md:max-h-none">
            <div className={`bg-slate-50 border border-border-main rounded-xl p-4 md:p-6 text-slate-600 font-mono text-[10px] md:text-xs leading-relaxed max-h-[280px] md:max-h-[360px] overflow-y-auto whitespace-pre-wrap transition-all ${copied ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
              {emailText}
            </div>
            
            <div className="mt-6 md:mt-8">
              <button 
                onClick={handleCopy}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-tight text-sm
                  ${copied ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-senac-blue hover:bg-senac-blue/90 text-white active:scale-95 shadow-lg shadow-senac-blue/10'}
                `}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copiado com Sucesso
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copiar Conteúdo
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
