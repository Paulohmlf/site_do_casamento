// ========================================
// LÓGICA DO PAINEL ADMIN
// ========================================

document.addEventListener('DOMContentLoaded', verificarPermissaoAdmin)

let listaGlobalConvidados = []

// --- 1. SEGURANÇA E INICIALIZAÇÃO ---
async function verificarPermissaoAdmin() {
  console.log('🔒 Iniciando verificação de segurança...')
  
  const usuarioLocal = verificarLogin()

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
    carregarReservas() // NOVO: Carrega histórico de compras
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

  if (status === 'todos') renderizarTabela(listaGlobalConvidados)
  else renderizarTabela(listaGlobalConvidados.filter(c => c.confirmado === status))
}

async function resetarPresenca(id) {
  if(!confirm('Resetar confirmação para PENDENTE?')) return
  try {
    await supabase.from('convidados').update({ confirmado: null, data_confirmacao: null }).eq('id', id)
    carregarConvidados(); carregarDashboard()
  } catch (error) { alert('Erro: ' + error.message) }
}

// --- 5. GESTÃO DE PRESENTES ---
async function carregarPresentesAdmin() {
  try {
    const { data, error } = await supabase.from('presentes').select('*').order('created_at', { ascending: false })
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
          ${p.reservado ? `<span style="color:green">🔒 Reservado</span>` : `<span style="color:#666">🟢 Disponível</span>`}
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
          <button onclick="editarNome('${p.id}', '${p.nome}')" style="flex: 1; background: #FF9800; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">✏️ Nome</button>
          <button onclick="editarPreco('${p.id}', '${p.valor}')" style="flex: 1; background: #2196F3; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">💲 Preço</button>
        </div>
        <button class="btn-excluir" onclick="deletarPresente('${p.id}')" style="margin-top: 5px;">🗑 Excluir</button>
      </div>
    `).join('')
  } catch (error) { console.error('Erro ao carregar presentes:', error) }
}

function toggleFormPresente() {
  const form = document.getElementById('form-novo-presente')
  form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none'
}

document.getElementById('form-novo-presente')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = e.target.querySelector('button')
  btn.disabled = true; btn.textContent = 'Salvando...'
  
  try {
    const novo = {
      nome: document.getElementById('pres-nome').value,
      categoria: document.getElementById('pres-categoria').value,
      valor: parseFloat(document.getElementById('pres-valor').value),
      imagem_url: document.getElementById('pres-imagem').value,
      reservado: false
    }
    await supabase.from('presentes').insert([novo])
    alert('Presente salvo!'); e.target.reset(); toggleFormPresente()
    carregarPresentesAdmin(); carregarDashboard()
  } catch (err) { alert('Erro: ' + err.message) }
  finally { btn.disabled = false; btn.textContent = 'Salvar Presente' }
})

async function editarPreco(id, valor) {
  const novo = prompt("Novo valor:", valor)
  if (novo && !isNaN(parseFloat(novo.replace(',', '.')))) {
    await supabase.from('presentes').update({ valor: parseFloat(novo.replace(',', '.')) }).eq('id', id)
    alert('Preço atualizado!'); carregarPresentesAdmin()
  }
}

async function editarNome(id, nome) {
  const novo = prompt("Novo nome:", nome)
  if (novo) {
    await supabase.from('presentes').update({ nome: novo.trim() }).eq('id', id)
    alert('Nome atualizado!'); carregarPresentesAdmin()
  }
}

async function deletarPresente(id) {
  if(confirm('Excluir este presente?')) {
    await supabase.from('presentes').delete().eq('id', id)
    carregarPresentesAdmin(); carregarDashboard()
  }
}

// --- 6. GESTÃO DE RESERVAS (NOVO!) ---
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
  if (!confirm('CANCELAR esta reserva? O item poderá voltar a ficar disponível.')) return

  try {
    // 1. Apaga a reserva
    const { error } = await supabase.from('reservas').delete().eq('id', idReserva)
    if (error) throw error

    // 2. Verifica se ainda tem gente comprando esse mesmo item
    const { data: outras } = await supabase.from('reservas').select('id').eq('presente_id', idPresente)

    // 3. Se ninguém mais reservou, libera o item
    if (!outras || outras.length === 0) {
      await supabase.from('presentes').update({ reservado: false }).eq('id', idPresente)
    }

    alert('Reserva cancelada!')
    carregarReservas()
    carregarDashboard()
    carregarPresentesAdmin()

  } catch (error) {
    alert('Erro ao cancelar: ' + error.message)
  }
}

// --- 7. MENSAGENS ---
async function carregarMensagens() {
  try {
    const { data } = await supabase.from('mensagens').select('*, usuarios(nome)').order('created_at', { ascending: false })
    const div = document.getElementById('lista-mensagens')
    if (!data || data.length === 0) { div.innerHTML = '<p>Nenhum recado.</p>'; return }

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
  } catch (error) { console.error('Erro mensagens:', error) }
}

async function deletarMensagem(id) {
  if(confirm('Excluir mensagem?')) {
    await supabase.from('mensagens').delete().eq('id', id)
    carregarMensagens()
  }
}