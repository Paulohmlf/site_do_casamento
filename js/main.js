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

// ========================================
// BOTÃO ADMIN (Aparece apenas para administradores)
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
  // 1. Verificar se tem alguém logado no navegador
  const usuarioStr = localStorage.getItem('usuario')
  if (!usuarioStr) return // Se não tiver ninguém, não faz nada

  const usuario = JSON.parse(usuarioStr)

  try {
    // 2. Perguntar ao Supabase se esse usuário é Admin
    const { data: usuarioBanco, error } = await supabase
      .from('usuarios')
      .select('is_admin')
      .eq('id', usuario.id)
      .single()

    // 3. Se for Admin, criar e mostrar o botão
    if (usuarioBanco && usuarioBanco.is_admin === true) {
      const btnAdmin = document.createElement('a')
      btnAdmin.href = 'admin.html'
      btnAdmin.innerHTML = '👑 Painel'
      
      // Estilos do botão (Flutuante no topo direito)
      Object.assign(btnAdmin.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        backgroundColor: '#1a2332', // Azul Marinho
        color: '#d4af37',           // Dourado
        padding: '10px 20px',
        borderRadius: '30px',
        textDecoration: 'none',
        fontWeight: 'bold',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        border: '2px solid #d4af37',
        cursor: 'pointer',
        transition: 'transform 0.2s'
      })

      // Efeito de hover (mouse em cima)
      btnAdmin.onmouseover = () => btnAdmin.style.transform = 'scale(1.05)'
      btnAdmin.onmouseout = () => btnAdmin.style.transform = 'scale(1)'

      document.body.appendChild(btnAdmin)
      console.log('👑 Botão de admin adicionado à tela')
    }
  } catch (err) {
    console.error('Verificação de admin silenciosa falhou:', err)
  }
})