// ========================================
// LÓGICA DA LISTA DE PRESENTES + PIX + WHATSAPP
// ========================================

let todosPresentes = []
let valorPresenteAtual = 0
let nomePresenteAtual = "" // Nova variável para a mensagem do Zap
const chavePix = "349fb66d-27be-4dd1-90ac-a2bc6ac57041"
const telefoneNoivos = "5587992010698" // Seu número
const usuarioLogado = JSON.parse(localStorage.getItem('usuario'))

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

// === MODAL E LÓGICA DE PAGAMENTO ===

function abrirModalReserva(id, nomePresente, valor) {
  document.getElementById('presente-id').value = id
  document.getElementById('presente-nome').textContent = nomePresente
  document.getElementById('presente-valor-texto').textContent = `Valor: R$ ${valor.toFixed(2)}`
  document.getElementById('nome-comprador-modal').textContent = usuarioLogado.nome
  
  valorPresenteAtual = valor
  nomePresenteAtual = nomePresente // Salva para usar no WhatsApp

  // Reseta visual do botão de copiar (caso tenha ficado "Copiado!")
  const btnCopiar = document.getElementById('btn-copiar')
  if(btnCopiar) btnCopiar.textContent = '📑 Copiar Código'

  document.getElementById('fase-confirmacao').style.display = 'block'
  document.getElementById('fase-pix').style.display = 'none'
  document.getElementById('modal-reserva').style.display = 'flex'
}

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal-reserva').style.display = 'none'
})

document.getElementById('form-reserva').addEventListener('submit', async function(e) {
  e.preventDefault()

  const presenteId = document.getElementById('presente-id').value
  const botao = document.querySelector('#form-reserva button[type="submit"]')
  
  botao.disabled = true
  botao.textContent = '⏳ Registrando...'

  try {
    const { error: erroReserva } = await supabase.from('reservas').insert([{
        presente_id: presenteId,
        nome_comprador: usuarioLogado.nome,
        email_comprador: usuarioLogado.email
      }])

    if (erroReserva) throw erroReserva

    await supabase.from('presentes').update({ reservado: true }).eq('id', presenteId)

    // Gerar PIX
    const codigoPix = gerarPayloadPix(chavePix, valorPresenteAtual, "Paulo e Ledja", "Casamento")
    
    document.getElementById('texto-pix').value = codigoPix
    document.getElementById('img-qrcode').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(codigoPix)}`
    
    const btnBanco = document.getElementById('btn-ir-banco')
    if(btnBanco) btnBanco.href = "pix:" + codigoPix

    document.getElementById('fase-confirmacao').style.display = 'none'
    document.getElementById('fase-pix').style.display = 'block'

  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao reservar. Tente novamente.')
    botao.disabled = false
    botao.textContent = 'Confirmar e Ver PIX 🎁'
  }
})

// --- NOVA FUNÇÃO: Feedback Visual de Cópia ---
function copiarPix() {
  const texto = document.getElementById('texto-pix')
  texto.select()
  document.execCommand('copy') 
  
  // Muda o texto do botão para dar feedback
  const btn = document.getElementById('btn-copiar')
  btn.textContent = 'Copiado! ✅'
  btn.style.backgroundColor = '#4caf50' // Verde temporário
  btn.style.color = 'white'

  // Volta ao normal depois de 2 segundos
  setTimeout(() => {
    btn.textContent = '📑 Copiar Código'
    btn.style.backgroundColor = '' // Volta ao padrão (secondary/branco)
    btn.style.color = ''
  }, 2000)
}

// --- NOVA FUNÇÃO: Enviar Comprovante no WhatsApp ---
function enviarComprovante() {
  const mensagem = `Oi! Acabei de reservar o presente *${nomePresenteAtual}* (R$ ${valorPresenteAtual.toFixed(2)}) e aqui está o comprovante.`
  const urlWhatsapp = `https://wa.me/${telefoneNoivos}?text=${encodeURIComponent(mensagem)}`
  
  // Abre o WhatsApp em nova aba
  window.open(urlWhatsapp, '_blank')
  
  // Fecha o modal e atualiza a lista
  fecharEAtualizar()
}

function fecharEAtualizar() {
  document.getElementById('modal-reserva').style.display = 'none'
  carregarPresentes() 
  document.querySelector('#form-reserva button[type="submit"]').disabled = false
  document.querySelector('#form-reserva button[type="submit"]').textContent = 'Confirmar e Ver PIX 🎁'
}

// Gerador PIX (BR Code)
function gerarPayloadPix(chave, valor, beneficiario = '', cidade = 'BRASIL') {
  const formatarCampo = (id, valor) => {
    const len = valor.length.toString().padStart(2, '0')
    return `${id}${len}${valor}`
  }
  const valorString = valor.toFixed(2)
  let payload = 
    formatarCampo('00', '01') +
    formatarCampo('26',
      formatarCampo('00', 'br.gov.bcb.pix') + 
      formatarCampo('01', chave)
    ) +
    formatarCampo('52', '0000') +
    formatarCampo('53', '986') +
    formatarCampo('54', valorString) +
    formatarCampo('58', 'BR') +
    formatarCampo('59', beneficiario || 'NOME') +
    formatarCampo('60', cidade || 'CIDADE') +
    formatarCampo('62', formatarCampo('05', '***')) + 
    '6304';
  const crc = calcularCRC16(payload)
  return payload + crc
}

function calcularCRC16(payload) {
  let crc = 0xFFFF
  const polynomial = 0x1021
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ polynomial
      else crc = crc << 1
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}