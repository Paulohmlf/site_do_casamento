// ========================================
// LÓGICA DA LISTA DE PRESENTES (MÚLTIPLAS RESERVAS)
// ========================================

let todosPresentes = []

window.addEventListener('DOMContentLoaded', carregarPresentes)

async function carregarPresentes() {
  try {
    const { data, error } = await supabase
      .from('presentes')
      .select('*')
      // 1. ORDEM: Primeiro os NÃO reservados (false), depois os reservados (true)
      .order('reservado', { ascending: true })
      // 2. ORDEM: Dentro dos grupos, ordenar por preço
      .order('valor', { ascending: true })

    if (error) throw error

    todosPresentes = data
    exibirPresentes(data)
  } catch (error) {
    console.error('Erro:', error)
    document.getElementById('grid-presentes').innerHTML = 
      '<p class="erro">Erro ao carregar lista.</p>'
  }
}

function exibirPresentes(presentes) {
  const grid = document.getElementById('grid-presentes')
  grid.innerHTML = ''

  if (presentes.length === 0) {
    grid.innerHTML = '<p class="vazio">Nenhum presente encontrado.</p>'
    return
  }

  presentes.forEach(presente => {
    // Definir textos e estilos baseado se já teve alguma reserva
    const classeCss = presente.reservado ? 'presente-card reservado' : 'presente-card'
    const textoBotao = presente.reservado ? '🎁 Presentear Também' : '🎁 Reservar'
    const badge = presente.reservado ? '<span class="badge-reservado">Já ganhou 1+</span>' : ''

    const card = document.createElement('div')
    card.className = classeCss
    card.innerHTML = `
      <div class="presente-imagem">
        <img src="${presente.imagem_url || 'img/presente-default.jpg'}" onerror="this.src='img/presente-default.jpg'">
        ${badge}
      </div>
      <div class="presente-info">
        <span class="categoria">${presente.categoria}</span>
        <h3>${presente.nome}</h3>
        <p class="descricao">${presente.descricao || 'Item disponível para compra múltipla'}</p>
        <p class="preco">R$ ${presente.valor.toFixed(2)}</p>
        
        <button class="btn btn-primary" onclick="abrirModalReserva('${presente.id}', '${presente.nome}')">
          ${textoBotao}
        </button>
      </div>
    `
    grid.appendChild(card)
  })
}

// Filtros
document.getElementById('busca').addEventListener('input', filtrarPresentes)
document.getElementById('filtro-categoria').addEventListener('change', filtrarPresentes)

function filtrarPresentes() {
  const busca = document.getElementById('busca').value.toLowerCase()
  const categoria = document.getElementById('filtro-categoria').value

  const filtrados = todosPresentes.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca)
    const matchCategoria = !categoria || p.categoria === categoria
    return matchBusca && matchCategoria
  })
  exibirPresentes(filtrados)
}

// Modal
function abrirModalReserva(id, nome) {
  document.getElementById('presente-id').value = id
  document.getElementById('presente-nome').textContent = nome
  document.getElementById('modal-reserva').style.display = 'flex'
}

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal-reserva').style.display = 'none'
})

window.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-reserva')) {
    document.getElementById('modal-reserva').style.display = 'none'
  }
})

// === NOVA LÓGICA DE RESERVA ===
document.getElementById('form-reserva').addEventListener('submit', async function(e) {
  e.preventDefault()

  const presenteId = document.getElementById('presente-id').value
  const nome = document.getElementById('reserva-nome').value.trim()
  const email = document.getElementById('reserva-email').value.trim()

  const botao = document.querySelector('#form-reserva button[type="submit"]')
  botao.disabled = true
  botao.textContent = '⏳ Processando...'

  try {
    // 1. Salvar na nova tabela de RESERVAS (quem comprou)
    const { error: erroReserva } = await supabase
      .from('reservas')
      .insert([{
        presente_id: presenteId,
        nome_comprador: nome,
        email_comprador: email
      }])

    if (erroReserva) throw erroReserva

    // 2. Atualizar o item para "reservado = true" (para ficar cinza/embaixo)
    // OBS: Não sobrescrevemos mais o nome aqui, pois usamos a tabela de reservas
    await supabase
      .from('presentes')
      .update({ reservado: true }) 
      .eq('id', presenteId)

    alert('Maravilha! Seu presente foi registrado com sucesso! 🎉')
    
    document.getElementById('modal-reserva').style.display = 'none'
    document.getElementById('form-reserva').reset()
    carregarPresentes() // Recarrega a lista para atualizar a ordem

  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao reservar. Tente novamente.')
  } finally {
    botao.disabled = false
    botao.textContent = 'Confirmar Reserva'
  }
})