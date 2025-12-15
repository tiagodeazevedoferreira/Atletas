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

// Elementos das abas
const tabBtns = document.querySelectorAll(".tab-btn");
const abaContents = document.querySelectorAll(".aba-content");
const listaProgressaoDiv = document.getElementById("lista-progressao");

// Estado
let atletaSelecionado = "";
let equipeSelecionadaApelido = "";
let equipeSelecionadaCompleto = "";
let todosAtletas = [];
let timesApelidosMap = {};
let apelidosParaTimesMap = {};

// Estado para navegação "Voltar"
let ultimoResultadoEquipeHTML = null;

// ====================================
// SERVICE WORKER + BOTÃO INSTALAR
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("SW registrado!", reg))
      .catch(err => console.error("Erro SW:", err));
  });
}

let deferredPrompt;
const installButton = document.createElement("button");
installButton.textContent = "Instalar App";
installButton.style.cssText = `position:fixed;bottom:20px;right:20px;background:#0b3d91;color:white;border:none;padding:14px 24px;border-radius:50px;font-weight:bold;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,0.4);z-index:99999;cursor:pointer;display:none;transition:all .3s;`;
document.body.appendChild(installButton);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = "block";
});

installButton.onclick = () => {
  installButton.style.display = "none";
  deferredPrompt?.prompt();
  deferredPrompt = null;
};

