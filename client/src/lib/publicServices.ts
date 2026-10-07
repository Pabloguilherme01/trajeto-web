import { matchesCatalogText, normalizeCatalogText } from "./catalogSearch";

export type PublicServiceCategory =
  | "saude"
  | "seguranca"
  | "assistencia"
  | "transito"
  | "educacao"
  | "cidadania"
  | "trabalho"
  | "moradia"
  | "servicos-urbanos"
  | "justica"
  | "digital"
  | "ambiente"
  | "agricultura"
  | "consumidor"
  | "tributos"
  | "inclusao"
  | "mulher"
  | "animais"
  | "idoso"
  | "empreendedor"
  | "licenciamento"
  | "cultura"
  | "esporte"
  | "juventude"
  | "transparencia"
  | "agua-energia"
  | "telecom"
  | "previdencia"
  | "documentos";

export type PublicService = {
  id: string;
  name: string;
  category: PublicServiceCategory;
  description: string;
  address?: string;
  phone?: string;
  extraPhone?: string;
  hours?: string;
  email?: string;
  actionUrl?: string;
  actionLabel?: string;
  guidance?: string;
  documents?: string[];
  keywords?: string[];
  whatsappOnly?: string[];
  verifiedAt?: string;
  sourceLabel:
    | "Prefeitura de Águas Lindas"
    | "Polícia Civil de Goiás"
    | "SEDUC Goiás"
    | "SES-GO"
    | "SEAD Goiás"
    | "Ministério das Mulheres"
    | "Direitos Humanos e Cidadania"
    | "Saneago"
    | "Equatorial Goiás"
    | "Ministério do Trabalho e Emprego"
    | "INSS"
    | "Receita Federal"
    | "CNES/DATASUS"
    | "Ministério da Saúde"
    | "Desenvolvimento Social de Goiás"
    | "Ministério do Desenvolvimento Social"
    | "Tribunal Superior Eleitoral"
    | "Ministério da Justiça"
    | "Ministério da Defesa"
    | "Governo Digital"
    | "Anatel"
    | "Ibama"
    | "ANEEL"
    | "Detran-GO"
    | "Senatran"
    | "Defensoria Pública de Goiás"
    | "Tribunal de Justiça de Goiás"
    | "Empresas & Negócios"
    | "Secretaria Nacional de Juventude";
  sourceUrl: string;
  mapQuery?: string;
};

export const PUBLIC_SERVICE_CATEGORIES: Array<{
  id: PublicServiceCategory | "todos";
  label: string;
  shortLabel: string;
}> = [
  { id: "todos", label: "Tudo", shortLabel: "Tudo" },
  { id: "saude", label: "Saúde", shortLabel: "Saúde" },
  { id: "seguranca", label: "Segurança", shortLabel: "Segurança" },
  { id: "assistencia", label: "Assistência", shortLabel: "Assistência" },
  { id: "transito", label: "Trânsito", shortLabel: "Trânsito" },
  { id: "educacao", label: "Educação", shortLabel: "Educação" },
  { id: "cidadania", label: "Cidadania", shortLabel: "Cidadania" },
  { id: "trabalho", label: "Trabalho e renda", shortLabel: "Trabalho" },
  { id: "moradia", label: "Moradia", shortLabel: "Moradia" },
  { id: "servicos-urbanos", label: "Cidade e serviços", shortLabel: "Cidade" },
  { id: "tributos", label: "Tributos e notas", shortLabel: "Tributos" },
  { id: "inclusao", label: "Inclusão e igualdade", shortLabel: "Inclusão" },
  { id: "mulher", label: "Mulher e proteção", shortLabel: "Mulher" },
  { id: "animais", label: "Animais e zoonoses", shortLabel: "Animais" },
  { id: "idoso", label: "Pessoa idosa", shortLabel: "Idoso" },
  { id: "empreendedor", label: "Empreendedor e empresas", shortLabel: "Empreender" },
  { id: "licenciamento", label: "Licenças e alvarás", shortLabel: "Licenças" },
  { id: "cultura", label: "Cultura e turismo", shortLabel: "Cultura" },
  { id: "esporte", label: "Esporte e lazer", shortLabel: "Esporte" },
  { id: "juventude", label: "Juventude", shortLabel: "Juventude" },
  { id: "transparencia", label: "Transparência e participação", shortLabel: "Transparência" },
  { id: "agua-energia", label: "Água e energia", shortLabel: "Água e energia" },
  { id: "telecom", label: "Internet e telefonia", shortLabel: "Internet e telefone" },
  { id: "previdencia", label: "INSS e benefícios", shortLabel: "INSS" },
  { id: "documentos", label: "Documentos e certidões", shortLabel: "Documentos" },
  { id: "digital", label: "Serviços digitais", shortLabel: "Digital" },
  { id: "ambiente", label: "Meio ambiente", shortLabel: "Ambiente" },
  { id: "agricultura", label: "Agricultura e abastecimento", shortLabel: "Agricultura" },
  { id: "consumidor", label: "Defesa do consumidor", shortLabel: "Consumidor" },
  { id: "justica", label: "Justiça e direitos", shortLabel: "Justiça" },
];

const PREFEITURA_CONTATOS = "https://aguaslindasdegoias.go.gov.br/contatos/";
const TELEFONES_UTEIS = "https://aguaslindasdegoias.go.gov.br/telefones-uteis/";
const UPA =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/upa/";
const HMBJ =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/hospital-municipal-bom-jesus/";
const HMBJ_CNES =
  "https://cnes2.datasus.gov.br/Mod_Conjunto.asp?VCo_Unidade=5200252442728";
const CAPS =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/caps-centro-de-atencao-psicossocial/";
const UNIDADES_SAUDE =
  "https://aguaslindasdegoias.go.gov.br/unidades-de-saude/";
const TRANSITO =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-transito-e-mobilidade-urbana/";
const CT =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/conselho-tutelar/";
const PCGO =
  "https://goias.gov.br/policiacivil/telefones-enderecos-e-horarios-de-atendimento/";
const PCGO_REGIONAIS =
  "https://goias.gov.br/policiacivil/delegacias-regionais/";
const SEDUC =
  "https://goias.gov.br/educacao/lista-de-escolas-rede-estadual-de-educacao/";
const ASSISTENCIA =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/";
const HEAL = "https://goias.gov.br/saude/heal/";

