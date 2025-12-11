// ====================================
// CONFIGURAÇÃO FIREBASE
// ====================================
const firebaseConfig = {
  apiKey: "AIzaSyCleLlq8sLVD0mrRjvMqLztZH7-Yqd9-eA",
  authDomain: "fpfs-atletas-web.firebaseapp.com",
  databaseURL: "https://fpfs-atletas-web-default-rtdb.firebaseio.com",
  projectId: "fpfs-atletas-web",
  storageBucket: "fpfs-atletas-web.appspot.com",
  messagingSenderId: "634040999870",
  appId: "1:634040999870:web:3d9e0d56d6dbc746aae3ef"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ====================================
// ELEMENTOS DOM
// ====================================
const inputAtleta = document.getElementById("filtro-atleta-input");
const listaAtleta = document.getElementById("filtro-atleta-lista");
const labelAtletaSelecionado = document.getElementById("atleta-selecionado");
const selEquipe = document.getElementById("filtro-equipe");
const btnCarregar = document.getElementById("btn-carregar");
const btnLimpar = document.getElementById("btn-limpar");
const listaAtletasDiv = document.getElementById("lista-atletas");

// Estado
let atletaSelecionado = "";
let equipeSelecionada = "";
let todosAtletas = [];
let todasEquipes = new Set();

// ====================================
// SERVICE WORKER + INSTALAR APP (PWA)
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(reg => console.log("SW registrado com sucesso!", reg))
      .catch(err => console.error("Erro no SW:", err));
  });
}

// Botão flutuante "Instalar App"
let deferredPrompt;
const installButton = document.createElement("button");
installButton.textContent = "📱 Instalar App";
installButton.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #0b3d91;
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 50px;
  font-weight: bold;
  font-size: 15px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  z-index: 99999;
  cursor: pointer;
  display: none;
  transition: all 0.3s ease;
  font-family: system-ui, sans-serif;
`;
document.body.appendChild(installButton);

window.addEventListener("beforeinstallprompt", (e) => {
  console.log("✅ PWA pode ser instalado!");
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = "block";
});

installButton.addEventListener("click", () => {
  installButton.style.display = "none";
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    if (choice.outcome === "accepted") {
      console.log("🎉 App instalado com sucesso!");
    } else {
      console.log("Usuário cancelou a instalação");
    }
    deferredPrompt = null;
  });
});

window.addEventListener("appinstalled", () => {
  installButton.style.display = "none";
  console.log("🚀 PWA instalada permanentemente!");
});

// ====================================
// CARREGAR DADOS INICIAIS COM DEPURAÇÃO
// ====================================
function carregarDadosIniciais() {
  listaAtletasDiv.innerHTML = "<p>Carregando dados do banco...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    console.log("Dados Firebase carregados:", data ? "OK" : "Vazio"); // Debug estrutura
    console.log("Estrutura completa dos dados:", JSON.stringify(data, null, 2)); // Mostra o JSON completo no console

    const atletasSet = new Set();

    // Loop otimizado para extrair dados (caso a estrutura seja ligeiramente diferente)
    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj || {}).forEach(([catKey, catObj]) => {
        Object.entries(catObj || {}).forEach(([eqKey, eq]) => {
          if (eq.equipe) todasEquipes.add(eq.equipe);
          (eq.atletas || []).forEach(at => {
            if (at.nome && at.nome.trim()) atletasSet.add(at.nome.trim());
          });
        });
      });
    });

    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    console.log("Total de atletas únicos encontrados:", todosAtletas.length); // Debug
    console.log("Total de equipes únicas encontradas:", todasEquipes.size); // Debug

    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length.toLocaleString()} atletas`;

    const equipesOrdenadas = Array.from(todasEquipes).sort((a, b) => a.localeCompare(b));
    selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
    equipesOrdenadas.forEach(eq => {
      const option = document.createElement("option");
      option.value = eq;
      option.textContent = eq;
      selEquipe.appendChild(option);
    });

    listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em <strong>Buscar</strong>.</p>";
  }).catch(err => {
    console.error("Detalhes do erro Firebase:", err.message, err.code); // Debug detalhado
    listaAtletasDiv.innerHTML = `<p style='color:red;'>Erro: ${err.message}. Verifique o console para mais detalhes.</p>`;
  });
}

// ====================================
// COMBOBOX ATLETA
// ====================================
inputAtleta.addEventListener("focus", () => abrirLista(todosAtletas));
inputAtleta.addEventListener("input", () => filtrarLista(inputAtleta.value.trim()));
inputAtleta.addEventListener("blur", () => setTimeout(() => listaAtleta.classList.remove("show"), 200));

function abrirLista(lista) { exibirLista(lista); listaAtleta.classList.add("show"); }
function filtrarLista(termo) {
  if (!termo) return abrirLista(todosAtletas);
  const filtrados = todosAtletas.filter(n => n.toLowerCase().includes(termo.toLowerCase()));
  exibirLista(filtrados);
}
function exibirLista(lista) {
  listaAtleta.innerHTML = "";
  if (lista.length === 0) {
    listaAtleta.innerHTML = '<div class="combobox-item" style="padding:12px; color:#999;">Nenhum atleta encontrado</div>';
    return;
  }
  lista.forEach(nome => {
    const item = document.createElement("div");
    item.className = "combobox-item";
    item.textContent = nome;
    item.onclick = () => selecionarAtleta(nome);
    listaAtleta.appendChild(item);
  });
}
function selecionarAtleta(nome) {
  atletaSelecionado = nome;
  inputAtleta.value = nome;
  labelAtletaSelecionado.textContent = `Selecionado: ${nome}`;
  listaAtleta.classList.remove("show");
}

