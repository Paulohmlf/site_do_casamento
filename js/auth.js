// ========================================
// SISTEMA DE AUTENTICAÇÃO E SEGURANÇA
// ========================================

// 1. EXECUTA IMEDIATAMENTE AO CARREGAR O ARQUIVO
protegerPagina()

function protegerPagina() {
  const caminhoAtual = window.location.pathname
  const paginaAtual = caminhoAtual.split('/').pop() // Pega 'index.html', 'login.html', etc.

  // Lista de páginas que TODO MUNDO pode ver (sem login)
  // OBS: Se quiser bloquear a lista de presentes também, remova 'presentes.html' daqui.
  const paginasPublicas = ['login.html', 'cadastro.html', 'presentes.html']

  // Verifica se tem usuário salvo
  const usuario = obterUsuarioLogado()

  // --- CENÁRIO 1: USUÁRIO NÃO ESTÁ LOGADO ---
  if (!usuario) {
    // Se a página atual NÃO é pública (ou seja, é Index, Admin ou RSVP)...
    // ... e não é a raiz do site vazia (alguns servidores usam / para index)
    if (!paginasPublicas.includes(paginaAtual)) {
      console.log('🔒 Página protegida. Redirecionando para login...')
      // Salva a página que ele queria ir para voltar depois (opcional, mas útil)
      sessionStorage.setItem('paginaDestino', paginaAtual || 'index.html')
      window.location.href = 'login.html'
    }
  } 
  
  // --- CENÁRIO 2: USUÁRIO JÁ ESTÁ LOGADO ---
  else {
    // Se ele tentar entrar na tela de Login ou Cadastro, joga ele para dentro do site (Home)
    if (paginaAtual === 'login.html' || paginaAtual === 'cadastro.html') {
      window.location.href = 'index.html'
    }
  }
}

// 2. LÓGICA DO FORMULÁRIO DE LOGIN
if (document.getElementById('form-login')) {
  document.getElementById('form-login').addEventListener('submit', async function(e) {
    e.preventDefault()

    const email = document.getElementById('email').value.trim()
    const senha = document.getElementById('senha').value

    if (!validarEmail(email)) {
      mostrarErro('Por favor, insira um e-mail válido.')
      return
    }

    const botao = document.querySelector('button[type="submit"]')
    botao.disabled = true
    botao.textContent = '⏳ Entrando...'

    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', senha)
        .single()

      if (error || !usuario) {
        mostrarErro('E-mail ou senha incorretos!')
        botao.disabled = false
        botao.textContent = 'Entrar'
        return
      }

      // Salvar sessão
      localStorage.setItem('usuario', JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }))

      mostrarSucesso(`Bem-vindo(a), ${usuario.nome}!`)
      
      // Verifica se ele estava tentando ir para algum lugar específico
      const destino = sessionStorage.getItem('paginaDestino') || 'index.html'
      sessionStorage.removeItem('paginaDestino')

      setTimeout(() => {
        window.location.href = destino
      }, 1000)

    } catch (error) {
      console.error('Erro:', error)
      mostrarErro('Erro ao fazer login.')
      botao.disabled = false
      botao.textContent = 'Entrar'
    }
  })
}

// 3. LÓGICA DO FORMULÁRIO DE CADASTRO
if (document.getElementById('form-cadastro')) {
  document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault()

    const nome = document.getElementById('nome').value.trim()
    const email = document.getElementById('email').value.trim()
    const senha = document.getElementById('senha').value
    const confirmarSenha = document.getElementById('confirmar-senha').value

    if (!validarEmail(email)) {
      mostrarErro('E-mail inválido.')
      return
    }
    if (senha !== confirmarSenha) {
      mostrarErro('As senhas não coincidem!')
      return
    }
    if (senha.length < 6) {
      mostrarErro('Senha muito curta (mínimo 6 caracteres).')
      return
    }

    const botao = document.querySelector('button[type="submit"]')
    botao.disabled = true
    botao.textContent = '⏳ Criando...'

    try {
      // Verifica duplicidade
      const { data: jaExiste } = await supabase.from('usuarios').select('id').eq('email', email).single()
      if (jaExiste) {
        mostrarErro('Este e-mail já possui cadastro.')
        botao.disabled = false; botao.textContent = 'Criar Conta'
        return
      }

      // Cria usuário
      const { error } = await supabase.from('usuarios').insert([{ nome, email, senha }])
      if (error) throw error

      mostrarSucesso('Conta criada com sucesso! Faça login.')
      setTimeout(() => window.location.href = 'login.html', 1500)

    } catch (err) {
      console.error(err)
      mostrarErro('Erro ao criar conta. Tente novamente.')
      botao.disabled = false; botao.textContent = 'Criar Conta'
    }
  })
}

// --- FUNÇÕES AUXILIARES ---
function obterUsuarioLogado() {
  const userStr = localStorage.getItem('usuario')
  return userStr ? JSON.parse(userStr) : null
}

function verificarLogin() {
  return obterUsuarioLogado()
}

function logout() {
  localStorage.removeItem('usuario')
  window.location.href = 'login.html'
}