export const PUBLIC_SERVICES: PublicService[] = [
  {
    id: "alvara-funcionamento-municipal",
    name: "Alvará de funcionamento · abrir ou regularizar empresa",
    category: "licenciamento",
    description:
      "Orientação para licenciamento e renovação do alvará de funcionamento de atividades comerciais, industriais e de serviços em Águas Lindas de Goiás.",
    keywords: [
      "alvara funcionamento",
      "alvará funcionamento",
      "licenca funcionamento",
      "licença funcionamento",
      "abrir empresa",
      "regularizar empresa",
      "sigfacil",
      "redesim",
      "viabilidade",
    ],
    actionUrl: "https://www.portaldoempreendedorgoiano.go.gov.br/s/consulta-de-informacao/matriz",
    actionLabel: "Consultar exigências no SIGFÁCIL",
    guidance:
      "A Prefeitura orienta iniciar a viabilidade pelo Portal do Empreendedor Goiano/SIGFÁCIL. A Lei municipal nº 1.787/2025 prevê validade de 5 anos para o alvará de funcionamento, salvo situações específicas, com renovação no último ano de vigência.",
    verifiedAt: "07/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/portaria-n-o01-2024-define-e-regulamenta-os-procedimentos-de-licenciamento-e-renovacao-do-alvara-de-funcionamento-e-da-outras-providencias-smde/",
  },
  {
    id: "alvara-construcao-loteamento",
    name: "Alvará de construção e licença para loteamento",
    category: "licenciamento",
    description:
      "Referência municipal para aprovação e licenciamento de construção, reforma, ampliação, demolição e loteamento.",
    keywords: [
      "alvara construcao",
      "alvará construção",
      "licenca obra",
      "licença obra",
      "construcao",
      "construção",
      "reforma",
      "ampliacao",
      "ampliação",
      "demolicao",
      "demolição",
      "loteamento",
      "projeto obra",
    ],
    guidance:
      "A legislação municipal atual exige alvará para execução de obras e prevê taxa no protocolo do requerimento de análise de projeto de obra ou loteamento. Consulte a Prefeitura antes de iniciar a execução.",
    verifiedAt: "07/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://legislacao.aguaslindasdegoias.go.gov.br/leis/1723",
  },
  {
    id: "licenciamento-sanitario-municipal",
    name: "Licenciamento sanitário e Alvará de Licença Sanitária",
    category: "licenciamento",
    description:
      "Orientação municipal para atividades sujeitas à Vigilância Sanitária, incluindo licenciamento de estabelecimentos de médio e alto risco.",
    keywords: [
      "licenciamento sanitario",
      "licenciamento sanitário",
      "alvara sanitario",
      "alvará sanitário",
      "vigilancia sanitaria",
      "vigilância sanitária",
      "licenca sanitaria",
      "licença sanitária",
      "risco sanitario",
      "risco sanitário",
    ],
    guidance:
      "O Código Sanitário municipal de 2026 prevê licenciamento obrigatório para atividades de médio e alto risco e procedimento preferencialmente eletrônico, vinculado à inscrição municipal. Atividades de baixo risco podem ter dispensa conforme a classificação aplicável.",
    verifiedAt: "07/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://legislacao.aguaslindasdegoias.go.gov.br/leis/1628",
  },
  {
    id: "secretaria-agricultura-abastecimento",
    name: "Secretaria Municipal de Agricultura e Abastecimento",
    category: "agricultura",
    description:
      "Atendimento municipal para agricultura familiar, produção agropecuária, abastecimento e orientação ao produtor rural.",
    address:
      "Área Especial 01, Condomínio Embaixador, Águas Lindas de Goiás - GO",
    phone: "(61) 99310-6862",
    email: "agricultura@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    keywords: [
      "agricultura",
      "agricultor",
      "produtor rural",
      "agricultura familiar",
      "agropecuaria",
      "pecuaria",
      "abastecimento",
      "producao rural",
    ],
    guidance:
      "Entre em contato antes de se deslocar para confirmar o atendimento indicado para sua necessidade e os documentos eventualmente exigidos.",
    verifiedAt: "07/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-agricultura/",
    mapQuery:
      "Secretaria Municipal de Agricultura e Abastecimento, Condomínio Embaixador, Águas Lindas de Goiás, GO",
  },
  {
    id: "celular-seguro",
    name: "Celular Seguro · bloquear aparelho e linha",
    category: "seguranca",
    description:
      "Programa federal para registrar aparelho, emitir alerta de roubo, furto ou perda e acionar bloqueios integrados.",
    keywords: [
      "celular roubado",
      "celular furtado",
      "perdi celular",
      "bloquear imei",
      "bloquear chip",
      "celular seguro",
    ],
    actionUrl: "https://celularseguro.mj.gov.br/",
    actionLabel: "Abrir Celular Seguro",
    guidance:
      "Entre com a conta gov.br. Se possível, cadastre o aparelho e uma pessoa de confiança antes de uma ocorrência. Em caso de crime, registre também o boletim de ocorrência pelos canais oficiais.",
    sourceLabel: "Ministério da Justiça",
    sourceUrl:
      "https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro/celular-seguro/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "tarifa-social-energia",
    name: "Tarifa Social de Energia Elétrica",
    category: "agua-energia",
    description:
      "Regras oficiais do benefício na conta de luz para famílias elegíveis pelo CadÚnico ou BPC.",
    keywords: [
      "tarifa social",
      "desconto energia",
      "conta luz baixa renda",
      "cadunico energia",
      "bpc energia",
    ],
    actionUrl: "https://www.gov.br/aneel/pt-br/assuntos/tarifas/tarifa-social",
    actionLabel: "Consultar regras da Tarifa Social",
    guidance:
      "A concessão é automática quando os cadastros e a titularidade atendem às regras. Se você se enquadra e o benefício não aparece na fatura, confirme seus dados no CadÚnico/BPC e fale com a distribuidora.",
    sourceLabel: "ANEEL",
    sourceUrl: "https://www.gov.br/aneel/pt-br/assuntos/tarifas/tarifa-social",
    verifiedAt: "06/10/2026",
  },
  {
    id: "nota-fiscal-iss",
    name: "Nota Fiscal eletrônica e ISS · Águas Lindas",
    category: "tributos",
    description:
      "Canal municipal para dúvidas e atendimento sobre Nota Fiscal eletrônica e ISS.",
    phone: "(61) 99305-7551",
    whatsappOnly: ["(61) 99305-7551"],
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    keywords: ["nota fiscal", "nfe", "nfse", "iss", "prestador", "tributo municipal"],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/servico/nota-fiscal-eletronica/",
    actionLabel: "Abrir serviço de Nota Fiscal",
    guidance:
      "O número informado pela Prefeitura é de atendimento por WhatsApp para Nota Fiscal/ISS. Confirme no canal oficial os documentos e a etapa adequada antes de se deslocar.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/servico/nota-fiscal-eletronica/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "itbi-municipal",
    name: "ITBI · atendimento tributário municipal",
    category: "tributos",
    description:
      "Canal da fiscalização tributária para orientações relacionadas ao ITBI em Águas Lindas.",
    phone: "(61) 92005-3453",
    whatsappOnly: ["(61) 92005-3453"],
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    keywords: ["itbi", "imovel", "transferencia imovel", "tributo municipal"],
    guidance:
      "O canal de ITBI é informado pela Secretaria de Fazenda como atendimento somente por WhatsApp. Confirme documentos, valores e procedimento diretamente com a Prefeitura.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-economia/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "secretaria-pcd-igualdade",
    name: "Secretaria da Pessoa com Deficiência e da Igualdade Racial",
    category: "inclusao",
    description:
      "Atendimento municipal sobre direitos da pessoa com deficiência, igualdade racial, diversidade e ações afirmativas.",
    address:
      "Quadra 32, Lote 11, Rua 20, Instituto Marques Paiva, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99304-9971",
    email: "smdracial@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    keywords: ["pcd", "pessoa com deficiencia", "igualdade racial", "acessibilidade", "inclusao"],
    guidance:
      "Entre em contato para confirmar o atendimento indicado para sua necessidade e os documentos necessários.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-da-pessoa-com-deficiencia-e-da-igualdade-racial/",
    mapQuery:
      "Secretaria Municipal da Pessoa com Deficiência e da Igualdade Racial, Quadra 32, Lote 11, Rua 20, Jardim Brasília, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "apreensao-animais",
    name: "Apreensão de animais · Trânsito e Mobilidade",
    category: "animais",
    description:
      "Canal municipal divulgado pela Secretaria de Trânsito para solicitações relacionadas à apreensão de animais.",
    phone: "(61) 92003-6679",
    keywords: ["apreensao animais", "animal solto", "animais na via", "risco transito"],
    guidance:
      "Use este contato para a finalidade indicada pela Prefeitura. Em situação de risco imediato a pessoas ou acidente, acione o serviço de emergência adequado.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-transito-e-mobilidade-urbana/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "emitir-taxas-municipais",
    name: "Emitir impostos e taxas municipais",
    category: "tributos",
    description:
      "Serviço oficial da Prefeitura para emissão de impostos e taxas municipais pelo sistema SIG.",
    keywords: [
      "emitir taxas",
      "taxas municipais",
      "impostos municipais",
      "iptu",
      "segunda via imposto",
      "tributos",
    ],
    actionUrl: "https://aguaslindas.prodataweb.inf.br/sig/app.html",
    actionLabel: "Abrir emissão de taxas",
    guidance:
      "A página oficial da Prefeitura direciona este serviço ao SIG municipal. Se o sistema solicitar autenticação ou não exibir o tributo procurado, confirme o atendimento com a Secretaria de Fazenda.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/servico/emitir-taxas/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "bem-estar-animal-castracao",
    name: "Bem-Estar Animal · castração de cães e gatos",
    category: "animais",
    description:
      "Projeto municipal voltado ao controle populacional de cães e gatos e à prevenção de doenças por meio de castração.",
    keywords: [
      "castracao",
      "castração",
      "bem estar animal",
      "cao",
      "cão",
      "gato",
      "zoonoses",
      "animal",
    ],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/servico/projeto-bem-estar-animal/",
    actionLabel: "Abrir serviço de Bem-Estar Animal",
    guidance:
      "Use a página oficial para acessar o serviço e conferir as regras e a disponibilidade atuais antes de solicitar o atendimento.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/servico/projeto-bem-estar-animal/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "vigilancia-saude-zoonoses",
    name: "Vigilância em Saúde · zoonoses",
    category: "animais",
    description:
      "Canal municipal da Vigilância em Saúde para orientação e encaminhamento de situações relacionadas a zoonoses e riscos à saúde pública.",
    phone: "(61) 3618-1409",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    email: "saude@aguaslindasdegoias.go.gov.br",
    address:
      "Avenida Brasília, Quadra 109, Lote 30/32, Conjunto B, Setor 10, Águas Lindas de Goiás - GO",
    keywords: [
      "zoonoses",
      "vigilancia em saude",
      "animal doente",
      "doenca animal",
      "morcego",
      "raiva animal",
      "vetores",
    ],
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/vigilancia-em-saude/",
    actionLabel: "Abrir Vigilância em Saúde",
    guidance:
      "A estrutura municipal de 2026 inclui um Departamento de Zoonoses. Use o contato da Vigilância em Saúde para confirmar o encaminhamento adequado antes de se deslocar.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://legislacao.aguaslindasdegoias.go.gov.br/leis/1606",
    mapQuery:
      "Vigilância em Saúde, Avenida Brasília, Quadra 109, Lote 30/32, Conjunto B, Setor 10, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "atendimento-juventude",
    name: "Atendimento municipal à juventude",
    category: "juventude",
    description: "Canal municipal para orientação sobre políticas, direitos, participação social e inclusão de adolescentes e jovens.",
    phone: "(61) 99291-2169",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    keywords: ["juventude", "jovem", "direitos jovem", "conselho juventude", "participacao jovem", "inclusao jovem"],
    guidance: "Use o contato institucional para confirmar qual equipe ou programa atende sua demanda. A página municipal atual vincula a juventude à estrutura de assistência social e cidadania; esta ficha não presume inscrição ou programa aberto.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "id-jovem",
    name: "ID Jovem · meia-entrada e transporte interestadual",
    category: "juventude",
    description: "Carteira digital para jovens de baixa renda com benefícios de meia-entrada e vagas gratuitas ou com desconto no transporte interestadual.",
    keywords: ["id jovem", "identidade jovem", "meia entrada jovem", "passagem jovem", "transporte interestadual jovem", "cadunico jovem"],
    actionUrl: "https://idjovem.juventude.gov.br/emitir-id-jovem",
    actionLabel: "Emitir ID Jovem",
    guidance: "O programa atende jovens de 15 a 29 anos, com renda familiar de até dois salários mínimos e Cadastro Único atualizado. CPF ou NIS podem ser usados conforme as regras atuais do programa.",
    sourceLabel: "Secretaria Nacional de Juventude",
    sourceUrl: "https://idjovem.juventude.gov.br/emitir-id-jovem",
    verifiedAt: "06/10/2026",
  },
  {
    id: "aprendizagem-profissional-jovem",
    name: "Aprendizagem Profissional · Jovem Aprendiz",
    category: "juventude",
    description: "Informações oficiais sobre contratos de aprendizagem e consulta de entidades e cursos autorizados para adolescentes e jovens.",
    keywords: ["jovem aprendiz", "aprendiz", "primeiro emprego", "aprendizagem profissional", "curso aprendiz", "vaga aprendiz"],
    actionUrl: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/aprendizagem-profissional",
    actionLabel: "Consultar Aprendizagem Profissional",
    guidance: "A política atende, em regra, jovens de 14 a 24 anos; para pessoas com deficiência não há limite máximo de idade. Consulte cursos autorizados na sua localidade. A página não representa vaga aberta garantida.",
    sourceLabel: "Ministério do Trabalho e Emprego",
    sourceUrl: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/aprendizagem-profissional",
    verifiedAt: "06/10/2026",
  },
  {
    id: "secretaria-esporte-lazer",
    name: "Secretaria Municipal de Esporte e Lazer",
    category: "esporte",
    description: "Canal municipal para informações sobre esporte, lazer, projetos, competições, atividades comunitárias e políticas esportivas.",
    phone: "(61) 99310-2157",
    email: "esporteelazer@aguaslindasdegoias.go.gov.br",
    keywords: ["esporte", "lazer", "secretaria esporte", "atividade fisica", "campeonato", "torneio", "projeto esportivo"],
    guidance: "Entre em contato para confirmar programação, inscrições, locais e requisitos atuais. A legislação municipal de 2026 atribui à Secretaria a execução de projetos e programas de esporte e lazer.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/contatos/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "projeto-multiesportes",
    name: "Projeto MultiEsportes · informações oficiais",
    category: "esporte",
    description: "Projeto municipal previsto em parceria oficial para atividades educacionais, recreativas e formação esportiva em modalidades como karatê, futsal, vôlei, basquete, futebol e taekwondo.",
    keywords: ["multiesportes", "karate", "futsal", "volei", "basquete", "futebol", "taekwondo", "esporte crianca", "esporte adolescente"],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/prefeitura-de-aguas-lindas-por-intermedio-da-secretaria-de-esporte-torna-publico-o-edital-de-chamamento-publico-visando-a-selecao-de-organizacao-da-sociedade-civil-interessada-em-celebrar-termo-de-c/",
    actionLabel: "Consultar Projeto MultiEsportes",
    guidance: "O edital de 2025 documenta a execução do projeto, mas não implica turma ou vaga aberta hoje. Confirme calendário, inscrições e locais atuais com a Secretaria de Esporte e Lazer.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/prefeitura-de-aguas-lindas-por-intermedio-da-secretaria-de-esporte-torna-publico-o-edital-de-chamamento-publico-visando-a-selecao-de-organizacao-da-sociedade-civil-interessada-em-celebrar-termo-de-c/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "secretaria-cultura-turismo",
    name: "Secretaria Municipal de Cultura e Turismo",
    category: "cultura",
    description: "Atendimento municipal de cultura e turismo, orientação a agentes culturais, editais, projetos e serviços da política cultural.",
    whatsappOnly: ["(61) 99310-0497"],
    email: "cultura@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 08h–12h e 14h–18h",
    address: "Instituto Marques Paiva, Rua 20, Quadra 32, Lote 11, Jardim Brasília, Sala 2, 3º andar, Águas Lindas de Goiás - GO",
    keywords: ["cultura", "turismo", "secretaria cultura", "agente cultural", "artista", "evento cultural"],
    actionUrl: "https://cultura.aguaslindasdegoias.go.gov.br/plataforma-cultural-aguas-lindas",
    actionLabel: "Abrir Plataforma Cultural",
    guidance: "Use o WhatsApp institucional para orientação e confirme presencialmente quando o atendimento exigir documentos ou suporte assistido.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://cultura.aguaslindasdegoias.go.gov.br/plataforma-cultural-aguas-lindas",
    mapQuery: "Secretaria Municipal de Cultura e Turismo, Instituto Marques Paiva, Rua 20, Quadra 32, Lote 11, Jardim Brasília, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "cadastro-agente-cultural",
    name: "Cadastro Municipal de Agentes Culturais",
    category: "cultura",
    description: "Cadastro oficial e gratuito para artistas, coletivos, produtores, mestres, espaços e demais agentes culturais do município.",
    keywords: ["agente cultural", "cadastro cultural", "artista", "coletivo cultural", "carteira agente cultural"],
    actionUrl: "https://cultura.aguaslindasdegoias.go.gov.br/plataforma-cultural-aguas-lindas.html?abrir=cadastro",
    actionLabel: "Fazer cadastro cultural",
    guidance: "O cadastro é gratuito. A plataforma informa os documentos e comprovações exigidos antes do envio e oferece atendimento presencial para quem tiver dificuldade de acesso digital.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://cultura.aguaslindasdegoias.go.gov.br/plataforma-cultural-aguas-lindas.html?abrir=cadastro",
    verifiedAt: "06/10/2026",
  },
  {
    id: "editais-cultura",
    name: "Editais e seleções públicas de cultura",
    category: "cultura",
    description: "Editais municipais de fomento, documentos, cronogramas, inscrições e resultados da política cultural.",
    keywords: ["edital cultura", "pnab", "fomento cultura", "premio cultural", "ponto de cultura", "fundo municipal cultura"],
    actionUrl: "https://cultura.aguaslindasdegoias.go.gov.br/editais",
    actionLabel: "Consultar editais culturais",
    guidance: "Confira o cronograma e os documentos da edição atual antes de se inscrever; prazos e etapas podem mudar por retificação oficial.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://cultura.aguaslindasdegoias.go.gov.br/editais",
    verifiedAt: "06/10/2026",
  },
  {
    id: "mapa-cultural",
    name: "Mapa Cultural de Águas Lindas",
    category: "cultura",
    description: "Mapa público de agentes, Pontos e Pontões de Cultura, com filtros por segmento e tipo.",
    keywords: ["mapa cultural", "agentes culturais", "ponto de cultura", "espaco cultural", "artistas mapa"],
    actionUrl: "https://cultura.aguaslindasdegoias.go.gov.br/mapa-cultural.html",
    actionLabel: "Abrir Mapa Cultural",
    guidance: "O portal municipal informa que a localização pública do agente usa região aproximada para preservar privacidade, sem exibir o endereço residencial exato.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://cultura.aguaslindasdegoias.go.gov.br/mapa-cultural.html",
    verifiedAt: "06/10/2026",
  },
  {
    id: "calendario-cultural",
    name: "Calendário Cultural de Águas Lindas",
    category: "cultura",
    description: "Agenda oficial com eventos, prazos de editais, reuniões e outras atividades culturais do município.",
    keywords: ["calendario cultural", "agenda cultural", "evento cultural", "eventos", "prazo edital"],
    actionUrl: "https://cultura.aguaslindasdegoias.go.gov.br/calendario-cultural",
    actionLabel: "Abrir calendário cultural",
    guidance: "Consulte a agenda oficial antes de sair para confirmar data, horário e local de cada atividade.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://cultura.aguaslindasdegoias.go.gov.br/calendario-cultural",
    verifiedAt: "06/10/2026",
  },
  {
    id: "biblioteca-municipal",
    name: "Biblioteca Municipal · Jardim Barragem II",
    category: "educacao",
    description:
      "Biblioteca municipal vinculada à Secretaria de Educação, com atendimento público informado pela Prefeitura.",
    phone: "(61) 99160-8331",
    email: "educacao@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    address: "Qd 30, Lt 03, Jardim Barragem 02, Águas Lindas de Goiás - GO",
    keywords: [
      "biblioteca",
      "livros",
      "leitura",
      "estudo",
      "pesquisa",
      "jardim barragem 2",
    ],
    guidance:
      "Confirme o atendimento pelo canal informado pela Prefeitura antes de se deslocar, especialmente em feriados e datas com expediente alterado.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-educacao/biblioteca/",
    mapQuery:
      "Biblioteca Municipal, Qd 30, Lt 03, Jardim Barragem 02, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "medicamentos-sus-municipal",
    name: "Lista de Medicamentos SUS · Águas Lindas",
    category: "saude",
    description:
      "Consulta oficial municipal da lista de medicamentos do SUS disponibilizada no portal de Acesso à Informação.",
    keywords: ["medicamentos sus", "remedios sus", "lista medicamentos", "farmacia publica", "saude"],
    actionUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/medicamentos_sus",
    actionLabel: "Consultar lista de medicamentos",
    guidance:
      "Confira a data da informação publicada. Se a consulta não carregar, use os canais oficiais da Secretaria Municipal de Saúde para confirmar disponibilidade e retirada.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/medicamentos_sus",
    verifiedAt: "06/10/2026",
  },
  {
    id: "medicamentos-alto-custo-municipal",
    name: "Medicamentos de Alto Custo · Águas Lindas",
    category: "saude",
    description:
      "Acesso oficial municipal às informações publicadas sobre medicamentos de alto custo.",
    keywords: ["alto custo", "medicamento alto custo", "remedio alto custo", "saude"],
    actionUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/medicamentos_altocusto",
    actionLabel: "Consultar medicamentos de alto custo",
    guidance:
      "Use a consulta como referência e confirme critérios, documentos e fluxo de atendimento nos canais oficiais de saúde antes de se deslocar.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/medicamentos_altocusto",
    verifiedAt: "06/10/2026",
  },
  {
    id: "estoque-farmacias-publicas",
    name: "Estoque de medicamentos · farmácias públicas",
    category: "saude",
    description:
      "Consulta oficial do estoque de medicamentos das farmácias públicas de Águas Lindas.",
    keywords: ["estoque medicamento", "farmacia publica", "tem remedio", "medicamento disponivel", "saude"],
    actionUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/estoque_medicamentos_farmacias",
    actionLabel: "Consultar estoque das farmácias",
    guidance:
      "O estoque pode mudar ao longo do dia. Consulte a publicação mais recente e confirme a disponibilidade com a rede municipal quando necessário.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/estoque_medicamentos_farmacias",
    verifiedAt: "06/10/2026",
  },
  {
    id: "regulacao-municipal-lista-espera",
    name: "Lista de espera da Regulação Municipal",
    category: "saude",
    description:
      "Consulta oficial municipal da lista de espera da regulação de saúde.",
    keywords: ["regulacao municipal", "fila regulacao", "lista espera saude", "consulta exame", "saude"],
    actionUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/lista_espera_regulacoes",
    actionLabel: "Consultar fila da regulação",
    guidance:
      "Consulte a atualização publicada no portal. Para dúvidas sobre posição, encaminhamento ou prioridade, use os canais oficiais da rede de saúde.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://acessoainformacao.aguaslindasdegoias.go.gov.br/cidadao/outras_informacoes/lista_espera_regulacoes",
    verifiedAt: "06/10/2026",
  },
  {
    id: "recuperar-govbr",
    name: "Recuperar acesso à conta gov.br",
    category: "digital",
    description:
      "Orientação oficial para recuperar a senha e voltar a acessar serviços públicos digitais.",
    keywords: ["senha govbr", "recuperar conta", "acesso digital"],
    actionUrl: "https://acesso.gov.br",
    actionLabel: "Recuperar acesso",
    guidance:
      "Siga as opções do portal oficial. Se não conseguir recuperar o acesso, use o formulário indicado na página de ajuda. Nunca compartilhe senha ou código de acesso.",
    sourceLabel: "Governo Digital",
    sourceUrl:
      "https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/atendimento-gov.br/duvidas-na-conta-gov.br/recuperar-senha-da-conta-gov.br",
    verifiedAt: "06/10/2026",
  },
  {
    id: "anatel-consumidor",
    name: "Anatel Consumidor · telefonia e internet",
    category: "telecom",
    description:
      "Canal oficial para reclamações sobre telefonia, internet e TV por assinatura.",
    phone: "1331",
    hours: "Segunda a sexta, 08h–20h",
    keywords: [
      "operadora",
      "telefonia",
      "internet",
      "tv assinatura",
      "reclamacao anatel",
      "1331",
    ],
    documents: ["Número do protocolo de atendimento da operadora"],
    actionUrl: "https://apps.anatel.gov.br/anatelconsumidor/",
    actionLabel: "Abrir Anatel Consumidor",
    guidance:
      "Procure primeiro sua operadora e guarde o protocolo. Se não resolver, fale com a ouvidoria da operadora e depois registre a reclamação na Anatel.",
    sourceLabel: "Anatel",
    sourceUrl: "https://www.gov.br/anatel/pt-br/consumidor/quer-reclamar/reclamacao",
    verifiedAt: "07/10/2026",
  },
  {
    id: "cadastro-pre-pago",
    name: "Cadastro Pré · linhas pré-pagas no seu CPF",
    category: "telecom",
    description:
      "Consulta se existem linhas móveis pré-pagas ativas vinculadas ao seu CPF e em quais prestadoras.",
    keywords: [
      "cadastro pre",
      "linha no cpf",
      "chip no cpf",
      "telefone no cpf",
      "pre pago",
      "fraude chip",
    ],
    actionUrl: "https://cadastropre.com.br/",
    actionLabel: "Consultar linhas pré-pagas",
    guidance:
      "A consulta informa em quais prestadoras há linhas pré-pagas ativas no CPF, sem mostrar número de telefone nem quantidade de linhas. Se aparecer algo inesperado, contate a prestadora indicada para pedir correção ou desvinculação.",
    sourceLabel: "Anatel",
    sourceUrl: "https://www.gov.br/anatel/pt-br/dados/utilidade-publica/cadastro-pre-pago/",
    verifiedAt: "07/10/2026",
  },
  {
    id: "nao-me-perturbe",
    name: "Não Me Perturbe · bloquear telemarketing",
    category: "telecom",
    description:
      "Cadastro gratuito para bloquear ofertas por telefone de prestadoras de telecomunicações e instituições financeiras participantes.",
    keywords: [
      "nao me perturbe",
      "telemarketing",
      "ligacao indesejada",
      "spam telefone",
      "bloquear chamadas",
      "0303",
    ],
    actionUrl: "https://www.naomeperturbe.com.br/",
    actionLabel: "Cadastrar no Não Me Perturbe",
    guidance:
      "O bloqueio cobre ofertas de telecomunicações e de instituições financeiras participantes para crédito consignado. Cobranças, prevenção a fraude e outros contatos legítimos podem não ser bloqueados.",
    sourceLabel: "Anatel",
    sourceUrl: "https://www.gov.br/anatel/pt-br/consumidor/chamadas-abusivas",
    verifiedAt: "07/10/2026",
  },
  {
    id: "ibama-denuncia",
    name: "Ibama · denúncia ambiental",
    category: "ambiente",
    description:
      "Canal nacional para comunicar infrações e danos ambientais ao Ibama.",
    phone: "0800 061 8080",
    keywords: [
      "denuncia ambiental",
      "desmatamento",
      "pesca ilegal",
      "venda ilegal animais",
      "ibama",
    ],
    actionUrl:
      "https://www.gov.br/pt-br/servicos/apresentar-denuncia-ambiental",
    actionLabel: "Consultar denúncia ambiental",
    guidance:
      "Informe local, descrição e evidências disponíveis pelo canal oficial. Não se exponha para reunir provas; este canal não substitui atendimento de emergência.",
    sourceLabel: "Ibama",
    sourceUrl:
      "https://www.gov.br/ibama/pt-br/assuntos/fiscalizacao-e-protecao-ambiental/fiscalizacao-ambiental/denuncias",
    verifiedAt: "06/10/2026",
  },

  {
    id: "upa-mansoes-odisseia",
    name: "UPA Mansões Odisseia",
    category: "saude",
    description: "Atendimento de urgência e emergência municipal.",
    address:
      "Quadra 3B, Lote 1/3, Mansões Odisseia, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-1602",
    hours: "24 horas",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UPA,
    mapQuery: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO",
  },
  {
    id: "heal",
    name: "HEAL · Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho",
    category: "saude",
    description:
      "Hospital estadual de média e alta complexidade com pronto atendimento e linhas especializadas.",
    address:
      "Rua 19, nº 792-902, Parque da Barragem 9, Águas Lindas de Goiás - GO",
    phone: "(61) 3774-2660",
    hours: "Sempre aberto",
    sourceLabel: "SES-GO",
    sourceUrl: HEAL,
    mapQuery:
      "HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho, GO",
  },
  {
    id: "hospital-bom-jesus",
    name: "Hospital Municipal Bom Jesus",
    category: "saude",
    description:
      "Hospital municipal. O CNES indica desativação temporária por reforma desde fevereiro de 2026.",
    address:
      "Q 109, Conjunto B, Lote 30/32, Setor 10, Águas Lindas de Goiás - GO",
    phone: "(61) 3548-7604",
    hours: "Atendimento a confirmar antes de sair",
    guidance:
      "O cadastro CNES consultado em 01/10/2026 marca a unidade como desativada temporariamente por reforma, enquanto a página municipal ainda informa atendimento 24h. Confirme o funcionamento antes do deslocamento.",
    verifiedAt: "01/10/2026",
    sourceLabel: "CNES/DATASUS",
    sourceUrl: HMBJ_CNES,
    actionUrl: HMBJ,
    actionLabel: "Ver página municipal",
    mapQuery: "Hospital Municipal Bom Jesus, Águas Lindas de Goiás, GO",
  },
  {
    id: "caps",
    name: "CAPS · Centro de Atenção Psicossocial",
    category: "saude",
    description:
      "Atendimento municipal de saúde mental e acompanhamento psicossocial.",
    address:
      "Quadra 15, Loja 02, Lote 21, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-1559",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    email: "saude@aguaslindasdegoias.go.gov.br",
    guidance:
      "Entre em contato antes de sair para confirmar o atendimento indicado para sua necessidade.",
    keywords: [
      "caps",
      "saude mental",
      "psicologia",
      "psiquiatria",
      "atendimento psicossocial",
      "apoio psicologico",
    ],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: CAPS,
    mapQuery:
      "CAPS, Quadra 15, Loja 02, Lote 21, Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-saude",
    name: "Secretaria Municipal de Saúde",
    category: "saude",
    description: "Contato institucional e encaminhamentos da saúde municipal.",
    phone: "(61) 3618-4096 / (61) 99227-7937",
    email: "saude@aguaslindasdegoias.go.gov.br",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Saúde, Águas Lindas de Goiás, GO",
  },
  {
    id: "unidades-saude",
    name: "Unidades de Saúde do município",
    category: "saude",
    description: "Lista oficial com Hospital, ESF e UBS de Águas Lindas.",
    keywords: [
      "vacina",
      "vacinacao",
      "posto de saude",
      "ubs",
      "esf",
      "consulta basica",
    ],
    address: "Diversas unidades na cidade",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-aguas-bonitas",
    name: "ESF Águas Bonitas",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua 08, Quadra 33, Lote 27, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Águas Bonitas, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-aguas-lindas-ii",
    name: "ESF Águas Lindas II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua J, Setor 06, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Águas Lindas II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-america",
    name: "ESF América",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 17, Lote 31/32, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF América, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-barragem-ii",
    name: "UBS Barragem II",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Quadra 58, Lote 03/05, Barragem II, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Barragem II, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-barragem-iv",
    name: "UBS Barragem IV",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Barragem IV, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Barragem IV, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-barragem-v",
    name: "ESF Barragem V",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Avenida Goiás, Quadra 06, Lote 20, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Barragem V, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-camping-club",
    name: "ESF Camping Club",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua 17, Quadra 19, Lote 20, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Camping Club, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-cidade-entorno",
    name: "ESF Cidade do Entorno",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 50, Lote 48, Casa 02, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Cidade do Entorno, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-coimbra",
    name: "ESF Coimbra",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address:
      "Quadra P, Lote 01, Chácara 10, Casa 03, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Coimbra, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-guaira",
    name: "ESF Guaíra",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 5, Área Especial, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Guaíra, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-jardim-paraiso",
    name: "UBS Jardim Paraíso",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Quadra 13, Área Especial, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Jardim Paraíso, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-laranjeiras",
    name: "ESF Laranjeiras",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra B3, Lote 21, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Laranjeiras, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-padre-lucio",
    name: "ESF Padre Lúcio",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Área Especial P. Militar, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Padre Lúcio, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-perola-ii",
    name: "ESF Pérola II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Área Especial Setor Village, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Pérola II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-pinheiro-i",
    name: "ESF Pinheiro I",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 07, Lote 13, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Pinheiro I, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-setor-ii",
    name: "ESF Setor II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 33, Conjunto B, Lote 33B, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Setor II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-setor-09",
    name: "ESF Setor 09",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 72, Lote 37, Setor 09, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Setor 09, Águas Lindas de Goiás, GO",
  },
  {
    id: "policia-civil-1",
    name: "1ª Delegacia de Polícia de Águas Lindas",
    category: "seguranca",
    description:
      "Unidade da Polícia Civil para registros e atendimento policial.",
    address:
      "Rua Adélia, Quadra 3, Área Especial, Setor Sol Nascente, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-2716",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: PCGO,
    mapQuery: "1ª Delegacia de Polícia de Águas Lindas de Goiás",
  },
  {
    id: "pcgo-17-drp",
    name: "17ª Delegacia Regional de Polícia",
    category: "seguranca",
    description:
      "Delegacia regional da Polícia Civil com atendimento em Águas Lindas.",
    address:
      "Quadra 27, Rua 22, Área Especial, Parque Águas Bonitas I, Águas Lindas de Goiás - GO, 72926-052",
    phone: "(61) 3613-4160",
    verifiedAt: "01/10/2026",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: PCGO_REGIONAIS,
    mapQuery:
      "17ª Delegacia Regional de Polícia, Quadra 27, Rua 22, Parque Águas Bonitas I, Águas Lindas de Goiás, GO",
  },
  {
    id: "policia-civil-2",
    name: "2ª Delegacia de Polícia de Águas Lindas",
    category: "seguranca",
    description:
      "Unidade distrital da Polícia Civil para registros e atendimento policial.",
    address:
      "Jardim Pérola II, Quadra 55, Lote 08, Águas Lindas de Goiás - GO, 72911-316",
    phone: "(62) 98477-5357",
    guidance:
      "Contato conferido na lista telefônica oficial da Polícia Civil de Goiás de 2026. Em emergência imediata, ligue 190.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl:
      "https://goias.gov.br/policiacivil/wp-content/uploads/sites/71/2026/06/Lista-Telefonica-2026.pdf",
    mapQuery:
      "2ª Delegacia de Polícia, Jardim Pérola II, Quadra 55, Lote 08, Águas Lindas de Goiás, GO",
  },
  {
    id: "deam-depai-dpca",
    name: "DEAM / DEPAI / DPCA · atendimento especializado",
    category: "mulher",
    description:
      "Atendimento especializado da Polícia Civil para mulheres, adolescentes e crianças.",
    address:
      "Rua Colibri, Quadra 27, Lote 03, Bairro Sol Nascente, Águas Lindas de Goiás - GO, 72912-730",
    phone: "(61) 3613-0701",
    extraPhone: "(62) 98598-3382 / (62) 98593-6310",
    guidance:
      "Contatos conferidos na lista telefônica oficial de 2026. Para risco imediato, ligue 190; o Ligue 180 também orienta mulheres em situação de violência.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl:
      "https://goias.gov.br/policiacivil/wp-content/uploads/sites/71/2026/06/Lista-Telefonica-2026.pdf",
    mapQuery:
      "DEAM Águas Lindas, Rua Colibri, Quadra 27, Lote 03, Sol Nascente, Águas Lindas de Goiás, GO",
  },
  {
    id: "policia-militar",
    name: "Polícia Militar / COPOM",
    category: "seguranca",
    description: "Canal de atendimento policial e emergência.",
    phone: "190",
    extraPhone: "(61) 3613-2517 / (61) 3613-1190",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Polícia Militar, Águas Lindas de Goiás, GO",
  },
  {
    id: "bombeiros",
    name: "Corpo de Bombeiros",
    category: "seguranca",
    description: "Emergências de incêndio, resgate e salvamento.",
    phone: "193",
    extraPhone: "(61) 3618-2069",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Corpo de Bombeiros, Águas Lindas de Goiás, GO",
  },
  {
    id: "conselho-tutelar",
    name: "Conselho Tutelar",
    category: "assistencia",
    description:
      "Proteção de crianças e adolescentes e recebimento de denúncias.",
    address: "Quadra 11, Lote 13, Jardim Querência, Águas Lindas de Goiás - GO",
    phone: "(61) 99303-8040",
    extraPhone: "(61) 99303-9204",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: CT,
    mapQuery: "Conselho Tutelar, Jardim Querência, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-1",
    name: "CRAS I · Jardim Brasília",
    category: "assistencia",
    description:
      "Atendimento da assistência social para famílias e benefícios.",
    address: "Quadra 53, Lote 1B, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99294-2109",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/centro-de-referencia-da-assistencia-social-cras-i-jardim-brasilia/",
    mapQuery: "CRAS I Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "cadunico",
    name: "Cadastro Único / Bolsa Família",
    category: "assistencia",
    description: "Atendimento municipal do Cadastro Único e do Bolsa Família.",
    address:
      "Avenida Perimetral, Quadra 113, loja 09, Pérola 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99302-9284",
    email: "cadunico@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Entre em contato antes de sair para confirmar os documentos e a forma de atendimento.",
    keywords: [
      "cadunico",
      "cad unico",
      "cadastrar atualizar cadastro unico",
      "bolsa familia",
    ],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "Cadastro Único, Avenida Perimetral, Quadra 113, loja 09, Pérola 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-2",
    name: "CRAS II · Santa Lúcia",
    category: "assistencia",
    description:
      "Unidade municipal de assistência social e orientação às famílias.",
    address:
      "Quadra 54, Área Especial, Santa Lúcia, Águas Lindas de Goiás - GO",
    phone: "(61) 99294-8823",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Confirme por telefone qual unidade atende seu bairro antes de sair.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "CRAS II, Quadra 54, Área Especial, Santa Lúcia, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-3",
    name: "CRAS III · Praça da Cultura",
    category: "assistencia",
    description: "Unidade municipal de assistência social no Setor 11.",
    address:
      "Avenida 05, Quadra 0, Lote 01, Setor 11, Águas Lindas de Goiás - GO",
    phone: "(61) 99295-2076",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Confirme por telefone qual unidade atende seu bairro antes de sair.",
    keywords: ["cras ceu"],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "CRAS III Praça da Cultura, Avenida 05, Quadra 0, Lote 01, Setor 11, Águas Lindas de Goiás, GO",
  },
  {
    id: "creas",
    name: "CREAS · proteção social",
    category: "assistencia",
    description:
      "Atendimento especializado da assistência social para pessoas em situação de violência ou violação de direitos.",
    address: "Quadra 42, Casa 51, Setor 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99296-0392",
    email: "creas@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Entre em contato para orientação sobre o atendimento. Em emergência policial, ligue 190.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery: "CREAS, Quadra 42, Casa 51, Setor 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "transito-mobilidade",
    name: "Secretaria de Trânsito e Mobilidade Urbana",
    category: "transito",
    description: "Atendimento municipal de trânsito, mobilidade e agentes.",
    address:
      "Quadra 45, Lote 01, Área Pública, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 92003-6668",
    extraPhone: "(61) 92003-6674",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TRANSITO,
    mapQuery:
      "Secretaria de Trânsito e Mobilidade Urbana, Águas Lindas de Goiás, GO",
  },
  {
    id: "superintendencia-transito",
    name: "Superintendência Municipal de Trânsito",
    category: "transito",
    description: "Atendimento e operação municipal de trânsito.",
    address:
      "Quadra 45, Lote 01, Área Pública, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99310-4493",
    extraPhone: "(61) 99310-4219",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-transito-e-mobilidade-urbana/superintendencia-municipal-de-transito/",
    mapQuery:
      "Superintendência Municipal de Trânsito, Águas Lindas de Goiás, GO",
  },
  {
    id: "educacao-estado",
    name: "Rede Estadual de Educação",
    category: "educacao",
    description:
      "Lista oficial de escolas estaduais, com logradouro e município.",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "escolas estaduais, Águas Lindas de Goiás, GO",
  },
  {
    id: "cepi-juscelino",
    name: "CEPI Juscelino Kubitschek de Oliveira",
    category: "educacao",
    description: "Centro estadual em período integral.",
    address:
      "Rua Mansões Odisseia, Parque Mansões Odisseia, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery:
      "CEPI Juscelino Kubitschek de Oliveira, Águas Lindas de Goiás, GO",
  },
  {
    id: "coralina",
    name: "Colégio Estadual Cora Coralina",
    category: "educacao",
    description: "Colégio estadual com Ensino Fundamental e Ensino Médio.",
    address:
      "Rua 38, esq. com 4ª Avenida, Mansões Village, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "Colégio Estadual Cora Coralina, Águas Lindas de Goiás, GO",
  },
  {
    id: "pm-go-aguas-lindas",
    name: "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas",
    category: "educacao",
    description: "Unidade estadual de educação vinculada à rede da SEDUC.",
    address:
      "Quadra 31, Área Especial, Avenida 02/03, Águas Lindas I, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery:
      "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas, GO",
  },
  {
    id: "paulo-freire",
    name: "Colégio Estadual Paulo Freire",
    category: "educacao",
    description: "Colégio estadual com Ensino Fundamental e Ensino Médio.",
    address:
      "Área Especial I, Quadra 53, Lote 01-H, Jardim Brasília, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "Colégio Estadual Paulo Freire, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-educacao",
    name: "Secretaria Municipal de Educação",
    category: "educacao",
    description: "Atendimento da rede municipal de educação.",
    keywords: [
      "matricula",
      "matricula escolar",
      "vaga escola",
      "rede municipal",
      "transferencia escolar",
    ],
    phone: "(61) 92002-3791 / (61) 92002-3483",
    extraPhone: "(61) 92002-3774",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Educação, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-assistencia-social",
    name: "Secretaria Municipal de Assistência Social",
    category: "assistencia",
    description: "Atendimento e programas da assistência social municipal.",
    phone: "(61) 99291-2169 / (61) 99297-9283",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Assistência Social, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-mulher",
    name: "Secretaria Municipal da Mulher",
    category: "mulher",
    description:
      "Atendimento municipal para políticas públicas da mulher e família.",
    phone: "(61) 99304-8456",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal da Mulher, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-fazenda",
    whatsappOnly: ["(61) 92005-3453", "(61) 99305-7551"],
    name: "Secretaria Municipal de Fazenda e Planejamento",
    category: "tributos",
    description: "Atendimento tributário e de planejamento municipal.",
    phone: "(61) 99303-3717",
    extraPhone: "ITBI: (61) 92005-3453 · Nota Fiscal/ISS: (61) 99305-7551",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Fazenda e Planejamento, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-administracao",
    name: "Secretaria Municipal de Administração",
    category: "cidadania",
    description: "Atendimento da administração municipal.",
    phone: "(61) 99306-5878",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Administração, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-infraestrutura",
    name: "Secretaria Municipal de Infraestrutura e Obras",
    category: "servicos-urbanos",
    description: "Atendimento municipal para infraestrutura e obras.",
    phone: "(61) 99303-4608",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Infraestrutura e Obras, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-meio-ambiente",
    name: "Secretaria Municipal de Meio Ambiente",
    category: "ambiente",
    description: "Atendimento municipal relacionado ao meio ambiente.",
    phone: "(61) 99451-0844",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Meio Ambiente, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-habitacao",
    name: "Secretaria Municipal de Habitação",
    category: "moradia",
    description: "Atendimento municipal sobre habitação.",
    phone: "(61) 99303-6552",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Habitação, Águas Lindas de Goiás, GO",
  },
  {
    id: "regularizacao-fundiaria",
    name: "Secretaria Municipal de Regularização Fundiária",
    category: "moradia",
    description: "Atendimento municipal sobre regularização fundiária.",
    phone: "(61) 99310-0216",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Regularização Fundiária, Águas Lindas de Goiás, GO",
  },
  {
    id: "desenvolvimento-economico",
    name: "Secretaria Municipal de Desenvolvimento Econômico",
    category: "empreendedor",
    description: "Atendimento municipal para desenvolvimento econômico, comércio, serviços, empresas e geração de renda.",
    phone: "(61) 99649-2690",
    extraPhone: "(61) 99310-6862",
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    email: "industria.comercio@aguaslindasdegoias.go.gov.br",
    address: "Quadra 50, Lote 45, Conjunto A, Setor 01, Parque da Barragem, Águas Lindas de Goiás - GO",
    keywords: ["desenvolvimento economico","empresa","comercio","industria","empreendedor","negocio","incentivo empresa"],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-desenvolvimento-economico/",
    actionLabel: "Abrir Secretaria de Desenvolvimento Econômico",
    guidance: "Confirme com a Secretaria o atendimento adequado para abertura, expansão, regularização ou programas de desenvolvimento antes de sair.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-desenvolvimento-economico/",
    mapQuery: "Secretaria Municipal de Desenvolvimento Econômico, Quadra 50, Lote 45, Conjunto A, Setor 01, Parque da Barragem, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "sala-empreendedor",
    name: "Sala do Empreendedor · Águas Lindas",
    category: "empreendedor",
    description: "Atendimento municipal para abertura, regularização e baixa de empresas, inclusive serviços para MEI.",
    whatsappOnly: ["(61) 99248-6697"],
    hours: "Segunda a sexta, 08h–12h e 13h–17h",
    email: "saladoempreendedoraguaslindas@gmail.com",
    address: "Quadra 50, Conjunto A, 45, Setor 1, Parque da Barragem, Águas Lindas de Goiás - GO, 72911-199",
    keywords: ["sala empreendedor","mei","abrir empresa","regularizar empresa","baixar empresa","microempreendedor","empreendedor"],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/servico/sala-do-empreendedor/",
    actionLabel: "Abrir serviço da Sala do Empreendedor",
    guidance: "A página oficial informa que as demandas do serviço devem ser solicitadas via WhatsApp. Confirme requisitos e documentos antes do deslocamento.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/servico/sala-do-empreendedor/",
    mapQuery: "Sala do Empreendedor, Quadra 50, Conjunto A, 45, Setor 1, Parque da Barragem, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "portal-empreendedor-mei",
    name: "Portal do Empreendedor · MEI",
    category: "empreendedor",
    description: "Canal federal para formalização e serviços do MEI, incluindo CCMEI, DAS, declaração anual, alteração e baixa.",
    keywords: ["mei","formalizar mei","abrir mei","das mei","ccmei","declaracao mei","baixar mei"],
    actionUrl: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/",
    actionLabel: "Abrir Portal do Empreendedor",
    guidance: "Use somente o portal oficial. Alguns serviços exigem autenticação gov.br. A formalização do MEI é gratuita no canal oficial.",
    sourceLabel: "Empresas & Negócios",
    sourceUrl: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "abrir-cnpj-redesim",
    name: "Abrir CNPJ · REDESIM",
    category: "empreendedor",
    description: "Fluxo oficial para abrir CNPJ de empresa, negócio ou associação, com viabilidade, registro e licenciamento.",
    keywords: ["abrir cnpj","abrir empresa","redesim","viabilidade","registro empresa","licenciamento empresa"],
    actionUrl: "https://www.gov.br/empresas-e-negocios/pt-br/redesim/abrir-cnpj",
    actionLabel: "Abrir serviço de CNPJ",
    guidance: "Antes de iniciar, confira a viabilidade do endereço e as exigências de licenciamento do município. Para MEI, use o Portal do Empreendedor.",
    sourceLabel: "Empresas & Negócios",
    sourceUrl: "https://www.gov.br/empresas-e-negocios/pt-br/redesim/abrir-cnpj",
    verifiedAt: "06/10/2026",
  },
  {
    id: "ouvidoria-sus",
    name: "Ouvidoria SUS",
    category: "saude",
    description: "Canal de atendimento e manifestação do SUS no município.",
    phone: "(61) 3902-1097",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Ouvidoria SUS Águas Lindas de Goiás, GO",
  },
  {
    id: "camara-municipal",
    name: "Câmara Municipal de Vereadores",
    category: "cidadania",
    description: "Atendimento institucional do Legislativo municipal.",
    phone: "(61) 3618-2512",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Câmara Municipal de Águas Lindas de Goiás, GO",
  },
  {
    id: "forum",
    name: "Fórum de Águas Lindas",
    category: "cidadania",
    description: "Atendimento do Poder Judiciário no município.",
    phone: "(61) 3617-2600",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Fórum de Águas Lindas de Goiás, GO",
  },
  {
    id: "funpreval",
    name: "FUNPREVAL",
    category: "cidadania",
    description: "Fundo de Previdência Municipal de Águas Lindas de Goiás.",
    phone: "(61) 3618-5814",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "FUNPREVAL Águas Lindas de Goiás, GO",
  },
  {
    id: "sebrae",
    name: "SEBRAE",
    category: "trabalho",
    description:
      "Canal de apoio e atendimento empresarial listado pela Prefeitura.",
    phone: "(61) 3902-1135",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "SEBRAE Águas Lindas de Goiás, GO",
  },
  {
    id: "energia",
    keywords: [
      "falta de luz",
      "sem luz",
      "sem energia",
      "queda de energia",
      "segunda via conta luz",
    ],
    name: "Equatorial Goiás · energia",
    category: "agua-energia",
    description:
      "Central estadual para falta de energia, contas e atendimento da distribuidora.",
    phone: "0800 062 0196",
    hours: "24 horas, todos os dias",
    sourceLabel: "Equatorial Goiás",
    sourceUrl: "https://go.equatorialenergia.com.br/canais-de-atendimento/",
    actionUrl: "https://go.equatorialenergia.com.br/canais-de-atendimento/",
    actionLabel: "Falta de luz e segunda via",
    guidance:
      "Tenha o número da unidade consumidora e o endereço em mãos. Guarde o protocolo do atendimento.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "reclamar-distribuidora-aneel",
    name: "ANEEL · reclamar da distribuidora de energia",
    category: "agua-energia",
    description:
      "Canal oficial para registrar reclamação quando o problema com a distribuidora não foi resolvido após atendimento e ouvidoria.",
    phone: "167",
    extraPhone: "0800 727 0167",
    hours: "Segunda a sábado, 08h–20h",
    keywords: [
      "aneel",
      "reclamar energia",
      "reclamacao distribuidora",
      "ouvidoria energia",
      "problema equatorial",
      "falta energia protocolo",
    ],
    actionUrl:
      "https://www.gov.br/aneel/pt-br/canais_atendimento/reclame-da-distribuidora",
    actionLabel: "Registrar reclamação na ANEEL",
    guidance:
      "Primeiro fale com a distribuidora e guarde o protocolo. Se não resolver, procure a ouvidoria da distribuidora; depois, registre a demanda na ANEEL com os protocolos anteriores.",
    sourceLabel: "ANEEL",
    sourceUrl:
      "https://www.gov.br/aneel/pt-br/canais_atendimento/reclame-da-distribuidora",
    verifiedAt: "06/10/2026",
  },
  {
    id: "defesa-civil",
    keywords: [
      "defesa civil",
      "alagamento",
      "enchente",
      "desabamento",
      "risco estrutural",
    ],
    name: "Proteção e atendimento de emergência",
    category: "seguranca",
    description:
      "Use 193 para incêndio, resgate e salvamento e 190 para emergência policial.",
    phone: "193",
    extraPhone: "190",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
  },
  {
    id: "carteira-trabalho-digital",
    name: "Carteira de Trabalho Digital",
    category: "documentos",
    description:
      "Acesso à carteira de trabalho e aos contratos registrados pelo portal oficial.",
    phone: "158",
    sourceLabel: "Ministério do Trabalho e Emprego",
    sourceUrl: "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho",
    actionUrl: "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho",
    actionLabel: "Acessar Carteira de Trabalho",
    guidance:
      "Use sua conta gov.br no portal oficial. O acesso digital exige internet. Para dúvidas, consulte a Central 158.",
    keywords: [
      "ctps",
      "carteira de trabalho",
      "contrato de trabalho",
      "documento trabalhador",
    ],
    verifiedAt: "01/10/2026",
  },
  {
    id: "meu-inss",
    name: "Meu INSS · benefícios e extratos",
    category: "previdencia",
    description:
      "Canal oficial para pedidos, acompanhamento de benefícios e extratos previdenciários, como o CNIS.",
    phone: "135",
    hours: "Central 135: segunda a sábado, 7h–22h (Brasília)",
    sourceLabel: "INSS",
    sourceUrl:
      "https://www.gov.br/inss/pt-br/canais_atendimento/meu-inss/meu-inss",
    actionUrl: "https://meu.inss.gov.br/",
    actionLabel: "Acessar Meu INSS",
    guidance:
      "Entre com sua conta gov.br somente no portal oficial. Consultas e solicitações online exigem internet; a Central 135 precisa de rede telefônica. A análise do pedido cabe ao INSS.",
    keywords: [
      "aposentadoria",
      "pensão",
      "previdencia",
      "cnis",
      "extrato contribuição",
      "beneficio inss",
    ],
    verifiedAt: "01/10/2026",
  },
  {
    id: "bpc-idoso",
    name: "BPC/LOAS · pessoa idosa",
    category: "previdencia",
    description:
      "Pedido do Benefício de Prestação Continuada para pessoa idosa de baixa renda.",
    phone: "135",
    keywords: [
      "bpc",
      "loas",
      "bpc idoso",
      "beneficio assistencial idoso",
      "65 anos",
      "cadunico",
    ],
    actionUrl: "https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-ao-idoso",
    actionLabel: "Solicitar BPC para pessoa idosa",
    guidance:
      "O serviço é destinado à pessoa idosa com 65 anos ou mais que cumpra os critérios de renda. O Cadastro Único deve estar atualizado e o pedido pode ser feito pelo Meu INSS. O BPC não exige contribuição prévia ao INSS.",
    sourceLabel: "INSS",
    sourceUrl: "https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-ao-idoso",
    verifiedAt: "07/10/2026",
  },
  {
    id: "bpc-pessoa-deficiencia",
    name: "BPC/LOAS · pessoa com deficiência",
    category: "previdencia",
    description:
      "Pedido do Benefício de Prestação Continuada para pessoa com deficiência de baixa renda.",
    phone: "135",
    keywords: [
      "bpc",
      "loas",
      "bpc pcd",
      "beneficio assistencial deficiencia",
      "pessoa com deficiencia",
      "cadunico",
    ],
    actionUrl: "https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-a-pessoa-com-deficiencia",
    actionLabel: "Solicitar BPC para pessoa com deficiência",
    guidance:
      "O pedido é feito pelo Meu INSS. O benefício não exige contribuição prévia, mas depende dos critérios socioeconômicos e das avaliações previstas para comprovação da deficiência.",
    sourceLabel: "INSS",
    sourceUrl: "https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-a-pessoa-com-deficiencia",
    verifiedAt: "07/10/2026",
  },
  {
    id: "auxilio-incapacidade-temporaria",
    name: "Auxílio por incapacidade temporária · INSS",
    category: "previdencia",
    description:
      "Pedido do benefício previdenciário para quem fica temporariamente incapaz para o trabalho ou atividade habitual.",
    phone: "135",
    keywords: [
      "auxilio doenca",
      "auxilio incapacidade",
      "atestmed",
      "atestado",
      "afastamento trabalho",
      "pericia inss",
    ],
    actionUrl: "https://www.gov.br/pt-br/servicos/solicitar-beneficio-por-incapacidade-temporaria-auxilio-doenca",
    actionLabel: "Solicitar benefício por incapacidade",
    guidance:
      "O pedido é iniciado pelo Meu INSS. Em muitos casos a análise pode usar documentação médica pelo Atestmed; quando necessário, o INSS pode exigir perícia. Consulte os requisitos e envie documentos legíveis.",
    sourceLabel: "INSS",
    sourceUrl: "https://www.gov.br/inss/pt-br/direitos-e-deveres/beneficios-por-incapacidade/auxilio-por-incapacidade-temporaria",
    verifiedAt: "07/10/2026",
  },
  {
    id: "salario-maternidade-inss",
    name: "Salário-maternidade · INSS",
    category: "previdencia",
    description:
      "Pedido do benefício para afastamento por nascimento, adoção, guarda para adoção ou aborto não criminoso, conforme as regras do INSS.",
    phone: "135",
    keywords: [
      "salario maternidade",
      "licenca maternidade",
      "maternidade inss",
      "nascimento filho",
      "adocao",
    ],
    actionUrl: "https://www.gov.br/pt-br/servicos/solicitar-salario-maternidade-urbano",
    actionLabel: "Solicitar salário-maternidade",
    guidance:
      "O pedido é feito pela internet no Meu INSS para os casos atendidos pelo INSS. Empregada de empresa deve observar a regra de pagamento pela empresa. Confira a documentação e a condição aplicável ao seu vínculo.",
    sourceLabel: "INSS",
    sourceUrl: "https://www.gov.br/pt-br/servicos/solicitar-salario-maternidade-urbano",
    verifiedAt: "07/10/2026",
  },
  {
    id: "cin-goias",
    name: "Carteira de Identidade Nacional · CIN Goiás",
    category: "documentos",
    description: "Solicitação da Carteira de Identidade Nacional em Goiás, com agendamento pelo Expresso/Vapt Vupt e opções digitais quando elegível.",
    keywords: ["cin", "carteira identidade", "nova identidade", "rg", "segunda via identidade", "identidade nacional"],
    actionUrl: "https://www.go.gov.br/servicos/servico/solicitar-carteira-de-identidade-nacional--cin",
    actionLabel: "Solicitar ou agendar CIN",
    guidance: "Use o Portal Expresso para conferir documentos, regras e unidades disponíveis. Em situações elegíveis, a segunda via simplificada pode ser solicitada digitalmente. Confirme o local de atendimento no sistema antes de sair.",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: "https://goias.gov.br/policiacivil/instituto-de-identificacao/",
    verifiedAt: "07/10/2026",
  },
  {
    id: "cnh-digital",
    name: "CNH Digital · Carteira Nacional de Habilitação",
    category: "documentos",
    description:
      "Versão digital da Carteira Nacional de Habilitação, com a mesma validade jurídica do documento físico.",
    keywords: [
      "cnh digital",
      "cnh-e",
      "carteira habilitacao digital",
      "habilitacao celular",
      "cnh app",
      "cnh do brasil",
    ],
    actionUrl:
      "https://www.gov.br/pt-br/servicos/emitir-a-carteira-nacional-de-habilitacao-digital-cnh-e",
    actionLabel: "Acessar CNH Digital",
    guidance:
      "Disponível para quem possui CNH válida com QR Code e conta gov.br. O documento digital é acessado pelo aplicativo oficial CNH do Brasil; confira os requisitos atuais antes de iniciar.",
    sourceLabel: "Senatran",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/emitir-a-carteira-nacional-de-habilitacao-digital-cnh-e",
    verifiedAt: "07/10/2026",
  },
  {
    id: "antecedentes-criminais-goias",
    name: "Atestado de antecedentes criminais · Goiás",
    category: "documentos",
    description: "Emissão online do atestado de antecedentes criminais pela Polícia Civil de Goiás.",
    keywords: ["antecedentes", "antecedentes criminais", "certidao criminal", "atestado criminal", "policia civil"],
    actionUrl: "https://www.go.gov.br/servicos/servico/obter-atestado-de-antecedentes-criminais-online",
    actionLabel: "Emitir atestado de antecedentes",
    guidance: "A emissão é online pelo Portal Expresso. Confira os dados informados e use apenas o documento gerado pelo serviço oficial.",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: "https://goias.gov.br/policiacivil/instituto-de-identificacao/",
    verifiedAt: "07/10/2026",
  },
  {
    id: "prefeitura",
    name: "Prefeitura de Águas Lindas de Goiás",
    category: "cidadania",
    description:
      "Portal institucional, contatos, serviços e atendimento ao cidadão.",
    address:
      "Área Especial 4, Avenida 2, Jardim Querência, Águas Lindas de Goiás - GO, CEP 72910-733",
    phone: "(61) 3618-4007",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Prefeitura de Águas Lindas de Goiás",
  },
  {
    id: "sic",
    name: "Serviço de Informação ao Cidadão · SIC",
    category: "transparencia",
    description:
      "Solicite informações públicas e acompanhe a resposta pelo canal oficial.",
    address:
      "Área Especial 4, Avenida 2, Jardim Querência, Águas Lindas de Goiás - GO",
    phone: "(61) 99306-3637",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    email: "sic@aguaslindasdegoias.go.gov.br",
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/servico-de-informacao-ao-cidadao/",
    actionLabel: "Pedir informação",
    guidance:
      "Abra SIC online na página oficial e guarde o protocolo para acompanhar a resposta.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/servico-de-informacao-ao-cidadao/",
    mapQuery: "Serviço de Informação ao Cidadão, Águas Lindas de Goiás, GO",
  },
  {
    id: "ouvidoria-municipal",
    keywords: ["reclamacao", "reclamar", "problema servico publico"],
    name: "Ouvidoria Municipal",
    category: "transparencia",
    description:
      "Canal para reclamações, sugestões, elogios e denúncias sobre serviços públicos.",
    address: "Quadra 47, Lote 12, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99306-3637",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    email: "ouvidoria@aguaslindasdegoias.go.gov.br",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/gabinete-do-prefeito/ouvidoria-municipal/",
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/gabinete-do-prefeito/ouvidoria-municipal/",
    actionLabel: "Abrir canal oficial",
    guidance:
      "Descreva o serviço, o local e a data do problema. Guarde o protocolo do canal oficial.",
    verifiedAt: "01/10/2026",
    mapQuery:
      "Ouvidoria Municipal, Quadra 47, Lote 12, Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "portal-transparencia-municipal",
    name: "Portal da Transparência · Prefeitura",
    category: "transparencia",
    description: "Consulta pública de receitas, despesas, contratos, licitações, obras, diárias, recursos humanos, planejamento e outras informações da Prefeitura.",
    keywords: ["transparencia", "gastos publicos", "despesas", "receitas", "contratos", "licitacoes", "obras", "diarias", "prestacao contas"],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/transparencia/",
    actionLabel: "Abrir Portal da Transparência",
    guidance: "Use os filtros do portal oficial para localizar o assunto desejado. Informações do SIC e da Ouvidoria continuam disponíveis para pedidos, reclamações e acompanhamento.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/transparencia/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "portal-sei-processos",
    name: "Portal SEI · pesquisar processos e autenticar documentos",
    category: "transparencia",
    description: "Portal municipal para pesquisa de processos eletrônicos, autenticação de documentos e acesso de usuário externo ao SEI.",
    keywords: ["sei", "processo eletronico", "pesquisar processo", "autenticar documento", "usuario externo", "processo administrativo"],
    actionUrl: "https://portalsei.aguaslindasdegoias.go.gov.br/",
    actionLabel: "Abrir Portal SEI",
    guidance: "Use Pesquisa de Processos para localizar informações públicas e Autenticar Documentos para conferir documentos emitidos no SEI. Algumas funções exigem cadastro de usuário externo.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://portalsei.aguaslindasdegoias.go.gov.br/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "legislacao-municipal",
    name: "Legislação Municipal · leis e atos normativos",
    category: "transparencia",
    description: "Base oficial para consultar leis municipais e atos normativos de Águas Lindas de Goiás.",
    keywords: ["lei municipal", "legislacao", "lei aguas lindas", "ato normativo", "norma municipal", "decreto"],
    actionUrl: "https://legislacao.aguaslindasdegoias.go.gov.br/",
    actionLabel: "Consultar legislação municipal",
    guidance: "Pesquise pelo número, ano ou assunto da norma. Para atos ou publicações específicas, confirme sempre o texto oficial disponível no sistema municipal.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://legislacao.aguaslindasdegoias.go.gov.br/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "procon",
    name: "Procon Águas Lindas",
    category: "consumidor",
    description: "Atendimento ao consumidor e orientação sobre direitos.",
    phone: "(61) 3616-1133",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Procon Águas Lindas de Goiás, GO",
  },
  {
    id: "saneago",
    keywords: [
      "falta de agua",
      "sem agua",
      "segunda via conta agua",
      "vazamento",
    ],
    name: "Saneago · água e esgoto",
    category: "agua-energia",
    description:
      "Central de atendimento para abastecimento de água, esgoto e serviços da conta.",
    phone: "0800 645 0115",
    hours: "24 horas, todos os dias",
    sourceLabel: "Saneago",
    sourceUrl: "https://www.saneago.com.br/site",
    actionUrl: "https://agencia-virtual.saneago.com.br/",
    actionLabel: "Abrir agência virtual",
    guidance:
      "Tenha a matrícula da conta e o endereço do imóvel para solicitar atendimento e guarde o protocolo.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "receita-federal-pav",
    keywords: [
      "receita federal",
      "cpf",
      "cnpj",
      "imposto de renda",
      "regularizacao fiscal",
      "certidao federal",
      "pav",
    ],
    name: "Receita Federal · ponto conveniado",
    category: "tributos",
    description:
      "Ponto de atendimento conveniado da Receita Federal em Águas Lindas de Goiás.",
    sourceLabel: "Receita Federal",
    sourceUrl:
      "https://www.gov.br/receitafederal/pt-br/canais_atendimento/fale-conosco/presencial/go/aguas-lindas-de-goias",
    actionUrl:
      "https://www.gov.br/receitafederal/pt-br/canais_atendimento/fale-conosco/presencial/go/aguas-lindas-de-goias",
    actionLabel: "Consultar atendimento oficial",
    guidance:
      "Consulte a página oficial antes de sair para confirmar os serviços disponíveis e eventual necessidade de agendamento. O Trajeto não publica endereço ou horário sem confirmação oficial.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "vapt-vupt",
    name: "Vapt Vupt",
    category: "cidadania",
    description:
      "Unidade com atendimento de órgãos como Detran, INSS, Saneago e SINE.",
    keywords: [
      "emprego",
      "sine",
      "trabalho",
      "vaga de emprego",
      "seguro desemprego",
    ],
    address:
      "Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás - GO, 72910-000",
    hours: "Segunda a sexta, 8h–17h; sem atendimento aos sábados",
    sourceLabel: "SEAD Goiás",
    sourceUrl:
      "https://www.vaptvupt.goias.gov.br/unidade/aguas-lindas-de-goias",
    actionUrl:
      "https://www.vaptvupt.goias.gov.br/unidade/aguas-lindas-de-goias",
    actionLabel: "Agendar atendimento",
    guidance:
      "Use Agendamento no portal oficial e consulte os documentos exigidos pelo serviço antes de sair.",
    verifiedAt: "01/10/2026",
    mapQuery:
      "Vapt Vupt, Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás, GO",
  },
  {
    id: "detran",
    name: "Detran-GO · CNH, veículo e licenciamento",
    category: "transito",
    description:
      "Consulte CNH, IPVA, multas, CRLV, processos e outros serviços oficiais do trânsito em Goiás.",
    keywords: [
      "cnh",
      "habilitacao",
      "licenciamento",
      "veiculo",
      "detran go",
      "ipva",
      "multa",
      "crlv",
      "renovar cnh",
    ],
    phone: "(61) 3613-4058",
    actionUrl: "https://www.detran.go.gov.br/",
    actionLabel: "Abrir serviços digitais do Detran",
    guidance:
      "Para consultas digitais, use o portal oficial. Para atendimento presencial, confirme o serviço e o agendamento antes de sair.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Detran-GO",
    sourceUrl: "https://www.detran.go.gov.br/",
    mapQuery: "Detran-GO, Águas Lindas de Goiás, GO",
  },
  {
    id: "samu",
    name: "SAMU",
    category: "saude",
    description:
      "Atendimento móvel de urgência. Em emergência, acione o serviço.",
    phone: "192",
    extraPhone: "(61) 3618-2013",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "SAMU, Águas Lindas de Goiás, GO",
  },
  {
    id: "ligue-180",
    name: "Ligue 180 · atendimento à mulher",
    category: "mulher",
    description:
      "Canal nacional gratuito de orientação e registro de denúncias de violência contra mulheres.",
    phone: "180",
    hours: "24 horas, todos os dias",
    email: "central180@mulheres.gov.br",
    sourceLabel: "Ministério das Mulheres",
    sourceUrl: "https://www.gov.br/mulheres/pt-br/ligue180",
    actionUrl: "https://www.gov.br/mulheres/pt-br/ligue180",
    actionLabel: "Consultar canais de atendimento",
    guidance:
      "O serviço orienta sobre a rede de proteção. Em emergência policial, ligue 190.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "disque-100",
    name: "Disque 100 · direitos humanos",
    category: "assistencia",
    description:
      "Canal nacional gratuito para denúncias de violações de direitos de crianças, idosos, pessoas com deficiência e outros grupos.",
    phone: "100",
    hours: "24 horas, todos os dias",
    email: "ouvidoria@mdh.gov.br",
    sourceLabel: "Direitos Humanos e Cidadania",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos",
    actionUrl:
      "https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos",
    actionLabel: "Consultar canais acessíveis",
    guidance:
      "O portal oficial inclui chat e videochamada em Libras. Descreva a ocorrência, o local e quem precisa de proteção.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "ouvsus-136",
    name: "OuvSUS 136 · Ouvidoria-Geral do SUS",
    category: "saude",
    description:
      "Canal federal para informações, solicitações, reclamações, denúncias, sugestões e elogios sobre o SUS.",
    phone: "136",
    hours: "Telefone: segunda a sexta, 8h–20h; sábado, 8h–18h",
    actionUrl: "https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus",
    actionLabel: "Acessar OuvSUS",
    guidance:
      "Use o 136 ou o formulário oficial. O canal recebe manifestações e orienta sobre o SUS; urgências médicas devem ir para o SAMU 192.",
    keywords: [
      "ouvidoria sus",
      "reclamacao sus",
      "denuncia saude",
      "disque saude",
      "136",
    ],
    verifiedAt: "06/10/2026",
    sourceLabel: "Ministério da Saúde",
    sourceUrl: "https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus",
  },
  {
    id: "farmacia-popular",
    name: "Farmácia Popular · participantes oficiais",
    category: "saude",
    description:
      "Consulta oficial das farmácias credenciadas no Programa Farmácia Popular do Brasil.",
    actionUrl:
      "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/publicacoes/farmacias-participante-do-programa-farmacia-popular/view",
    actionLabel: "Consultar farmácias participantes",
    guidance:
      "Consulte a lista oficial e confirme a disponibilidade do medicamento no estabelecimento antes de se deslocar.",
    keywords: [
      "farmacia popular",
      "medicamento",
      "remedio",
      "gratuito",
      "desconto",
    ],
    verifiedAt: "06/10/2026",
    sourceLabel: "Ministério da Saúde",
    sourceUrl:
      "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/publicacoes/farmacias-participante-do-programa-farmacia-popular/view",
  },
  {
    id: "meu-sus-digital",
    name: "Meu SUS Digital · vacinas e histórico de saúde",
    category: "saude",
    description:
      "Consulte carteira de vacinação, número do Cartão Nacional de Saúde e registros de saúde disponíveis no sistema.",
    keywords: [
      "meu sus",
      "cartao sus",
      "cns",
      "vacina",
      "carteira vacinacao",
      "exames",
      "medicamentos",
    ],
    actionUrl: "https://meususdigital.saude.gov.br/",
    actionLabel: "Acessar Meu SUS Digital",
    guidance:
      "Entre no canal oficial para consultar os registros disponíveis. O catálogo do Trajeto pode ser lido offline; o acesso aos seus dados no Meu SUS Digital depende do serviço online. Não é um canal de emergência: em urgência, ligue 192.",
    sourceLabel: "Ministério da Saúde",
    sourceUrl:
      "https://www.gov.br/saude/pt-br/composicao/seidigi/meususdigital/perguntas-e-respostas/cidadao/2-quais-os-servicos-que",
    verifiedAt: "06/10/2026",
  },
  {
    id: "cmdi",
    name: "Conselho Municipal do Direito do Idoso · CMDI",
    category: "idoso",
    description:
      "Conselho municipal de defesa e acompanhamento dos direitos da pessoa idosa, com atendimento divulgado pela Prefeitura.",
    phone: "(61) 99302-7803",
    hours: "Segunda a sexta, 09h30–16h para atendimento presencial",
    email: "cmdiaguaslindas@gmail.com",
    address:
      "Quadra 53, Lote 1B, Avenida JK, dentro do CCI, Águas Lindas de Goiás - GO",
    keywords: [
      "idoso",
      "idosa",
      "direitos do idoso",
      "conselho do idoso",
      "cmdi",
      "violacao direitos idoso",
    ],
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/conselho-municipal-do-direito-do-idoso-cmdi/",
    actionLabel: "Abrir página do CMDI",
    guidance:
      "Use o contato oficial para confirmar o atendimento e o encaminhamento adequado. Em situação de violência ou violação de direitos, o Disque 100 também é um canal nacional de denúncia.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/conselho-municipal-do-direito-do-idoso-cmdi/",
    mapQuery:
      "Conselho Municipal do Direito do Idoso, Quadra 53, Lote 1B, Avenida JK, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "cci-idoso",
    name: "Centro de Convivência do Idoso · CCI",
    category: "idoso",
    description:
      "Referência municipal para a pessoa idosa; a página atual do CMDI informa que o conselho funciona dentro do CCI.",
    address:
      "Quadra 53, Lote 1B, Avenida JK, Águas Lindas de Goiás - GO",
    keywords: [
      "cci",
      "centro convivencia idoso",
      "convivencia idoso",
      "idoso",
      "idosa",
      "terceira idade",
    ],
    guidance:
      "Confirme atividades, inscrição e atendimento com a Assistência Social ou com o CMDI antes de sair; esta ficha não presume programação ou vagas atuais.",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/conselho-municipal-do-direito-do-idoso-cmdi/",
    mapQuery:
      "Centro de Convivência do Idoso, Quadra 53, Lote 1B, Avenida JK, Águas Lindas de Goiás, GO",
    verifiedAt: "06/10/2026",
  },
  {
    id: "carteira-pessoa-idosa",
    name: "Carteira da Pessoa Idosa · transporte interestadual",
    category: "idoso",
    description:
      "Documento para acesso aos benefícios de transporte interestadual, conforme as regras do programa.",
    keywords: [
      "idoso",
      "idosa",
      "passagem",
      "onibus",
      "transporte interestadual",
      "carteira idoso",
    ],
    actionUrl: "https://carteiraidoso.cidadania.gov.br/",
    actionLabel: "Emitir carteira no portal oficial",
    guidance:
      "Para pessoas com 60 anos ou mais, renda individual de até dois salários-mínimos e Cadastro Único atualizado. A emissão é gratuita. Entre com gov.br; se precisar de ajuda ou ainda não tiver CadÚnico, procure o Centro de Referência de Assistência Social. O benefício é interestadual, não um passe municipal.",
    documents: [
      "Número de Identificação Social (NIS)",
      "Acesso à conta gov.br para emissão online",
    ],
    sourceLabel: "Ministério do Desenvolvimento Social",
    sourceUrl: "https://www.gov.br/pt-br/servicos/adquirir-carteira-do-idoso/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "carteira-autista-goias",
    name: "Carteira de Identificação do Autista · Goiás",
    category: "inclusao",
    description:
      "Orientação estadual para solicitar a carteira de identificação da pessoa com transtorno do espectro autista (Ciptea).",
    keywords: [
      "autismo",
      "autista",
      "tea",
      "ciptea",
      "carteira autista",
      "pcd",
    ],
    phone: "(62) 98104-3652",
    whatsappOnly: ["(62) 98104-3652"],
    email: "pcd@goias.gov.br",
    actionUrl:
      "https://goias.gov.br/social/carteira-de-identificacao-do-autista/",
    actionLabel: "Consultar formulário e procedimento",
    guidance:
      "No interior de Goiás, fale com o canal estadual para saber qual órgão do município está cadastrado. Não há um endereço local confirmado nesta ficha. Use o assunto Carteira de Identificação do Autista no e-mail e confirme o procedimento antes de se deslocar.",
    documents: [
      "Formulário de requerimento da página oficial",
      "Relatório médico de especialista em Neurologia, Psiquiatria ou Pediatria",
      "Certidão de nascimento ou identidade com CPF",
      "Documentos do responsável legal, se menor de idade",
      "Comprovante de endereço em Goiás e foto digital",
    ],
    sourceLabel: "Desenvolvimento Social de Goiás",
    sourceUrl:
      "https://goias.gov.br/social/carteira-de-identificacao-do-autista/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "autoatendimento-eleitoral",
    name: "Autoatendimento Eleitoral · título e certidões",
    category: "documentos",
    description:
      "Canal do TSE para consultar serviços eleitorais, situação do título, local de votação e certidões.",
    keywords: [
      "titulo eleitor",
      "eleitoral",
      "eleicao",
      "votacao",
      "quitacao",
      "certidao",
    ],
    actionUrl:
      "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral",
    actionLabel: "Consultar serviços eleitorais",
    guidance:
      "Entre 07/05/2026 e 02/11/2026, primeiro título, transferência, atualização de dados e regularização de título cancelado estão suspensos por causa do calendário eleitoral. Os demais serviços e certidões continuam disponíveis no TSE.",
    sourceLabel: "Tribunal Superior Eleitoral",
    sourceUrl:
      "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral",
    verifiedAt: "07/10/2026",
  },
  {
    id: "consumidor-gov",
    name: "Consumidor.gov.br · reclamação contra empresas",
    category: "consumidor",
    description:
      "Serviço público gratuito para tratar problemas de consumo diretamente com empresas participantes.",
    keywords: [
      "consumidor",
      "reclamacao empresa",
      "compra",
      "cobranca",
      "produto",
      "problema consumo",
    ],
    actionUrl: "https://www.consumidor.gov.br/",
    actionLabel: "Consultar empresas e registrar reclamação",
    guidance:
      "Confira se a empresa participa da plataforma antes de registrar a reclamação. O canal trata problemas de consumo com empresas cadastradas; para demandas da Prefeitura, use a Ouvidoria Municipal. O atendimento acontece no portal externo e requer internet.",
    sourceLabel: "Ministério da Justiça",
    sourceUrl:
      "https://www.gov.br/mj/pt-br/acesso-a-informacao/perguntas-frequentes/consumidor/consumidor.Gov",
    verifiedAt: "06/10/2026",
  },

  {
    id: "delegacia-virtual-goias",
    name: "Delegacia Virtual de Goiás · boletim de ocorrência",
    category: "seguranca",
    description:
      "Registre pela internet ocorrências aceitas pela Polícia Civil de Goiás e acompanhe o protocolo sem precisar ir primeiro à delegacia.",
    keywords: [
      "boletim ocorrencia",
      "bo",
      "ocorrencia online",
      "delegacia virtual",
      "furto",
      "perda documento",
      "rai virtual",
    ],
    actionUrl: "https://goias.gov.br/policiacivil/delegacia-virtual/",
    actionLabel: "Abrir Delegacia Virtual",
    guidance:
      "Use somente o canal oficial. Situações com violência, ameaça ou risco imediato devem ser tratadas pelo 190 ou presencialmente conforme a orientação policial.",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: "https://goias.gov.br/policiacivil/delegacia-virtual/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "seguro-desemprego",
    name: "Seguro-Desemprego · solicitação e acompanhamento",
    category: "trabalho",
    description:
      "Canal oficial para solicitar o benefício e acompanhar o pedido pelos serviços digitais do trabalho.",
    keywords: [
      "seguro desemprego",
      "desempregado",
      "demissao",
      "beneficio trabalhador",
      "emprega brasil",
    ],
    phone: "158",
    actionUrl:
      "https://www.gov.br/pt-br/servicos/solicitar-o-seguro-desemprego",
    actionLabel: "Solicitar Seguro-Desemprego",
    guidance:
      "Tenha o número do requerimento entregue pelo empregador, quando aplicável, e entre com sua conta gov.br. A análise e a elegibilidade são do Ministério do Trabalho e Emprego.",
    sourceLabel: "Ministério do Trabalho e Emprego",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/solicitar-o-seguro-desemprego",
    verifiedAt: "06/10/2026",
  },
  {
    id: "expresso-goias",
    name: "Expresso Goiás · serviços estaduais em um só lugar",
    category: "cidadania",
    description:
      "Portal oficial que reúne serviços digitais de órgãos do Governo de Goiás, com acesso integrado à conta gov.br.",
    keywords: [
      "expresso goias",
      "servicos goias",
      "governo goias",
      "servico estadual",
      "gov goias",
    ],
    actionUrl: "https://www.go.gov.br/",
    actionLabel: "Abrir Portal Expresso",
    guidance:
      "Use o portal para localizar serviços estaduais digitais e presenciais. Alguns atendimentos exigem autenticação pela conta gov.br.",
    sourceLabel: "SEAD Goiás",
    sourceUrl: "https://www.go.gov.br/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "saude-digital-goias",
    name: "Saúde Digital Goiás · prontuário, regulação e consultas",
    category: "saude",
    description:
      "Acesso aos canais digitais da rede estadual para prontuário, fila da regulação, confirmação de consultas e serviços de medicamentos.",
    keywords: [
      "meu pep",
      "fila regulacao",
      "regulacao saude",
      "consulta exame",
      "medicamento alto custo",
      "cemac",
      "saude goias",
    ],
    actionUrl: "https://goias.gov.br/saude/",
    actionLabel: "Abrir portal da Saúde de Goiás",
    guidance:
      "A disponibilidade depende do serviço estadual e do seu atendimento na rede. Consulte o portal oficial para acessar cada ferramenta e verificar os requisitos.",
    sourceLabel: "SES-GO",
    sourceUrl:
      "https://goias.gov.br/saude/saiba-como-acessar-os-servicos-digitais-da-saude-em-goias/",
    verifiedAt: "06/10/2026",
  },
  {
    id: "passe-livre-pcd-goias",
    name: "Passe Livre da Pessoa com Deficiência · Goiás",
    category: "inclusao",
    description:
      "Gratuidade no transporte intermunicipal em Goiás para pessoa com deficiência que atenda aos critérios do programa.",
    keywords: [
      "pcd",
      "pessoa com deficiencia",
      "passe livre",
      "onibus",
      "transporte intermunicipal",
      "gratuidade",
    ],
    phone: "(62) 98104-3652",
    whatsappOnly: ["(62) 98104-3652"],
    email: "pcd@goias.gov.br",
    actionUrl:
      "https://goias.gov.br/social/passe-livre-da-pessoa-com-deficiencia/",
    actionLabel: "Consultar Passe Livre",
    guidance:
      "No interior, a orientação estadual é procurar o CRAS ou usar os canais da Gerência da Pessoa com Deficiência para confirmar onde solicitar. O benefício é para linhas intermunicipais dentro de Goiás.",
    documents: [
      "Laudo médico de especialista dentro da validade exigida",
      "Espelho do CadÚnico conforme o critério de renda",
      "Comprovante de residência em Goiás",
      "Documento de identificação e CPF",
      "Foto digital",
    ],
    verifiedAt: "06/10/2026",
    sourceLabel: "Desenvolvimento Social de Goiás",
    sourceUrl:
      "https://goias.gov.br/social/passe-livre-da-pessoa-com-deficiencia/",
  },
  {
    id: "servicos-urbanos-solicitacao",
    name: "Serviços urbanos · iluminação, buracos, bueiros e limpeza",
    category: "servicos-urbanos",
    description:
      "Canal municipal para solicitar manutenção de iluminação pública, recuperação de vias, limpeza urbana e serviços em bueiros e galerias.",
    keywords: [
      "buraco",
      "asfalto",
      "iluminacao publica",
      "lampada poste",
      "bueiro",
      "boca de lobo",
      "limpeza urbana",
      "varricao",
      "lixo",
      "galeria pluvial",
    ],
    address:
      "Rua 16, Quadra 31, Área Especial, Setor 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99303-4608",
    extraPhone: "(61) 3613-9458",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    email: "infraeobras@aguaslindasdegoias.go.gov.br",
    guidance:
      "Informe o tipo de problema e a localização com referência clara. Os serviços municipais atendem espaços públicos; confirme o protocolo e o atendimento pelo canal oficial.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-infraestrutura-e-obras/",
    mapQuery:
      "Secretaria Municipal de Infraestrutura e Obras, Rua 16, Quadra 31, Setor 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "defensoria-aguas-lindas",
    name: "Defensoria Pública · Mediação e Cidadania",
    category: "justica",
    description:
      "Atendimento público gratuito para orientação, mediação e acesso à Justiça conforme os critérios da DPE-GO.",
    keywords: [
      "defensoria",
      "advogado gratuito",
      "justica",
      "justiça",
      "direitos",
      "mediacao",
      "mediação",
      "processo",
      "familia",
      "família",
    ],
    address:
      "Quadra 36, Lote 1E, Quadra 53, Jardim Brasília, Águas Lindas de Goiás - GO, 72915-054",
    phone: "(62) 3602-1224",
    hours: "Segunda a sexta, 8h às 18h",
    email: "faleconosco@defensoria.go.def.br",
    actionUrl: "https://www2.defensoria.go.def.br/unidades-de-atendimento",
    actionLabel: "Consultar atendimento da DPE-GO",
    guidance:
      "A DPE-GO orienta procurar a unidade do município e verificar a área de atendimento. A assistência é gratuita para quem se enquadra nos critérios institucionais; confirme o direcionamento pela Central Virtual antes de sair.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Defensoria Pública de Goiás",
    sourceUrl: "https://www2.defensoria.go.def.br/unidades-de-atendimento",
    mapQuery:
      "Centro de Referência em Mediação e Cidadania, Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "tjgo-balcao-virtual",
    name: "Balcão Virtual · TJGO",
    category: "justica",
    description: "Atendimento por videoconferência com unidades judiciárias do Tribunal de Justiça de Goiás.",
    phone: "(62) 3216-2000",
    extraPhone: "(62) 3236-3700",
    hours: "Atendimento ao público: segunda a sexta, 12h–18h",
    keywords: ["balcao virtual", "tjgo", "tribunal justica", "atendimento judicial", "videoconferencia justica", "vara judicial", "forum online"],
    actionUrl: "https://www.tjgo.jus.br/index.php/bc-virtual",
    actionLabel: "Abrir Balcão Virtual do TJGO",
    guidance: "Escolha a unidade judiciária no portal oficial. O Balcão Virtual permite atendimento direto por videoconferência; horários específicos podem variar por unidade.",
    sourceLabel: "Tribunal de Justiça de Goiás",
    sourceUrl: "https://www.tjgo.jus.br/index.php/bc-virtual",
    verifiedAt: "07/10/2026",
  },
  {
    id: "tjgo-consulta-processual",
    name: "Consulta Processual · TJGO",
    category: "justica",
    description: "Consulta oficial de processos no Tribunal de Justiça do Estado de Goiás.",
    keywords: ["consulta processual", "processo tjgo", "numero processo", "andamento processo", "tribunal goias", "projudi"],
    actionUrl: "https://www.tjgo.jus.br/index.php/processos/consulta-processual/",
    actionLabel: "Consultar processo no TJGO",
    guidance: "Use a consulta oficial para localizar processos e movimentações disponíveis ao público. Processos sob sigilo ou com acesso restrito podem exigir autenticação ou não exibir todos os dados.",
    sourceLabel: "Tribunal de Justiça de Goiás",
    sourceUrl: "https://www.tjgo.jus.br/index.php/processos/consulta-processual/",
    verifiedAt: "07/10/2026",
  },
  {
    id: "creches-lista-espera",
    name: "Creches municipais · vagas e lista de espera",
    category: "educacao",
    description:
      "Guia oficial para acesso às vagas em creches municipais e conveniadas de Águas Lindas.",
    keywords: [
      "creche",
      "bercario",
      "berçario",
      "educacao infantil",
      "educação infantil",
      "vaga",
      "lista de espera",
      "matricula",
      "matrícula",
    ],
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/lista-de-espera-em-creches/",
    actionLabel: "Consultar vagas em creches",
    guidance:
      "Consulte o guia e a lista de espera atual antes de procurar uma unidade. A Prefeitura publica critérios de prioridade e orientações da Gerência de Matrículas Escolares.",
    verifiedAt: "06/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/lista-de-espera-em-creches/",
  },
  {
    id: "vigilancia-saude-municipal",
    name: "Vigilância em Saúde · sanitária, endemias e zoonoses",
    category: "saude",
    description:
      "Estrutura municipal responsável por vigilância epidemiológica, sanitária, ambiental, saúde do trabalhador, endemias e zoonoses.",
    keywords: [
      "vigilancia sanitaria",
      "vigilância sanitária",
      "vigilancia epidemiologica",
      "vigilância epidemiológica",
      "vigilancia ambiental",
      "vigilância ambiental",
      "saude do trabalhador",
      "saúde do trabalhador",
      "zoonoses",
      "dengue",
      "endemias",
      "surto",
      "epidemia",
      "escorpiao",
      "escorpião",
      "fiscalizacao sanitaria",
      "fiscalização sanitária",
      "risco sanitario",
      "risco sanitário",
      "saude ambiental",
      "saúde ambiental",
    ],
    actionUrl: "https://aguaslindasdegoias.go.gov.br/servicos/",
    actionLabel: "Consultar serviços municipais",
    guidance:
      "Use a busca de serviços da Prefeitura para localizar o atendimento correspondente. Esta ficha não presume endereço ou telefone porque a fonte consultada confirma a estrutura e as competências, mas não um único canal público para todas as áreas.",
    verifiedAt: "07/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://legislacao.aguaslindasdegoias.go.gov.br/leis/1606",
  },
  {
    id: "alistamento-militar",
    name: "Alistamento Militar · serviço oficial",
    category: "cidadania",
    description:
      "Faça o alistamento militar online quando estiver dentro do período e das regras oficiais ou consulte a Junta de Serviço Militar.",
    keywords: [
      "alistamento militar",
      "exercito",
      "servico militar",
      "junta militar",
      "reservista",
    ],
    actionUrl: "https://alistamento.eb.mil.br/alistamento",
    actionLabel: "Iniciar alistamento online",
    guidance:
      "O período, o público e as etapas seguem as regras oficiais do Ministério da Defesa. Fora do prazo ou quando o serviço online não se aplicar, consulte a Junta de Serviço Militar indicada no portal.",
    sourceLabel: "Ministério da Defesa",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/alistar-se-no-servico-militar-obrigatorio",
    verifiedAt: "06/10/2026",
  },
];

