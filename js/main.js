// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// Função auxiliar para formatar data
function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Função para exibir mensagem de sucesso
function mostrarSucesso(mensagem) {
  alert(`✅ ${mensagem}`)
}

// Função para exibir mensagem de erro
function mostrarErro(mensagem) {
  alert(`❌ ${mensagem}`)
}

// Validar email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// Log de inicialização (para debug)
console.log('✅ Supabase configurado e pronto!')
