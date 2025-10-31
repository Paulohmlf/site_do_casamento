// ========================================
// LÓGICA DO RSVP POR FAMÍLIA
// ========================================

// Verificar se usuário está logado ao carregar página
let usuarioLogado = verificarLogin()
if (usuarioLogado) {
  document.getElementById('nome-usuario').textContent = usuarioLogado.nome
}

let familiaAtual = null
let membrosEncontrados = []

// Buscar família pelo nome
document.getElementById('btn-buscar').addEventListener('click', async function() {
  const nomeBuscado = document.getElementById('buscar-nome').value.trim()

  if (!nomeBuscado) {
    mostrarErro('Por favor, digite um nome para buscar.')
    return
  }

  const botao = this
  botao.disabled = true
  botao.textContent = '⏳ Buscando...'

  try {
    // Buscar convidado pelo nome
    const { data: convidado, error } = await supabase
      .from('convidados')
      .select('*, familias(nome_familia)')
      .ilike('nome', `%${nomeBuscado}%`)
      .single()

    if (error || !convidado) {
      mostrarErro('Nome não encontrado na lista de convidados. Verifique a digitação.')
      botao.disabled = false
      botao.textContent = 'Buscar'
      return
    }

    // Buscar todos os membros da mesma família
    const { data: membros, error: erroMembros } = await supabase
      .from('convidados')
      .select('*')
      .eq('familia_id', convidado.familia_id)
      .order('nome')

    if (erroMembros) throw erroMembros

    familiaAtual = convidado.familia_id
    membrosEncontrados = membros
    
    exibirMembros(membros, convidado.familias.nome_familia)

  } catch (error) {
    console.error('Erro ao buscar família:', error)
    mostrarErro('Erro ao buscar família. Tente novamente.')
  } finally {
    botao.disabled = false
    botao.textContent = 'Buscar'
  }
})

// Exibir membros da família
function exibirMembros(membros, nomeFamilia) {
  document.getElementById('nome-familia').textContent = nomeFamilia
  
  const listaMembros = document.getElementById('lista-membros')
  listaMembros.innerHTML = ''

  membros.forEach(membro => {
    const membroDiv = document.createElement('div')
    membroDiv.className = 'membro-item'
    membroDiv.innerHTML = `
      <span class="membro-nome">${membro.nome}</span>
      <div class="membro-confirmacao">
        <label class="radio-label">
          <input type="radio" name="membro-${membro.id}" value="true" 
                 ${membro.confirmado === true ? 'checked' : ''}>
          <span class="radio-custom sim">✅ Sim</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="membro-${membro.id}" value="false"
                 ${membro.confirmado === false ? 'checked' : ''}>
          <span class="radio-custom nao">❌ Não</span>
        </label>
      </div>
    `
    listaMembros.appendChild(membroDiv)
  })

  // Mostrar seções ocultas
  document.getElementById('membros-familia').style.display = 'block'
  document.getElementById('grupo-mensagem').style.display = 'block'
  document.getElementById('botoes-confirmacao').style.display = 'flex'
}

// Processar confirmação
document.getElementById('form-rsvp').addEventListener('submit', async function(e) {
  e.preventDefault()

  if (!familiaAtual || membrosEncontrados.length === 0) {
    mostrarErro('Por favor, busque uma família primeiro.')
    return
  }

  const botao = document.querySelector('button[type="submit"]')
  botao.disabled = true
  botao.textContent = '⏳ Confirmando...'

  try {
    // Coletar confirmações de cada membro
    const atualizacoes = []

    for (const membro of membrosEncontrados) {
      const radioSelecionado = document.querySelector(`input[name="membro-${membro.id}"]:checked`)
      
      if (radioSelecionado) {
        const confirmado = radioSelecionado.value === 'true'
        
        atualizacoes.push(
          supabase
            .from('convidados')
            .update({
              confirmado: confirmado,
              confirmado_por: usuarioLogado.id,
              data_confirmacao: new Date().toISOString()
            })
            .eq('id', membro.id)
        )
      }
    }

    // Executar todas as atualizações
    await Promise.all(atualizacoes)

    // Salvar mensagem (se houver)
    const mensagem = document.getElementById('mensagem').value.trim()
    if (mensagem) {
      await supabase
        .from('mensagens')
        .insert([{
          familia_id: familiaAtual,
          usuario_id: usuarioLogado.id,
          mensagem: mensagem
        }])
    }

    mostrarSucesso('Confirmações registradas com sucesso! 🎉')

    setTimeout(() => {
      window.location.href = 'index.html'
    }, 2000)

  } catch (error) {
    console.error('Erro ao confirmar presença:', error)
    mostrarErro('Erro ao confirmar presença. Tente novamente.')
  } finally {
    botao.disabled = false
    botao.textContent = 'Confirmar Presença'
  }
})

console.log('✅ RSVP por família carregado!')
