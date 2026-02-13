/**
 * SISTEMA DE DISPENSA MILITAR - FRONTEND PRO (ADAPTADO PARA PHP)
 * Versão: Bloqueio de Datas Futuras e Correção de Fuso
 */

let CONFIG = {};
const { jsPDF } = window.jspdf;

// 1. Confirmação de saída
window.onbeforeunload = function() {
    const nome = document.getElementById('nome').value;
    const saram = document.getElementById('saram').value;
    if (nome.length > 2 || saram.length > 4) {
        return "Existem alterações não enviadas. Deseja realmente sair?";
    }
};

// 2. Inicialização e Configuração
async function init() {
    try {
        const res = await fetch('config.json');
        if (!res.ok) throw new Error("Falha ao carregar config.json");
        CONFIG = await res.json();
        
        document.getElementById('titulo_sistema').innerText = CONFIG.titulo;
        
        // --- TRAVA DE SEGURANÇA DE DATA ---
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hojeLocal = `${ano}-${mes}-${dia}`;
        
        const campoData = document.getElementById('dataInicio');
        campoData.setAttribute('max', hojeLocal);

    } catch (e) { 
        document.getElementById('titulo_sistema').innerText = "Erro de Conexão"; 
        console.error("Erro no init:", e);
    }
}
init();

// 3. Gerenciamento de Datas e Cálculos (MANTIDO ORIGINAL)
const inputData = document.getElementById('dataInicio');
const inputDias = document.getElementById('dias');
const inputTipo = document.getElementById('tipo');

function calcDatas() {
    const valData = inputData.value;
    const valDias = inputDias.value;
    const valTipo = inputTipo.value;
    
    const txtTermino = document.getElementById('txtTermino');
    const txtApresentacao = document.getElementById('txtApresentacao');
    const txtObs = document.getElementById('txtObs');
    const infoDatas = document.getElementById('infoDatas');
    const alertaTipoPosicao = document.getElementById('alertaTipoPosicao');
    const alertaTipoteste = document.getElementById('alertaTipoteste');

    if (valData && valDias && CONFIG.mensagens) {
        let dt = new Date(valData + "T00:00:00");
        let dias = parseInt(valDias);
        
        if (isNaN(dias) || dias < 1) return;

        let dtTermino = new Date(dt);
        dtTermino.setDate(dt.getDate() + (dias - 1));
        if(txtTermino) txtTermino.innerText = dtTermino.toLocaleDateString('pt-BR');

        if (valTipo === 'Total') {
            if(txtObs) txtObs.innerHTML = `<span style="color:#856404">Ver orientação abaixo</span>`;
            
            if(alertaTipoteste) {
                alertaTipoteste.innerHTML = `
                <div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; border: 1px solid #ffeeba; margin-top: 10px; font-family: sans-serif; text-align: left;">
                    <b style="color: #d9534f; font-size: 1.1em; display: block; margin-bottom: 4px;">Apresente na seção hoje!</b>
                    <span style="font-size: 0.9em;">${CONFIG.mensagens.alerta_total_topo || 'Apresente-se ao Comandante.'}</span>
                </div>`;
            }
        } else {
            if(alertaTipoteste) alertaTipoteste.innerHTML = "";
            
            let dtApres = new Date(dtTermino);
            dtApres.setDate(dtTermino.getDate() + 1);
            if(txtObs) {
                txtObs.innerHTML = `<span style="color: #28a745; font-weight: bold;">${dtApres.toLocaleDateString('pt-BR')}</span>`;
            }
        }
        
        if (valTipo === 'Parcial') {
            if(txtApresentacao) txtApresentacao.innerHTML = `<span style="color:#856404">Ver orientação abaixo</span>`;
            
            if(alertaTipoPosicao) {
                alertaTipoPosicao.innerHTML = `
                <div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; border: 1px solid #ffeeba; margin-top: 10px; font-family: sans-serif; text-align: left;">
                    <b style="color: #d9534f; font-size: 1.1em; display: block; margin-bottom: 4px;">Apresente na seção hoje!</b>
                    <span style="font-size: 0.9em;">${CONFIG.mensagens.alerta_parcial_topo || 'Apresente-se ao Comandante.'}</span>
                </div>`;
            }
        } else {
            if(alertaTipoPosicao) alertaTipoPosicao.innerHTML = "";
            
            let dtApres = new Date(dtTermino);
            dtApres.setDate(dtTermino.getDate() + 1);
            if(txtApresentacao) {
                txtApresentacao.innerHTML = `<span style="color: #28a745; font-weight: bold;">${dtApres.toLocaleDateString('pt-BR')}</span>`;
            }
        }
        
        if(infoDatas) infoDatas.style.display = 'block';
    }
}

inputData.addEventListener('change', calcDatas);
inputDias.addEventListener('input', calcDatas);
inputTipo.addEventListener('change', calcDatas);

// 4. Preview e Formatação
document.getElementById('nome').oninput = function() { this.value = this.value.toUpperCase(); };