export const PUBLIC_SERVICE_SHORTCUTS = [
  {
    label: "Água e segunda via",
    query: "conta agua",
    hint: "Conta e atendimento Saneago",
  },
  {
    label: "CadÚnico e benefícios",
    query: "cadunico",
    hint: "Cadastro e Bolsa Família",
  },
  {
    label: "Emprego e trabalho",
    query: "emprego",
    hint: "SINE e canais oficiais",
  },
  {
    label: "MEI e empresa",
    query: "mei",
    hint: "Sala do Empreendedor e canais oficiais",
  },
  { label: "Agendar atendimento", query: "vapt vupt", hint: "Vapt Vupt" },
  {
    label: "Saúde mental / CAPS",
    query: "saude mental",
    hint: "Atendimento psicossocial municipal",
  },
  { label: "Falta de luz", query: "falta luz", hint: "Equatorial Goiás" },
  {
    label: "Conta de água e luz",
    query: "agua energia",
    hint: "Saneago, Equatorial, Tarifa Social e ANEEL",
  },
  {
    label: "Internet e telefonia",
    query: "internet telefonia",
    hint: "Anatel, linhas no CPF e bloqueio de telemarketing",
  },
  {
    label: "INSS e benefícios",
    query: "inss beneficio",
    hint: "Meu INSS, BPC, incapacidade e salário-maternidade",
  },
  {
    label: "Documentos pessoais",
    query: "documentos",
    hint: "CIN, CNH Digital, título, CTPS e antecedentes",
  },
  {
    label: "Celular roubado ou perdido",
    query: "celular seguro",
    hint: "Bloqueio oficial pelo gov.br",
  },
  {
    label: "Nota Fiscal e ISS",
    query: "nota fiscal iss",
    hint: "Atendimento tributário municipal",
  },
  {
    label: "ITBI",
    query: "itbi",
    hint: "Canal municipal por WhatsApp",
  },
  {
    label: "IPTU e taxas",
    query: "iptu",
    hint: "Impostos e taxas municipais",
  },
  {
    label: "Castração animal",
    query: "castracao",
    hint: "Projeto Bem-Estar Animal",
  },
  {
    label: "Inclusão e PCD",
    query: "pcd",
    hint: "Direitos, Ciptea e Passe Livre",
  },
  {
    label: "Assistência à família",
    query: "cras",
    hint: "Veja as três unidades",
  },
  {
    label: "CPF e Receita Federal",
    query: "receita federal",
    hint: "Ponto conveniado oficial",
  },
  {
    label: "Reclamação municipal",
    query: "ouvidoria municipal",
    hint: "Ouvidoria e orientação",
  },
  {
    label: "Transparência e SIC",
    query: "transparencia",
    hint: "Gastos, processos, leis e acesso à informação",
  },
  {
    label: "Vacina e UBS",
    query: "vacina",
    hint: "Rede municipal de saúde",
  },
  {
    label: "Matrícula escolar",
    query: "matricula",
    hint: "Secretaria Municipal de Educação",
  },
  {
    label: "Cultura e editais",
    query: "cultura",
    hint: "Agentes, editais, mapa e calendário",
  },
  {
    label: "Esporte e lazer",
    query: "esporte",
    hint: "Secretaria e Projeto MultiEsportes",
  },
  {
    label: "ID Jovem e primeiro emprego",
    query: "jovem",
    hint: "ID Jovem, aprendizagem e orientação municipal",
  },
  {
    label: "CNH e veículo",
    query: "cnh",
    hint: "Detran-GO",
  },
  {
    label: "Carteira da Pessoa Idosa",
    query: "carteira idoso",
    hint: "Transporte interestadual",
  },
  {
    label: "Carteira do autista",
    query: "ciptea",
    hint: "Documentos e canal estadual",
  },
  {
    label: "Meu SUS Digital",
    query: "meu sus",
    hint: "Vacinas e registros de saúde",
  },
  {
    label: "Título e certidões",
    query: "eleitoral",
    hint: "Autoatendimento do TSE",
  },
  {
    label: "Problema com uma compra",
    query: "consumidor",
    hint: "Proteção do consumidor",
  },
  {
    label: "Boletim de ocorrência",
    query: "boletim ocorrencia",
    hint: "Delegacia Virtual de Goiás",
  },
  {
    label: "Seguro-Desemprego",
    query: "seguro desemprego",
    hint: "Solicitação oficial pelo gov.br",
  },
  {
    label: "Serviços estaduais",
    query: "expresso goias",
    hint: "Portal Expresso Goiás",
  },
  {
    label: "Regulação e prontuário",
    query: "regulacao saude",
    hint: "Saúde Digital Goiás",
  },
  {
    label: "Alistamento militar",
    query: "alistamento militar",
    hint: "Canal oficial do serviço militar",
  },
  {
    label: "Moradia e regularização",
    query: "regularizacao fundiaria",
    hint: "Habitação e regularização municipal",
  },
  {
    label: "Obras e infraestrutura",
    query: "infraestrutura obras",
    hint: "Atendimento municipal sobre vias e obras",
  },
  {
    label: "Água, esgoto e vazamento",
    query: "vazamento agua",
    hint: "Saneago e atendimento de saneamento",
  },
  {
    label: "Direitos da mulher",
    query: "mulher",
    hint: "Atendimento, proteção e orientação",
  },
  {
    label: "Creches e vagas",
    query: "creche",
    hint: "Educação infantil e lista de espera",
  },
  {
    label: "Dengue e zoonoses",
    query: "zoonoses",
    hint: "Vigilância, endemias e saúde ambiental",
  },
  {
    label: "Delegacia da Mulher",
    query: "deam",
    hint: "Atendimento especializado",
  },
  {
    label: "Farmácia Popular",
    query: "farmacia popular",
    hint: "Medicamentos e participantes",
  },
  {
    label: "Ouvidoria do SUS",
    query: "ouvsus",
    hint: "Informação e manifestação",
  },
  {
    label: "Defensoria e direitos",
    query: "defensoria",
    hint: "Orientação jurídica gratuita",
  },
  {
    label: "Processo e Justiça",
    query: "processo justica",
    hint: "Balcão Virtual, consulta processual e Defensoria",
  },
  {
    label: "Passe Livre PCD",
    query: "passe livre",
    hint: "Gratuidade intermunicipal em Goiás",
  },
  {
    label: "Buraco, luz ou bueiro",
    query: "buraco",
    hint: "Solicitar manutenção urbana",
  },
  {
    label: "Meio ambiente",
    query: "meio ambiente",
    hint: "Atendimento ambiental municipal",
  },
] as const;

