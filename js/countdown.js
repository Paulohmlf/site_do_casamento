// ========================================
// CONTADOR REGRESSIVO
// Data da festa: 15 de Agosto de 2026, 18h00
// ========================================
const dataCasamento = new Date('2026-08-15T16:00:00').getTime()

function atualizarContador() {
  const agora = new Date().getTime()
  const diferenca = dataCasamento - agora

  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((diferenca % (1000 * 60)) / 1000)

  document.getElementById('dias').textContent = dias
  document.getElementById('horas').textContent = horas
  document.getElementById('minutos').textContent = minutos
  document.getElementById('segundos').textContent = segundos

  if (diferenca < 0) {
    clearInterval(intervalo)
    document.getElementById('countdown').innerHTML = '<p>O grande dia chegou! 🎉</p>'
  }
}

// Atualizar a cada segundo
const intervalo = setInterval(atualizarContador, 1000)
atualizarContador() // Executar imediatamente