// ====================================
// CARREGAR DADOS INICIAIS
// ====================================
function carregarDadosIniciais() {
  listaAtletasDiv.innerHTML = "<p>Carregando dados...</p>";

  db.ref("times_apelidos").once("value", snapshot => {
    const lista = snapshot.val() || [];
    timesApelidosMap = {};
    apelidosParaTimesMap = {};

    lista.forEach(item => {
      if (item.Time && item.Apelido) {
        const completo = item.Time.trim();
        const apelido = item.Apelido.trim();
        timesApelidosMap[completo] = apelido;
        apelidosParaTimesMap[apelido] = completo;
      }
    });

    preencherSelectEquipesComApelidos();
  });

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletasSet = new Set();

    Object.values(data).forEach(anoObj => {
      Object.values(anoObj).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            if (at.nome?.trim()) atletasSet.add(at.nome.trim());
          });
        });
      });
    });

    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas`;
    listaAtletasDiv.innerHTML = "<p>Use os filtros e clique em <strong>Buscar</strong>.</p>";
  });
}

function preencherSelectEquipesComApelidos() {
  selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
  const apelidos = Object.keys(apelidosParaTimesMap).sort((a, b) => a.localeCompare(b));
  apelidos.forEach(apelido => {
    selEquipe.appendChild(new Option(apelido, apelido));
  });
}

// ====================================
// EVENTOS PRINCIPAIS
// ====================================
selEquipe.addEventListener("change", () => {
  equipeSelecionadaApelido = selEquipe.value;
  equipeSelecionadaCompleto = apelidosParaTimesMap[equipeSelecionadaApelido] || "";
});

btnCarregar.addEventListener("click", () => {
  if (!atletaSelecionado && !equipeSelecionadaApelido) {
    alert("Selecione um atleta ou uma equipe.");
    return;
  }
  listaAtletasDiv.innerHTML = "<p>Carregando...</p>";

  if (atletaSelecionado && equipeSelecionadaApelido) {
    buscarAtletaNaEquipe(atletaSelecionado, equipeSelecionadaCompleto);
  } else if (atletaSelecionado) {
    buscarHistoricoAtleta(atletaSelecionado);
  } else {
    buscarHistoricoEquipe(equipeSelecionadaCompleto);
  }
});

btnLimpar.addEventListener("click", () => {
  limparTudo();
});

function limparTudo() {
  atletaSelecionado = "";
  equipeSelecionadaApelido = "";
  equipeSelecionadaCompleto = "";
  inputAtleta.value = "";
  labelAtletaSelecionado.textContent = "";
  selEquipe.value = "";
  listaAtleta.classList.remove("show");
  ultimoResultadoEquipeHTML = null;
  listaAtletasDiv.innerHTML = "<p>Use os filtros e clique em <strong>Buscar</strong>.</p>";
}

// ====================================
// FUNÇÃO PARA APLICAR CLIQUES NOS ATLETAS
// ====================================
function aplicarEventosCliqueAtletas() {
  document.querySelectorAll(".clickable-atleta").forEach(el => {
    el.style.cursor = "pointer";
    el.onclick = () => {
      const nomeAtleta = el.getAttribute("data-nome");
      buscarHistoricoAtleta(nomeAtleta);
    };
  });
}

// ====================================
// BUSCAS
// ====================================
function buscarHistoricoAtleta(nome) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          const tem = (eq.atletas || []).some(a => a.nome?.trim().toLowerCase() === nome.toLowerCase());
          if (tem && eq.equipe) {
            if (!historico[ano]) historico[ano] = [];
            const apelido = timesApelidosMap[eq.equipe] || eq.equipe;
            historico[ano].push({ equipe: apelido, categoria });
          }
        });
      });
    });
    renderizarHistoricoAtleta(nome, historico);
  });
}

function buscarHistoricoEquipe(nomeCompleto) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === nomeCompleto) {
            if (!historico[ano]) historico[ano] = [];
            (eq.atletas || []).forEach(at => {
              const nomeAtleta = at.nome?.trim();
              if (nomeAtleta) {
                historico[ano].push({ nome: nomeAtleta, categoria });
              }
            });
          }
        });
      });
    });

    const apelido = timesApelidosMap[nomeCompleto] || nomeCompleto;
    renderizarHistoricoEquipe(apelido, historico);
  });
}

function buscarAtletaNaEquipe(atletaNome, equipeCompleto) {
  db.ref("atletas").once("value", s => {
    const data = s.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === equipeCompleto) {
            const tem = (eq.atletas || []).some(a => a.nome?.trim().toLowerCase() === atletaNome.toLowerCase());
            if (tem) {
              if (!historico[ano]) historico[ano] = [];
              const apelido = timesApelidosMap[eq.equipe] || eq.equipe;
              historico[ano].push({ equipe: apelido, categoria });
            }
          }
        });
      });
    });
    const apelido = timesApelidosMap[equipeCompleto] || equipeCompleto;
    renderizarHistoricoAtleta(atletaNome, historico, `na equipe ${apelido}`);
  });
}

// ====================================
// RENDERIZAÇÃO
// ====================================
function formatarCategoria(key) {
  const map = { "sub7": "Sub-7", "sub07": "Sub-7", "sub8": "Sub-8", "sub08": "Sub-8", "sub9": "Sub-9", "sub09": "Sub-9" };
  return map[key.toLowerCase()] || key.toUpperCase();
}

function renderizarHistoricoAtleta(nome, historico, subtitulo = "") {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>${subtitulo}.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>${subtitulo ? nome + subtitulo : "Histórico: " + nome}</h3></div>`;

  if (ultimoResultadoEquipeHTML) {
    html += `<button id="btn-voltar-equipe" class="btn-voltar">← Voltar à equipe</button>`;
  }

  Object.keys(historico).sort((a,b) => b-a).forEach(ano => {
    const regs = historico[ano];
    html += `<div class="ano-section"><h4>${ano} (${regs.length} registro${regs.length > 1 ? "s" : ""})</h4>`;
    regs.forEach(r => {
      html += `<div class="atleta-card"><div class="atleta-info"><strong>${r.equipe}</strong> <span class="categoria-tag">${r.categoria}</span></div></div>`;
    });
    html += `</div>`;
  });

  listaAtletasDiv.innerHTML = html;

  const btnVoltar = document.getElementById("btn-voltar-equipe");
  if (btnVoltar) {
    btnVoltar.onclick = () => {
      listaAtletasDiv.innerHTML = ultimoResultadoEquipeHTML;
      aplicarEventosCliqueAtletas(); // Reaplica cliques
      // Não limpa ultimoResultadoEquipeHTML aqui — será atualizado novamente na renderização da equipe
    };
  }
}

