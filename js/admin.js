// ========================================
// LÓGICA DO PAINEL ADMIN (VERSÃO FINAL)
// ========================================

document.addEventListener('DOMContentLoaded', verificarPermissaoAdmin)

// Variável global para armazenar a lista de convidados (para filtragem rápida)
let listaGlobalConvidados = []

// --- 1. SEGURANÇA E INICIALIZAÇÃO ---
async function verificarPermissaoAdmin() {
  console.log('🔒 Iniciando verificação de segurança...')
  
  const usuarioLocal = verificarLogin() // Função do auth.js

  if (!usuarioLocal) {
    alert('Você precisa estar logado para acessar aqui.')
    window.location.href = 'login.html'
    return
  }

  try {
    // Verificar no banco se é admin mesmo
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioLocal.id)
      .single()

    if (error || !user.is_admin) {
      throw new Error('Usuário não é administrador')
    }

    // ✅ Sucesso: É Admin
    console.log('✅ Acesso permitido para:', user.nome)
    
    document.getElementById('admin-nome').textContent = user.nome
    document.getElementById('loading-screen').style.display = 'none'
    document.getElementById('admin-content').style.display = 'block'

    // Carregar todos os dados iniciais
    carregarDashboard()
    carregarConvidados()
    carregarPresentesAdmin()
    carregarMensagens() // Carrega o mural de recados

  } catch (erro) {
    console.error('Erro de permissão:', erro)
    alert('⛔ Acesso Negado! Esta área é restrita aos noivos.')
    window.location.href = 'index.html'
  }
}

// --- 2. NAVEGAÇÃO ENTRE ABAS ---
function alternarAba(abaNome) {
  // 1. Esconder todas as abas
  document.querySelectorAll('.aba-view').forEach(div => {
    div.style.display = 'none'
  })
  
  // 2. Remover classe 'ativo' de todos os botões
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('ativo')
  })

  // 3. Mostrar a aba certa
  const aba = document.getElementById(`view-${abaNome}`)
  if (aba) aba.style.display = 'block'
  
  // 4. Ativar o botão certo
  const botoes = document.querySelectorAll('.nav-btn')
  // A ordem dos botões no HTML é: 0=Dashboard, 1=Convidados, 2=Presentes, 3=Mensagens
  if (abaNome === 'dashboard') botoes[0].classList.add('ativo')
  if (abaNome === 'convidados') botoes[1].classList.add('ativo')
  if (abaNome === 'presentes') botoes[2].classList.add('ativo')
  if (abaNome === 'mensagens') botoes[3].classList.add('ativo')
}

// --- 3. DASHBOARD (RESUMO) ---
async function carregarDashboard() {
  try {
    // Buscar Convidados
    const { data: conv } = await supabase.from('convidados').select('confirmado')
    
    if (conv) {
      const total = conv.length
      const sim = conv.filter(c => c.confirmado === true).length
      const nao = conv.filter(c => c.confirmado === false).length
      const pendente = conv.filter(c => c.confirmado === null).length

      document.getElementById('total-convidados').textContent = total
      document.getElementById('total-sim').textContent = sim
      document.getElementById('total-nao').textContent = nao
      document.getElementById('total-pendente').textContent = pendente
    }

    // Buscar Presentes
    const { data: pres } = await supabase.from('presentes').select('reservado')
    
    if (pres) {
      const totalPres = pres.length
      const reservados = pres.filter(p => p.reservado === true).length

      document.getElementById('total-presentes').textContent = reservados
      document.getElementById('msg-presentes').textContent = `${reservados} de ${totalPres} itens`
    }

  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  }
}

// --- 4. GESTÃO DE CONVIDADOS ---
async function carregarConvidados() {
  try {
    const { data, error } = await supabase
      .from('convidados')
      .select('*, familias(nome_familia)')
      .order('nome')

    if (error) throw error

    listaGlobalConvidados = data || []
    renderizarTabela(listaGlobalConvidados)

  } catch (error) {
    console.error('Erro ao buscar convidados:', error)
    alert('Erro ao carregar lista de convidados.')
  }
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('lista-convidados-body')
  tbody.innerHTML = ''

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum convidado encontrado.</td></tr>'
    return
  }

  // Criar HTML de cada linha
  const htmlLinhas = lista.map(c => {
    let statusIcon = '⏳ Pendente'
    let statusColor = 'orange'
    
    if (c.confirmado === true) {
      statusIcon = '✅ Confirmado'
      statusColor = 'green'
    } else if (c.confirmado === false) {
      statusIcon = '❌ Não vai'
      statusColor = 'red'
    }

    return `
      <tr>
        <td>${c.nome}</td>
        <td>${c.familias ? c.familias.nome_familia : '-'}</td>
        <td style="color:${statusColor}; font-weight:bold;">${statusIcon}</td>
        <td>
          ${c.confirmado !== null ? 
            `<button class="btn-reset" onclick="resetarPresenca('${c.id}')" title="Resetar status">↺</button>` 
            : '-'}
        </td>
      </tr>
    `
  }).join('')

  tbody.innerHTML = htmlLinhas
}

