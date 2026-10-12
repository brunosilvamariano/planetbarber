# Entrada por barbearia

Cada barbearia compartilha seu próprio link, sem catálogo de empresas ou seleção de perfil:

- Cliente: `/cliente?empresa=studio-original` — login e cadastro de cliente exclusivamente nessa empresa.
- Equipe: `/app?empresa=studio-original` — login de gestor e barbeiro; sem cadastro de nova empresa.
- Proprietário do SaaS: `/master` — entrada independente, sem link na entrada dos usuários.

Gestor e barbeiro encontram o link para clientes em Configurações. A tela de acesso consulta somente nome e slug da empresa ativa, sem expor métricas, dados de clientes ou planos. Links inválidos ou de empresas suspensas não habilitam o formulário. O cadastro de cliente mantém as permissões definidas pelo servidor; não cria barbeiro ou gestor.

Ao abrir um link de outra empresa ou outra área, uma sessão incompatível não é restaurada no painel e é encerrada antes da nova entrada. A conta continua vinculada ao tenant no servidor; os parâmetros da URL não autorizam acesso a dados. As políticas RLS e os controles de perfil continuam obrigatórios.

A entrada geral `/app` permanece disponível para aquisição de novas barbearias, separada do link da equipe que contém `empresa`. `/cliente` sem empresa permite informar manualmente o identificador, sem listar outras barbearias. Nome comercial aparece na entrada e na sidebar da empresa; domínio próprio e identidade visual completa por tenant continuam sendo uma evolução independente.

Para aplicar as alterações de API e frontend no Docker: `docker compose up -d --build`. Não é preciso recriar o banco ou apagar volumes. O Vite em execução atualiza o frontend automaticamente; a API Docker precisa desse rebuild.
