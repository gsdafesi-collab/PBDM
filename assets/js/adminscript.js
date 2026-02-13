let dadosGerais = [];
let USUARIOS = []; 
const STORAGE_KEY = "MIL-DISPMED-2026-CSV";
const hojeGlobal = new Date();
hojeGlobal.setHours(0,0,0,0);

// 1. Inicialização com Correção de Cache/JSON
window.onload = async () => {
    try {
        // Carrega Configurações e Usuários
        const [resConf, resUser] = await Promise.all([
            fetch('config.json'),
            fetch('usuarios.json')
        ]);
        
        const config = await resConf.json();
        const dataUsers = await resUser.json();
        
        USUARIOS = dataUsers.usuarios;
        window.CONFIG_SISTEMA = config;

        // Recupera a sessão e trata o erro de formato antigo (Token 'A')
        const sessaoSalva = localStorage.getItem(STORAGE_KEY);
        if (sessaoSalva) {
            try {
                // Se não for um JSON válido (começando com {), isso vai para o catch
                const auth = JSON.parse(sessaoSalva);
                if (auth && auth.user && auth.pass) {
                    if(document.getElementById('usuarioMaster')) document.getElementById('usuarioMaster').value = auth.user;
                    if(document.getElementById('senhaMaster')) document.getElementById('senhaMaster').value = auth.pass;
                    acessarDados(true);
                }
            } catch (err) {
                // CORREÇÃO: Limpa o dado antigo que está travando o sistema
                console.warn("Limpando credenciais antigas incompatíveis.");
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (e) {
        console.error("Erro ao carregar arquivos JSON:", e);
    }
};

// 2. Acesso aos Dados
async function acessarDados(isAuto = false) {
    const userInput = document.getElementById('usuarioMaster').value;
    const senhaInput = document.getElementById('senhaMaster').value;
    const btn = document.getElementById('btnEntrar');
    
    if(!userInput || !senhaInput) return;

    // Validação contra o usuarios.json
    const usuarioValido = USUARIOS.find(u => u.user === userInput && u.pass === senhaInput);

    if (!usuarioValido) {
        alert("Usuário ou Senha Incorretos!");
        localStorage.removeItem(STORAGE_KEY);
        return;
    }

    try {
        if(!isAuto) btn.innerText = "SINCRONIZANDO...";

        const config = window.CONFIG_SISTEMA;
        const response = await fetch(`${config.url_csv_publico}&cb=${new Date().getTime()}`);
        const csvText = await response.text();
        
        const linhas = csvText.split(/\r?\n/).slice(1);
        dadosGerais = linhas.map(linha => {
            const p = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            return {
                carimbo: p[0], turma: p[1], nome_de_guerra: p[2],
                inicio_da_dispensa: p[5], quantos_dias: p[6],       
                tipo_de_dispensa: p[7], motivo: p[8], link_pdf: p[9]            
            };
        }).filter(d => d.nome_de_guerra);

        // Salva corretamente como JSON para evitar novos erros
        localStorage.setItem(STORAGE_KEY, JSON.stringify({user: userInput, pass: senhaInput}));
        
        document.getElementById('sessaoLogin').style.display = 'none';
        document.getElementById('sessaoPainel').style.display = 'block';
        
        popularTurmas();
        filtrar();

    } catch (err) {
        alert("⚠️ Erro ao conectar com a planilha pública.");
    } finally {
        btn.innerText = "ACESSAR DADOS";
    }
}

// 3. Funções de Filtro e Tabela (Mantidas originais)
function filtrar() {
    const termo = document.getElementById('inputBusca').value.toLowerCase();
    const turmaSel = document.getElementById('filtroTurma').value;
    let cNovas = 0;
    let setAfastados = new Set();
    const hojeStr = hojeGlobal.toISOString().split('T')[0]; 

    const filtrados = dadosGerais.filter(d => {
        const nome = (d.nome_de_guerra || "").toLowerCase();
        const dataInicio = d.inicio_da_dispensa || "";
        const dias = parseInt(d.quantos_dias) || 0;

        if(dataInicio) {
            const dObj = new Date(dataInicio + "T00:00:00");
            const dFim = new Date(dObj);
            dFim.setDate(dFim.getDate() + dias);
            if (hojeGlobal >= dObj && hojeGlobal < dFim) setAfastados.add(d.nome_de_guerra);
            if (dataInicio === hojeStr) cNovas++;
        }
        return (nome.includes(termo) || (d.turma || "").toLowerCase().includes(termo)) && (!turmaSel || d.turma === turmaSel);
    });

    document.getElementById('cont-afastados').innerText = setAfastados.size;
    document.getElementById('cont-hoje').innerText = cNovas;
    renderizarTabela(filtrados);
}

function renderizarTabela(lista) {
    const corpo = document.getElementById('corpoTabela');
    lista.sort((a,b) => new Date(b.inicio_da_dispensa) - new Date(a.inicio_da_dispensa));
    corpo.innerHTML = lista.map(item => `
        <tr>
            <td><span class="turma-tag">${item.turma || '--'}</span></td>
            <td><a class="link-nome" onclick="verPerfilMilitar('${item.nome_de_guerra.replace(/'/g, "\\'")}')"><b>${item.nome_de_guerra}</b></a></td>
            <td>${item.inicio_da_dispensa ? item.inicio_da_dispensa.split('-').reverse().join('/') : '--'}</td>
            <td><span class="badge-dias">${item.quantos_dias || 0}d</span></td>
            <td><small>${item.tipo_de_dispensa || '--'}</small></td>
            <td>${item.motivo || '--'}</td> 
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="botao" style="background:#f1f5f9; color:#475569; padding:5px 10px; border: 1px solid #ccc; font-size: 11px;" onclick="gerarQR('${item.link_pdf}')">QR</button>
                    <a href="${item.link_pdf}" target="_blank" class="botao-azul" style="padding:5px 10px; text-decoration:none; display: flex; align-items: center; justify-content: center; width: 35px; border-radius: 6px;">📄</a>
                </div>
            </td>
        </tr>`).join('');
}

function popularTurmas() {
    const sel = document.getElementById('filtroTurma');
    const turmas = [...new Set(dadosGerais.map(d => d.turma).filter(t => t))].sort();
    sel.innerHTML = '<option value="">🎖️ Turmas</option>' + turmas.map(t => `<option value="${t}">${t}</option>`).join('');
}

// 4. Modais e Extras
function abrirModal(titulo, conteudo) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalCorpo').innerHTML = conteudo;
    document.getElementById('modalGenerico').classList.add('ativo');
}

function fecharModal() { document.getElementById('modalGenerico').classList.remove('ativo'); }

function logout() {
    // Conteúdo do modal de confirmação
    const conteudo = `
        <div style="text-align:center; padding: 10px 0;">
            <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">Deseja realmente encerrar sua sessão administrativa?</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="confirmarLogout()" class="botao botao-azul" style="width: 120px; justify-content: center; height: 45px;">SIM</button>
                <button onclick="fecharModal()" class="botao" style="width: 120px; justify-content: center; background: #e2e8f0; color: #475569; height: 45px;">CANCELAR</button>
            </div>
        </div>
    `;
    
    // Abre o modal
    abrirModal("Sair do Sistema", conteudo);
    
    // REMOVE O BOTÃO VERMELHO: Seleciona o botão de fechar dentro do modal e o esconde
    const btnFecharPadrao = document.querySelector('#modalGenerico .botao-vermelho');
    if (btnFecharPadrao) {
        btnFecharPadrao.style.display = 'none';
    }
}

// Garante que o botão vermelho volte a aparecer quando o modal for fechado
function fecharModal() {
    document.getElementById('modalGenerico').classList.remove('ativo');
    // Restaura a visibilidade do botão vermelho para outros modais (como o de QR Code)
    const btnFecharPadrao = document.querySelector('#modalGenerico .botao-vermelho');
    if (btnFecharPadrao) {
        btnFecharPadrao.style.display = 'block';
    }
}

function confirmarLogout() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}