// ========================================
// LÓGICA DA LISTA DE PRESENTES
// ========================================

let todosPresentes = []

// Carregar presentes ao iniciar
window.addEventListener('DOMContentLoaded', carregarPresentes)

async function carregarPresentes() {
  try {
    const { data, error } = await supabase
      .from('presentes')
      .select('*')
      .order('categoria', { ascending: true })
      .order('valor', { ascending: true })

    if (error) throw error

    todosPresentes = data
    exibirPresentes(data)
  } catch (error) {
    console.error('Erro ao carregar presentes:', error)
    document.getElementById('grid-presentes').innerHTML = 
      '<p class="erro">Erro ao carregar lista de presentes. Tente novamente mais tarde.</p>'
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
    const card = document.createElement('div')
    card.className = `presente-card ${presente.reservado ? 'reservado' : ''}`
    card.innerHTML = `
      <div class="presente-imagem">
        <img src="${presente.imagem_url || 'img/presente-default.jpg'}" 
             alt="${presente.nome}"
             onerror="this.src='img/presente-default.jpg'">
        ${presente.reservado ? '<span class="badge-reservado">✓ Reservado</span>' : ''}
      </div>
      <div class="presente-info">
        <span class="categoria">${presente.categoria}</span>
        <h3>${presente.nome}</h3>
        <p class="descricao">${presente.descricao || 'Sem descrição'}</p>
        <p class="preco">R$ ${presente.valor.toFixed(2)}</p>
        ${!presente.reservado ? `
          <button class="btn btn-primary" onclick="abrirModalReserva('${presente.id}', '${presente.nome}')">
            🎁 Reservar
          </button>
        ` : `
          <p class="reservado-por">Reservado por: ${presente.reservado_por}</p>
        `}
      </div>
    `
    grid.appendChild(card)
  })
}

// Filtro de busca
document.getElementById('busca').addEventListener('input', filtrarPresentes)
document.getElementById('filtro-categoria').addEventListener('change', filtrarPresentes)

function filtrarPresentes() {
  const busca = document.getElementById('busca').value.toLowerCase()
  const categoria = document.getElementById('filtro-categoria').value

  const filtrados = todosPresentes.filter(presente => {
    const matchBusca = presente.nome.toLowerCase().includes(busca) || 
                       (presente.descricao && presente.descricao.toLowerCase().includes(busca))
    const matchCategoria = !categoria || presente.categoria === categoria
    return matchBusca && matchCategoria
  })

  exibirPresentes(filtrados)
}

// Modal de reserva
function abrirModalReserva(id, nome) {
  document.getElementById('presente-id').value = id
  document.getElementById('presente-nome').textContent = nome
  document.getElementById('modal-reserva').style.display = 'flex'
}

document.querySelector('.close').addEventListener('click', function() {
  document.getElementById('modal-reserva').style.display = 'none'
})

// Fechar modal ao clicar fora
window.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-reserva')
  if (e.target === modal) {
    modal.style.display = 'none'
  }
})

// Processar reserva
document.getElementById('form-reserva').addEventListener('submit', async function(e) {
  e.preventDefault()

  const presenteId = document.getElementById('presente-id').value
  const nome = document.getElementById('reserva-nome').value.trim()
  const email = document.getElementById('reserva-email').value.trim()

  if (!validarEmail(email)) {
    mostrarErro('Por favor, insira um e-mail válido.')
    return
  }

  const botao = document.querySelector('#form-reserva button[type="submit"]')
  botao.disabled = true
  botao.textContent = '⏳ Reservando...'

  try {
    const { data, error } = await supabase
      .from('presentes')
      .update({
        reservado: true,
        reservado_por: nome,
        email_reserva: email,
        data_reserva: new Date().toISOString()
      })
      .eq('id', presenteId)

    if (error) throw error

    mostrarSucesso('Presente reservado com sucesso! Muito obrigado! 🎁')
    document.getElementById('modal-reserva').style.display = 'none'
    document.getElementById('form-reserva').reset()
    carregarPresentes() // Recarregar lista

  } catch (error) {
    console.error('Erro ao reservar presente:', error)
    mostrarErro('Erro ao reservar presente. Tente novamente.')
  } finally {
    botao.disabled = false
    botao.textContent = '🎁 Reservar'
  }
})

console.log('✅ Lista de presentes carregada!')
