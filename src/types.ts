export type Canal = 'INSTAGRAM' | 'SITE' | 'BALCÃO' | 'PANFLETO' | 'JORNAL' | 'CALLCENTER' | 'WHATSAPP';
export type Pagamento = 'BOLETO' | 'CARTÃO CRÉDITO' | 'PIX';
export type Status = 'PENDENTE' | 'PAGO' | 'CANCELADO';
export type Role = 'ADMIN' | 'ATENDENTE';

export interface Lead {
  id: string;
  data: string;
  canal: Canal;
  unidade: string;
  curso: string;
  codigo_turma: string;
  nome: string;
  cpf: string;
  nascimento: string;
  mail: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  isAlunoResp: boolean;
  resp_nome?: string;
  resp_cpf?: string;
  pagamento: Pagamento;
  valor: string;
  status: Status;
  atendente: string;
  obs: string;
}
