// ========================================
// LÓGICA DA LISTA DE PRESENTES + PIX
// ========================================

let todosPresentes = []
let valorPresenteAtual = 0 // Variável para guardar o preço do item selecionado
const chavePix = "349fb66d-27be-4dd1-90ac-a2bc6ac57041" // Sua chave
const usuarioLogado = JSON.parse(localStorage.getItem('usuario'))

// Carregar presentes ao iniciar
window.addEventListener('DOMContentLoaded', () => {
  if (!usuarioLogado) {
    window.location.href = 'login.html'
    return
  }
  carregarPresentes()
})

async function carregarPresentes() {
  try {
    const { data, error } = await supabase
      .from('presentes')
      .select('*')
      .order('reservado', { ascending: true })
      .order('valor', { ascending: true })

    if (error) throw error

    todosPresentes = data
    exibirPresentes(data)
  } catch (error) {
    console.error('Erro:', error)
    document.getElementById('grid-presentes').innerHTML = '<p class="erro">Erro ao carregar lista.</p>'
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
        <p class="descricao">${presente.descricao || 'Item disponível'}</p>
        <p class="preco">R$ ${presente.valor.toFixed(2)}</p>
        <button class="btn btn-primary" onclick="abrirModalReserva('${presente.id}', '${presente.nome}', ${presente.valor})">
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

// === MODAL E PIX ===

function abrirModalReserva(id, nomePresente, valor) {
  document.getElementById('presente-id').value = id
  document.getElementById('presente-nome').textContent = nomePresente
  document.getElementById('presente-valor-texto').textContent = `Valor: R$ ${valor.toFixed(2)}`
  document.getElementById('nome-comprador-modal').textContent = usuarioLogado.nome
  
  valorPresenteAtual = valor // Salva o valor na variável global

  // Reseta o modal para a fase 1
  document.getElementById('fase-confirmacao').style.display = 'block'
  document.getElementById('fase-pix').style.display = 'none'
  document.getElementById('modal-reserva').style.display = 'flex'
}

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal-reserva').style.display = 'none'
})

// Processar Reserva
document.getElementById('form-reserva').addEventListener('submit', async function(e) {
  e.preventDefault()

  const presenteId = document.getElementById('presente-id').value
  const botao = document.querySelector('#form-reserva button[type="submit"]')
  
  botao.disabled = true
  botao.textContent = '⏳ Registrando...'

  try {
    // 1. Salvar no banco
    const { error: erroReserva } = await supabase.from('reservas').insert([{
        presente_id: presenteId,
        nome_comprador: usuarioLogado.nome,
        email_comprador: usuarioLogado.email
      }])

    if (erroReserva) throw erroReserva

    await supabase.from('presentes').update({ reservado: true }).eq('id', presenteId)

    // 2. Gerar PIX
    const codigoPix = gerarPayloadPix(chavePix, valorPresenteAtual, "Paulo e Ledja", "Casamento")
    
    // 3. Atualizar tela do PIX
    document.getElementById('texto-pix').value = codigoPix
    // Usa API do qrserver para gerar a imagem
    document.getElementById('img-qrcode').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(codigoPix)}`
    
    // ATUALIZAÇÃO: Link para o botão "Abrir App do Banco"
    const btnBanco = document.getElementById('btn-ir-banco')
    if(btnBanco) {
        btnBanco.href = "pix:" + codigoPix
    }

    // 4. Trocar de tela (Esconde confirmação, Mostra PIX)
    document.getElementById('fase-confirmacao').style.display = 'none'
    document.getElementById('fase-pix').style.display = 'block'

  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao reservar. Tente novamente.')
    botao.disabled = false
    botao.textContent = 'Confirmar e Ver PIX 🎁'
  }
})

// Funções Auxiliares do Modal
function copiarPix() {
  const texto = document.getElementById('texto-pix')
  texto.select()
  document.execCommand('copy') // Método antigo mas compatível
  alert('Código PIX copiado! Abra o app do seu banco e escolha "PIX Copia e Cola".')
}

function fecharEAtualizar() {
  document.getElementById('modal-reserva').style.display = 'none'
  carregarPresentes() // Atualiza a lista no fundo
  // Opcional: Resetar botão
  document.querySelector('#form-reserva button[type="submit"]').disabled = false
  document.querySelector('#form-reserva button[type="submit"]').textContent = 'Confirmar e Ver PIX 🎁'
}

// =========================================================
// GERADOR DE PAYLOAD PIX (BR CODE - EMVCo)
// =========================================================
function gerarPayloadPix(chave, valor, beneficiario = '', cidade = 'BRASIL') {
  const formatarCampo = (id, valor) => {
    const len = valor.length.toString().padStart(2, '0')
    return `${id}${len}${valor}`
  }

  const valorString = valor.toFixed(2)
  
  // Montagem do Payload
  let payload = 
    formatarCampo('00', '01') +                           // Payload Format Indicator
    formatarCampo('26',                                   // Merchant Account Information
      formatarCampo('00', 'br.gov.bcb.pix') + 
      formatarCampo('01', chave)
    ) +
    formatarCampo('52', '0000') +                         // Merchant Category Code
    formatarCampo('53', '986') +                          // Transaction Currency (BRL)
    formatarCampo('54', valorString) +                    // Transaction Amount
    formatarCampo('58', 'BR') +                           // Country Code
    formatarCampo('59', beneficiario || 'NOME') +         // Merchant Name
    formatarCampo('60', cidade || 'CIDADE') +             // Merchant City
    formatarCampo('62',                                   // Additional Data Field Template
      formatarCampo('05', '***')                          // Reference Label
    ) + 
    '6304';                                               // CRC16 ID + Length

  // Calcular CRC16
  const crc = calcularCRC16(payload)
  return payload + crc
}

function calcularCRC16(payload) {
  let crc = 0xFFFF
  const polynomial = 0x1021

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial
      } else {
        crc = crc << 1
      }
    }
  }
  
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}