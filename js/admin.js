// ========================================
// LÓGICA DO PAINEL ADMIN (VERSÃO FINAL)
// ========================================

document.addEventListener('DOMContentLoaded', verificarPermissaoAdmin)

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
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioLocal.id)
      .single()

    if (error || !user.is_admin) {
      throw new Error('Usuário não é administrador')
    }

    console.log('✅ Acesso permitido para:', user.nome)
    
    document.getElementById('admin-nome').textContent = user.nome
    document.getElementById('loading-screen').style.display = 'none'
    document.getElementById('admin-content').style.display = 'block'

    carregarDashboard()
    carregarConvidados()
    carregarPresentesAdmin()
    carregarReservas()
    carregarMensagens()

  } catch (erro) {
    console.error('Erro de permissão:', erro)
    alert('⛔ Acesso Negado! Esta área é restrita aos noivos.')
    window.location.href = 'index.html'
  }
}

// --- 2. NAVEGAÇÃO ENTRE ABAS ---
function alternarAba(abaNome) {
  document.querySelectorAll('.aba-view').forEach(div => div.style.display = 'none')
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('ativo'))

  const aba = document.getElementById(`view-${abaNome}`)
  if (aba) aba.style.display = 'block'
  
  const botoes = document.querySelectorAll('.nav-btn')
  // Ordem: 0=Dash, 1=Conv, 2=Pres, 3=Reservas, 4=Msg
  if (abaNome === 'dashboard') botoes[0].classList.add('ativo')
  if (abaNome === 'convidados') botoes[1].classList.add('ativo')
  if (abaNome === 'presentes') botoes[2].classList.add('ativo')
  if (abaNome === 'reservas') botoes[3].classList.add('ativo')
  if (abaNome === 'mensagens') botoes[4].classList.add('ativo')
}

// --- 3. DASHBOARD (RESUMO) ---
async function carregarDashboard() {
  try {
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

  const htmlLinhas = lista.map(c => {
    let statusIcon = '⏳ Pendente'
    let statusColor = 'orange'
    if (c.confirmado === true) { statusIcon = '✅ Confirmado'; statusColor = 'green' }
    else if (c.confirmado === false) { statusIcon = '❌ Não vai'; statusColor = 'red' }

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
  document.querySelectorAll('.filtros-admin .btn-filtro').forEach(btn => btn.classList.remove('ativo'))
  if(event && event.target) event.target.classList.add('ativo')

  if (status === 'todos') {
    renderizarTabela(listaGlobalConvidados)
  } else {
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

    carregarConvidados()
    carregarDashboard()

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
            ? `<span style="color:green">🔒 Reservado</span>` 
            : `<span style="color:#666">🟢 Disponível</span>`
          }
        </div>

        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <button onclick="editarNome('${p.id}', '${p.nome}')" 
             style="flex: 1; background: #FF9800; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">
             ✏️ Nome
          </button>
          
          <button onclick="editarPreco('${p.id}', '${p.valor}')" 
             style="flex: 1; background: #2196F3; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">
             💲 Preço
          </button>
        </div>

        <button class="btn-excluir" onclick="deletarPresente('${p.id}')" style="margin-top: 5px;">
             🗑 Excluir
        </button>
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
      toggleFormPresente()
      carregarPresentesAdmin()
      carregarDashboard()

    } catch (error) {
      alert('Erro ao salvar presente: ' + error.message)
    } finally {
      btnSalvar.textContent = 'Salvar Presente'
      btnSalvar.disabled = false
    }
  })
}

// FUNÇÃO: Editar Preço
async function editarPreco(id, valorAtual) {
  const novoValor = prompt("Digite o novo valor (Use ponto para centavos, ex: 150.50):", valorAtual)
  if (novoValor === null || novoValor.trim() === "") return

  const valorFloat = parseFloat(novoValor.replace(',', '.'))

  if (isNaN(valorFloat) || valorFloat < 0) {
    alert("Por favor, digite um valor válido!")
    return
  }

  try {
    const { error } = await supabase
      .from('presentes').update({ valor: valorFloat }).eq('id', id)

    if (error) throw error
    alert("✅ Preço atualizado!")
    carregarPresentesAdmin()

  } catch (error) {
    alert("Erro: " + error.message)
  }
}