export function searchPublicServices(
  query = "",
  category: PublicServiceCategory | "todos" = "todos"
) {
  // Citizens search for a need rather than an agency name. Ignore only linking
  // words; keep every substantive word so specific needs remain specific.
  const search = normalizeCatalogText(query)
    .split(" ")
    .filter(
      term => !["de", "da", "do", "das", "dos", "e", "para"].includes(term)
    )
    .join(" ");
  return PUBLIC_SERVICES.filter(service => {
    if (category !== "todos" && service.category !== category) return false;
    // Exact agency searches should stay concise even when other services
    // mention the agency only as referral guidance.
    if (search === "cras" && !service.id.startsWith("cras-")) return false;
    if (search === "cpf" && service.id !== "receita-federal-pav") return false;
    const conciseIntent = /^[a-z0-9]{2,4}$/.test(search);
    if (conciseIntent) {
      return matchesCatalogText(search, [
        service.name,
        service.category,
        service.actionLabel,
        ...(service.keywords ?? []),
      ]);
    }
    const includeCategoryIntent = search.split(" ").filter(Boolean).length <= 2;
    return matchesCatalogText(search, [
      service.name,
      service.description,
      service.address,
      service.phone,
      service.extraPhone,
      ...(includeCategoryIntent ? [service.category] : []),
      service.guidance,
      service.actionLabel,
      service.hours,
      ...(service.keywords ?? []),
    ]);
  });
}