function renderizarHistoricoEquipe(equipe, historico) {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${equipe}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>Histórico da Equipe: ${equipe}</h3></div>`;

  Object.keys(historico).sort((a,b) => b-a).forEach(ano => {
    const regs = historico[ano];
    html += `<div class="ano-section"><h4>${ano} (${regs.length} atleta${regs.length > 1 ? "s" : ""})</h4>`;
    regs.forEach(r => {
      html += `<div class="atleta-card">
        <div class="atleta-info clickable-atleta" data-nome="${r.nome}">
          <strong>${r.nome}</strong> <span class="categoria-tag">${r.categoria}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });

  // Sempre atualiza o HTML salvo (importante para múltiplos "voltar")
  ultimoResultadoEquipeHTML = html;
  listaAtletasDiv.innerHTML = html;

  aplicarEventosCliqueAtletas();
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
    listaAtleta.innerHTML = '<div class="combobox-item" style="padding:12px;color:#999;">Nenhum atleta encontrado</div>';
    return;
  }
  lista.forEach(nome => {
    const item = document.createElement("div");
    item.className = "combobox-item";
    item.textContent = nome;
    item.onclick = () => {
      atletaSelecionado = nome;
      inputAtleta.value = nome;
      labelAtletaSelecionado.textContent = `Selecionado: ${nome}`;
      listaAtleta.classList.remove("show");
    };
    listaAtleta.appendChild(item);
  });
}


// Alternar abas
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const aba = btn.dataset.aba;

    // Atualiza botões
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Mostra aba correta
    abaContents.forEach(content => content.classList.remove("active"));
    document.getElementById(`aba-${aba}`).classList.add("active");

    // Se for a aba de progressão, carrega os dados (só na primeira vez ou sempre)
    if (aba === "progressao") {
      carregarProgressaoSub7();
    }
  });
});

// ====================================
// PROGRESSÃO SUB7 2022 → 2025
// ====================================
function carregarProgressaoSub7() {
  if (listaProgressaoDiv.innerHTML.includes("Carregando") === false && listaProgressaoDiv.innerHTML !== "") {
    return; // Já carregado
  }

  listaProgressaoDiv.innerHTML = "<p>Carregando dados da progressão...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const sub7_2022 = new Set();
    const em_2025 = new Set();

    // Atletas Sub-7 em 2022
    if (data["2022"]) {
      Object.entries(data["2022"]).forEach(([catKey, catObj]) => {
        const chave = catKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (chave.includes("sub7")) {
          Object.values(catObj).forEach(eq => {
            (eq.atletas || []).forEach(at => {
              const nome = at.nome?.trim();
              if (nome) sub7_2022.add(nome);
            });
          });
        }
      });
    }

    // Atletas em qualquer categoria em 2025
    if (data["2025"]) {
      Object.values(data["2025"]).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            const nome = at.nome?.trim();
            if (nome) em_2025.add(nome);
          });
        });
      });
    }

    const progressao = [...new Set([...sub7_2022].filter(n => em_2025.has(n)))].sort((a, b) => a.localeCompare(b));

    if (progressao.length === 0) {
      listaProgressaoDiv.innerHTML = "<p>Nenhum atleta encontrado com essa progressão.</p>";
      return;
    }

    let html = `<p><strong>${progressao.length} atleta(s) encontrado(s):</strong></p>`;
    progressao.forEach(nome => {
      html += `<div class="progressao-item"><strong>${nome}</strong></div>`;
    });
    listaProgressaoDiv.innerHTML = html;
  }).catch(err => {
    console.error(err);
    listaProgressaoDiv.innerHTML = "<p style='color:red;'>Erro ao carregar dados.</p>";
  });
}


// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);