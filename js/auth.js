// ========================================
// SISTEMA DE AUTENTICAÇÃO
// ========================================

// Verificar se está na página de cadastro
if (document.getElementById('form-cadastro')) {
  document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault()

    const nome = document.getElementById('nome').value.trim()
    const email = document.getElementById('email').value.trim()
    const senha = document.getElementById('senha').value
    const confirmarSenha = document.getElementById('confirmar-senha').value

    // Validações
    if (!validarEmail(email)) {
      mostrarErro('Por favor, insira um e-mail válido.')
      return
    }

    if (senha !== confirmarSenha) {
      mostrarErro('As senhas não coincidem!')
      return
    }

    if (senha.length < 6) {
      mostrarErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    const botao = document.querySelector('button[type="submit"]')
    botao.disabled = true
    botao.textContent = '⏳ Criando conta...'

    try {
      // Verificar se email já existe
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .single()

      if (usuarioExistente) {
        mostrarErro('Este e-mail já está cadastrado. Faça login.')
        botao.disabled = false
        botao.textContent = 'Criar Conta'
        return
      }

      // Inserir novo usuário (senha em texto simples por enquanto)
      // TODO: Implementar hash de senha em produção
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          nome: nome,
          email: email,
          senha: senha
        }])
        .select()

      if (error) throw error

      mostrarSucesso('Conta criada com sucesso! Redirecionando para login...')
      
      setTimeout(() => {
        window.location.href = 'login.html'
      }, 2000)

    } catch (error) {
      console.error('Erro ao criar conta:', error)
      mostrarErro('Erro ao criar conta. Tente novamente.')
    } finally {
      botao.disabled = false
      botao.textContent = 'Criar Conta'
    }
  })
}

// Verificar se está na página de login
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
      // Buscar usuário
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

      // Salvar dados do usuário no localStorage
      localStorage.setItem('usuario', JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }))

      mostrarSucesso(`Bem-vindo(a), ${usuario.nome}! Redirecionando...`)
      
      setTimeout(() => {
        window.location.href = 'rsvp.html'
      }, 1500)

    } catch (error) {
      console.error('Erro ao fazer login:', error)
      mostrarErro('Erro ao fazer login. Tente novamente.')
    } finally {
      botao.disabled = false
      botao.textContent = 'Entrar'
    }
  })
}

// Função para verificar se usuário está logado
function verificarLogin() {
  const usuario = localStorage.getItem('usuario')
  if (!usuario) {
    window.location.href = 'login.html'
    return null
  }
  return JSON.parse(usuario)
}

// Função para fazer logout
function logout() {
  localStorage.removeItem('usuario')
  window.location.href = 'index.html'
}

console.log('✅ Sistema de autenticação carregado!')
