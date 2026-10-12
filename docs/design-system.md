# Interface premium

O login e o painel Master usam superfícies suaves, hierarquia tipográfica e espaçamento inspirados em interfaces Apple, sem copiar identidade de marca. O arquivo `apps/web/src/premium.css` estende o sistema existente; `styles.css` continua fornecendo tokens de tema, sidebar, formulários e componentes compartilhados.

## Tokens e composição

- Cores semânticas: background, foreground, card, primary, border e muted-foreground existentes, com versões clara e escura.
- Superfícies: raio de 22 px para painéis, 19 px para indicadores e 12 px para campos. Sombras discretas e destaque azul para a receita recorrente.
- Tipografia: Inter variável, títulos de 26–38 px no painel, 28–32 px no formulário e texto auxiliar de 10–12 px.
- Responsividade: indicadores em quatro ou duas colunas, gráficos em uma coluna no celular, tabela com rolagem interna e sidebar responsiva existente.
- Acessibilidade: foco de teclado preservado, botões de período com aria-pressed, descrições textuais dos gráficos, mostrar/ocultar senha e respeito a prefers-reduced-motion.

## Componentes e dados

`AuthVisual` é uma composição decorativa sem dados reais. `AuthPage` preserva React Hook Form, Zod, contexto da barbearia e autenticação por perfil. O tema pode ser alternado antes de entrar. Google só aparece no formulário quando a integração está disponível; a mensagem diagnóstica continua disponível no componente de vinculação da conta.

`MasterDashboard` carrega sob demanda e usa o snapshot existente da API. MRR e ARR são métricas gerenciais de planos ativos, não pagamentos recebidos. O gráfico de aquisição conta empresas por data de criação; não reconstrói receitas históricas a partir do plano atual. Registros sem data não entram nesse gráfico. Status e distribuição por plano representam a base atual, com escolha entre quantidade de empresas e MRR.

O estado inicial sem empresas mostra valores zerados, gráficos vazios e uma ação para cadastrar a primeira empresa. Não há percentuais de crescimento simulados ou preços inventados para Enterprise. A tabela mantém as ações existentes de plano e status. Login, cadastro por tenant, sessão, logout, permissões e regras do backend não foram substituídos pelo redesign.

## Validação

Verificados build de produção, TypeScript, cálculos com empresas ativas/suspensas/Enterprise, transição de ano, base vazia, seleção de período, abertura do formulário de nova empresa, mostrar senha e largura do painel em notebook/celular. A inspeção visual usou a demonstração local, sem alterar o banco de produção. O primeiro login real após publicação deve ser verificado pelo proprietário.