// ====================================
// BOTÕES
// ====================================
selEquipe.addEventListener("change", () => equipeSelecionada = selEquipe.value);

btnCarregar.addEventListener("click", () => {
  if (!atletaSelecionado && !equipeSelecionada) {
    alert("Selecione um atleta ou uma equipe para buscar.");
    return;
  }
  listaAtletasDiv.innerHTML = "<p>Carregando...</p>";

  if (atletaSelecionado && equipeSelecionada) {
    buscarAtletaNaEquipe(atletaSelecionado, equipeSelecionada);
  } else if (atletaSelecionado) {
    buscarHistoricoAtleta(atletaSelecionado);
  } else {
    buscarHistoricoEquipe(equipeSelecionada);
  }
});

btnLimpar.addEventListener("click", () => {
  atletaSelecionado = "";
  equipeSelecionada = "";
  inputAtleta.value = "";
  labelAtletaSelecionado.textContent = "";
  selEquipe.value = "";
  listaAtleta.classList.remove("show");
  listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em <strong>Buscar</strong>.</p>";
});

// ====================================
// BUSCAS NO FIREBASE
// ====================================
function formatarCategoria(key) {
  const map = { "sub7": "Sub-7", "sub07": "Sub-7", "sub8": "Sub-8", "sub08": "Sub-8", "sub9": "Sub-9", "sub09": "Sub-9" };
  return map[key.toLowerCase()] || key.toUpperCase();
}

function buscarHistoricoAtleta(nome) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.entries(catObj).forEach(([eqKey, eq]) => {
          const tem = (eq.atletas || []).some(a => a.nome && a.nome.trim().toLowerCase() === nome.toLowerCase());
          if (tem && eq.equipe) {
            if (!historico[ano]) historico[ano] = [];
            historico[ano].push({ equipe: eq.equipe, categoria });
          }
        });
      });
    });
    console.log("Histórico do atleta encontrado:", historico); // Debug resultados
    renderizarHistoricoAtleta(nome, historico);
  });
}

function buscarHistoricoEquipe(equipeNome) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.entries(catObj).forEach(([eqKey, eq]) => {
          if (eq.equipe === equipeNome) {
            (eq.atletas || []).forEach(at => {
              if (at.nome) {
                if (!historico[ano]) historico[ano] = [];
                historico[ano].push({ nome: at.nome.trim(), categoria });
              }
            });
          }
        });
      });
    });
    console.log("Histórico da equipe encontrado:", historico); // Debug resultados
    renderizarHistoricoEquipe(equipeNome, historico);
  });
}

function buscarAtletaNaEquipe(atletaNome, equipeNome) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.entries(catObj).forEach(([eqKey, eq]) => {
          if (eq.equipe === equipeNome) {
            const tem = (eq.atletas || []).some(a => a.nome && a.nome.trim().toLowerCase() === atletaNome.toLowerCase());
            if (tem) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({ equipe: eq.equipe, categoria });
            }
          }
        });
      });
    });
    console.log("Histórico do atleta na equipe encontrado:", historico); // Debug resultados
    renderizarHistoricoAtleta(atletaNome, historico, ` na equipe ${equipeNome}`);
  });
}

// ====================================
// RENDERIZAÇÃO
// ====================================
function renderizarHistoricoAtleta(nome, historico, subtitulo = "") {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>${subtitulo}.</p>`;
    return;
  }

  let html = `
    <div class="atletas-header">
      <h3>${subtitulo ? nome + subtitulo : "Histórico de " + nome}</h3>
    </div>
  `;

  Object.keys(historico)
    .sort((a, b) => b - a)
    .forEach(ano => {
      const regs = historico[ano];
      html += `
        <div class="ano-section">
          <h4>${ano} - ${regs.length} registro${regs.length > 1 ? "s" : ""}</h4>
      `;
      regs.forEach(r => {
        html += `
          <div class="atleta-card">
            <div class="atleta-info">
              <strong>${r.equipe}</strong>
              <span class="categoria-tag">${r.categoria}</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    });

  listaAtletasDiv.innerHTML = html;
}

function renderizarHistoricoEquipe(equipe, historico) {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${equipe}</strong>.</p>`;
    return;
  }

  let html = `
    <div class="atletas-header">
      <h3>Histórico da Equipe ${equipe}</h3>
    </div>
  `;

  Object.keys(historico)
    .sort((a, b) => b - a)
    .forEach(ano => {
      const regs = historico[ano];
      html += `
        <div class="ano-section">
          <h4>${ano} - ${regs.length} atleta${regs.length > 1 ? "s" : ""}</h4>
      `;
      regs.forEach(r => {
        html += `
          <div class="atleta-card">
            <div class="atleta-info">
              <strong>${r.nome}</strong>
              <span class="categoria-tag">${r.categoria}</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    });

  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);