document.getElementById('fileInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Aumentado para 5MB conforme config.json
    if (file.size > 5 * 1024 * 1024) { 
        exibirNotificacao(CONFIG.mensagens ? CONFIG.mensagens.erro_tamanho : "Arquivo muito grande!", "#d9534f");
        e.target.value = "";
        return;
    }

    const previewContainer = document.getElementById('previewContainer');
    const imgPreview = document.getElementById('imgPreview');
    const fileName = document.getElementById('fileName');
    
    previewContainer.style.display = 'block';
    fileName.innerText = file.name;
    
    if (file.type.startsWith('image/')) {
        imgPreview.src = URL.createObjectURL(file);
        imgPreview.style.display = 'inline-block';
    } else {
        imgPreview.style.display = 'none';
    }
};

// 5. Funções de Suporte (PDF e Notificação)
async function processFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject("Erro ao ler arquivo.");
        reader.onload = (e) => {
            if (file.type === "application/pdf") {
                // Envia o DataURL completo para o PHP salvar como string no banco
                resolve(e.target.result); 
            } else {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const w = img.width, h = img.height;
                    const pdf = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] });
                    pdf.addImage(img, 'JPEG', 0, 0, w, h);
                    resolve(pdf.output('datauristring')); // Retorna a string Base64 completa
                };
            }
        };
        reader.readAsDataURL(file);
    });
}

function exibirNotificacao(msg, cor = "#28a745") {
    const alertaDiv = document.createElement('div');
    alertaDiv.style = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: ${cor}; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10000; font-family: sans-serif; font-weight: bold; text-align: center; animation: slideDown 0.5s ease-out;`;
    alertaDiv.innerHTML = `${msg} <style>@keyframes slideDown { from { top: -100px; opacity: 0; } to { top: 20px; opacity: 1; } }</style>`;
    document.body.appendChild(alertaDiv);
    setTimeout(() => alertaDiv.remove(), 4000);
}

// 6. Submissão do Formulário (ADAPTADO PARA PHP)
document.getElementById('formMilitar').onsubmit = async (e) => {
    e.preventDefault();
    
    const dataSelecionada = new Date(inputData.value + "T00:00:00");
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    if (dataSelecionada > hoje) {
        return exibirNotificacao("Você não pode publicar uma dispensa com data futura!", "#d9534f");
    }

    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) return exibirNotificacao("Por favor, anexe a dispensa médica!", "#d9534f");

    const motivo = document.getElementById('motivo').value.trim();
    if (motivo.length < 5) return exibirNotificacao("Descreva o motivo da dispensa.", "#d9534f");

    const btn = document.getElementById('btn');
    const statusTxt = document.getElementById('status');
    const containerBarra = document.getElementById('container-barra'); 
    const preenchimentoBarra = document.getElementById('preenchimento-barra'); 

    btn.disabled = true; 
    btn.innerText = "⏳ ENVIANDO...";
    containerBarra.style.display = 'block';
    preenchimentoBarra.style.width = '15%';

    try {
        statusTxt.innerText = "Convertendo documento...";
        const base64String = await processFile(fileInput.files[0]);
        preenchimentoBarra.style.width = '45%';

        // Payload estruturado para as colunas do seu Banco de Dados
        const payload = {
            nome: document.getElementById('nome').value.trim().toUpperCase(),
            saram: document.getElementById('saram').value.trim(),
            turma: document.getElementById('turma').value,
            situacao: document.getElementById('situacao').value,
            data: inputData.value,
            dias: inputDias.value,
            tipo: inputTipo.value,
            motivo: motivo,
            pdfBase64: base64String
        };

        statusTxt.innerText = CONFIG.mensagens ? CONFIG.mensagens.processando : "Processando...";
        preenchimentoBarra.style.width = '75%';

        // Chamada para o arquivo PHP configurado no config.json
        const response = await fetch(CONFIG.url_api, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });

        const resultText = await response.text();

        // O PHP deve retornar uma string contendo "Sucesso" para validar aqui
        if (resultText.includes("Sucesso")) {
            preenchimentoBarra.style.width = '100%';
            statusTxt.innerText = CONFIG.mensagens.sucesso;
            btn.innerText = "✅ ENVIADO";
            
            exibirNotificacao(CONFIG.mensagens.sucesso_alert || "Enviado com sucesso!");
            
            setTimeout(() => {
                window.onbeforeunload = null;
                location.reload();
            }, 3000);
        } else {
            throw new Error(resultText);
        }

    } catch (err) {
        btn.disabled = false;
        btn.innerText = "TENTAR NOVAMENTE";
        statusTxt.innerText = "❌ Falha no envio.";
        preenchimentoBarra.style.width = '0%';
        exibirNotificacao(CONFIG.mensagens ? CONFIG.mensagens.erro_geral : "Erro ao enviar.", "#d9534f");
        console.error("Erro de envio:", err);
    }
};