// NOVA FUNÇÃO: Editar Nome
async function editarNome(id, nomeAtual) {
  const novoNome = prompt("Digite o novo nome para este presente:", nomeAtual)
  if (novoNome === null || novoNome.trim() === "") return

  try {
    const { error } = await supabase
      .from('presentes').update({ nome: novoNome.trim() }).eq('id', id)

    if (error) throw error
    alert("✅ Nome atualizado!")
    carregarPresentesAdmin()

  } catch (error) {
    alert("Erro: " + error.message)
  }
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

// --- 6. GESTÃO DE RESERVAS (ROBUSTO) ---
async function carregarReservas() {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*, presentes(nome, valor)')
      .order('created_at', { ascending: false })

    if (error) throw error

    const tbody = document.getElementById('lista-reservas-body')
    tbody.innerHTML = ''

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma reserva encontrada.</td></tr>'
      return
    }

    tbody.innerHTML = data.map(r => {
      const dataFormatada = new Date(r.created_at).toLocaleDateString('pt-BR')
      const nomeItem = r.presentes ? r.presentes.nome : '<span style="color:red">Item Excluído</span>'
      const valorItem = r.presentes ? `R$ ${r.presentes.valor.toFixed(2)}` : '-'

      return `
        <tr>
          <td>
            <strong>${nomeItem}</strong><br>
            <span style="font-size:0.8rem; color:#666">${valorItem}</span>
          </td>
          <td>
            ${r.nome_comprador}<br>
            <span style="font-size:0.8rem; color:#888">${r.email_comprador}</span>
          </td>
          <td>${dataFormatada}</td>
          <td>
            <button class="btn-excluir" style="width: auto; padding: 5px 10px;" onclick="cancelarReserva('${r.id}', '${r.presente_id}')">
              ❌ Cancelar
            </button>
          </td>
        </tr>
      `
    }).join('')
  } catch (error) { console.error('Erro ao carregar reservas:', error) }
}

async function cancelarReserva(idReserva, idPresente) {
  if (!confirm('Tem certeza que deseja CANCELAR esta reserva?')) return

  try {
    // 1. Apaga a reserva da tabela 'reservas'
    const { error } = await supabase.from('reservas').delete().eq('id', idReserva)
    if (error) throw error

    // 2. Verifica se SOBROU alguma reserva para esse mesmo presente
    const { data: outras } = await supabase
      .from('reservas')
      .select('id')
      .eq('presente_id', idPresente)

    // 3. Se NÃO tiver mais ninguém (array vazio ou nulo), libera o item na tabela 'presentes'
    if (!outras || outras.length === 0) {
      console.log('Liberando presente ID:', idPresente) // Debug
      
      const { error: erroUpdate } = await supabase
        .from('presentes')
        .update({ reservado: false }) // Força status para Falso
        .eq('id', idPresente)
        
      if (erroUpdate) throw erroUpdate
    }

    alert('Reserva cancelada com sucesso!')
    
    // 4. Atualiza TODAS as telas
    carregarReservas()       
    carregarPresentesAdmin() 
    carregarDashboard()      

  } catch (error) {
    console.error(error)
    alert('Erro ao cancelar: ' + error.message)
  }
}

// --- 7. MENSAGENS (COM TRATAMENTO DE ERRO) ---
async function carregarMensagens() {
  try {
    const { data } = await supabase
      .from('mensagens')
      .select('*, usuarios(nome)')
      .order('created_at', { ascending: false })

    const div = document.getElementById('lista-mensagens')
    if (!data || data.length === 0) { 
      div.innerHTML = '<p>Nenhum recado deixado ainda.</p>'
      return 
    }

    div.innerHTML = data.map(m => `
      <div class="card-mensagem">
        <span class="msg-autor">${m.usuarios ? m.usuarios.nome : 'Anônimo'}</span>
        <p class="msg-texto">"${m.mensagem}"</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="msg-data">${new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
          <button class="btn-reset" style="background:#ff4444; color:white;" onclick="deletarMensagem('${m.id}')">🗑</button>
        </div>
      </div>
    `).join('')
  } catch (error) { 
    console.error('Erro ao carregar mensagens:', error) 
  }
}

async function deletarMensagem(id) {
  if(!confirm('Excluir esta mensagem permanentemente?')) return
  
  try {
    const { error } = await supabase.from('mensagens').delete().eq('id', id)
    if (error) throw error
    
    carregarMensagens()
  } catch (error) {
    console.error(error)
    alert('Erro ao excluir mensagem. Verifique se você rodou o código SQL no Supabase para liberar exclusões.')
  }
}