function filtrarTabela(status) {
  // Atualizar visual dos botões
  document.querySelectorAll('.filtros-admin .btn-filtro').forEach(btn => btn.classList.remove('ativo'))
  if(event && event.target) event.target.classList.add('ativo')

  if (status === 'todos') {
    renderizarTabela(listaGlobalConvidados)
  } else {
    // status pode ser true, false ou null
    const filtrados = listaGlobalConvidados.filter(c => c.confirmado === status)
    renderizarTabela(filtrados)
  }
}

async function resetarPresenca(id) {
  if(!confirm('Tem certeza que deseja resetar a confirmação deste convidado para PENDENTE?')) return

  try {
    const { error } = await supabase
      .from('convidados')
      .update({ confirmado: null, data_confirmacao: null })
      .eq('id', id)

    if (error) throw error

    carregarConvidados() // Recarrega tabela
    carregarDashboard()  // Recarrega contadores

  } catch (error) {
    alert('Erro ao resetar: ' + error.message)
  }
}

// --- 5. GESTÃO DE PRESENTES ---
async function carregarPresentesAdmin() {
  try {
    const { data, error } = await supabase
      .from('presentes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const container = document.getElementById('lista-presentes-admin')
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Nenhum presente cadastrado.</p>'
      return
    }

    container.innerHTML = data.map(p => `
      <div class="card-presente-admin">
        <img src="${p.imagem_url}" onerror="this.src='img/presente-default.jpg'">
        <h4>${p.nome}</h4>
        <p class="categoria-badge">${p.categoria}</p>
        <p style="color:#d4af37; font-weight:bold; font-size:1.2rem;">R$ ${p.valor.toFixed(2)}</p>
        
        <div style="margin: 10px 0; font-size: 0.9rem;">
          ${p.reservado 
            ? `<span style="color:green">🔒 Reservado por: <b>${p.reservado_por}</b></span>` 
            : `<span style="color:#666">🟢 Disponível</span>`
          }
        </div>

        <button class="btn-excluir" onclick="deletarPresente('${p.id}')">🗑 Excluir</button>
      </div>
    `).join('')

  } catch (error) {
    console.error('Erro ao carregar presentes:', error)
  }
}

function toggleFormPresente() {
  const form = document.getElementById('form-novo-presente')
  form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none'
}

// Salvar novo presente
const formPresente = document.getElementById('form-novo-presente')
if (formPresente) {
  formPresente.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const btnSalvar = formPresente.querySelector('button[type="submit"]')
    btnSalvar.textContent = 'Salvando...'
    btnSalvar.disabled = true

    try {
      const novoPresente = {
        nome: document.getElementById('pres-nome').value,
        categoria: document.getElementById('pres-categoria').value,
        valor: parseFloat(document.getElementById('pres-valor').value),
        imagem_url: document.getElementById('pres-imagem').value,
        reservado: false
      }

      const { error } = await supabase.from('presentes').insert([novoPresente])

      if (error) throw error

      alert('🎁 Presente adicionado com sucesso!')
      formPresente.reset()
      toggleFormPresente() // Esconder formulário
      carregarPresentesAdmin() // Recarregar lista
      carregarDashboard()      // Atualizar contadores

    } catch (error) {
      alert('Erro ao salvar presente: ' + error.message)
    } finally {
      btnSalvar.textContent = 'Salvar Presente'
      btnSalvar.disabled = false
    }
  })
}

async function deletarPresente(id) {
  if(!confirm('ATENÇÃO: Tem certeza que deseja excluir este presente? Esta ação não pode ser desfeita.')) return

  try {
    const { error } = await supabase.from('presentes').delete().eq('id', id)
    if (error) throw error

    carregarPresentesAdmin()
    carregarDashboard()

  } catch (error) {
    alert('Erro ao excluir: ' + error.message)
  }
}

// --- 6. MENSAGENS (MURAL) ---
async function carregarMensagens() {
  try {
    const { data, error } = await supabase
      .from('mensagens')
      .select('*, usuarios(nome)')
      .order('created_at', { ascending: false })

    if (error) throw error

    const div = document.getElementById('lista-mensagens')
    
    if (!data || data.length === 0) {
      div.innerHTML = '<p>Nenhum recado deixado ainda.</p>'
      return
    }

    div.innerHTML = data.map(m => {
      const dataFormatada = new Date(m.created_at).toLocaleDateString('pt-BR')
      return `
        <div class="card-mensagem">
          <span class="msg-autor">${m.usuarios ? m.usuarios.nome : 'Anônimo'}</span>
          <p class="msg-texto">"${m.mensagem}"</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="msg-data">${dataFormatada}</span>
            <button class="btn-reset" style="background:#ff4444; color:white;" onclick="deletarMensagem('${m.id}')">🗑</button>
          </div>
        </div>
      `
    }).join('')

  } catch (error) {
    console.error('Erro ao carregar mensagens:', error)
  }
}

async function deletarMensagem(id) {
  if(!confirm('Excluir esta mensagem permanentemente?')) return
  
  try {
    const { error } = await supabase.from('mensagens').delete().eq('id', id)
    if (error) throw error
    
    carregarMensagens() // Recarregar lista
  } catch (error) {
    alert('Erro ao excluir mensagem.')
  }
}