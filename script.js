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
const inputAtleta            = document.getElementById("filtro-atleta-input");
const listaAtleta            = document.getElementById("filtro-atleta-lista");
const labelAtletaSelecionado = document.getElementById("atleta-selecionado");
const selEquipe              = document.getElementById("filtro-equipe");
const btnCarregar            = document.getElementById("btn-carregar");
const btnLimpar              = document.getElementById("btn-limpar");
const listaAtletasDiv        = document.getElementById("lista-atletas");

let atletaSelecionado = "";
let equipeSelecionada = "";
let todosAtletas = [];
let todasEquipes = new Set();

// ====================================
// SERVICE WORKER
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ====================================
// CARREGAR DADOS INICIAIS
// ====================================
function carregarDadosIniciais() {
  listaAtletasDiv.innerHTML = "<p>Carregando dados...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletasSet = new Set();

    Object.values(data).forEach(anoObj => {
      Object.values(anoObj).forEach(catObj => {
        const categoriaNome = Object.keys(catObj)[0]; // ex: "sub7", "sub9"
        Object.values(catObj).forEach(eq => {
          if (eq.equipe) todasEquipes.add(eq.equipe);
          (eq.atletas || []).forEach(at => {
            if (at.nome && at.nome.trim()) {
              atletasSet.add(at.nome.trim());
            }
          });
        });
      });
    });

    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas`;

    const equipesOrdenadas = Array.from(todasEquipes).sort((a, b) => a.localeCompare(b));
    selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
    equipesOrdenadas.forEach(eq => {
      selEquipe.appendChild(new Option(eq, eq));
    });

    listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em Buscar.</p>";
  }).catch(err => {
    console.error(err);
    listaAtletasDiv.innerHTML = "<p style='color:red;'>Erro ao conectar com o banco de dados.</p>";
  });
}

// ====================================
// COMBOBOX ATLETA
// ====================================
inputAtleta.addEventListener("focus", () => abrirLista(todosAtletas));
inputAtleta.addEventListener("input", () => filtrarLista(inputAtleta.value));
inputAtleta.addEventListener("blur", () => setTimeout(() => listaAtleta.classList.remove("show"), 200));

function abrirLista(lista) { exibirLista(lista); listaAtleta.classList.add("show"); }
function filtrarLista(termo) {
  const termoLower = termo.toLowerCase().trim();
  const filtrados = todosAtletas.filter(n => n.toLowerCase().includes(termoLower));
  exibirLista(filtrados);
}
function exibirLista(lista) {
  listaAtleta.innerHTML = "";
  if (lista.length === 0) {
    listaAtleta.innerHTML = '<div class="combobox-item" style="padding:12px; color:#999; font-style:italic;">Nenhum atleta encontrado</div>';
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
  inputAtleta.value = "";
  labelAtletaSelecionado.textContent = "";
  listaAtleta.classList.remove("show");
  equipeSelecionada = "";
  selEquipe.value = "";
  listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em Buscar.</p>";
});

// ====================================
// BUSCAS
// ====================================
function buscarHistoricoAtleta(nome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          const temAtleta = (eq.atletas || []).some(at =>
            at.nome && at.nome.trim().toLowerCase() === nome.toLowerCase()
          );
          if (temAtleta) {
            if (!historico[ano]) historico[ano] = [];
            historico[ano].push({ equipe: eq.equipe || "Sem equipe", categoria });
          }
        });
      });
    });

    renderizarHistoricoAtleta(nome, historico);
  });
}

function buscarHistoricoEquipe(equipeNome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === equipeNome) {
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim()) {
                if (!historico[ano]) historico[ano] = [];
                historico[ano].push({ nome: at.nome.trim(), categoria });
              }
            });
          }
        });
      });
    });

    renderizarHistoricoEquipe(equipeNome, historico);
  });
}

function buscarAtletaNaEquipe(atletaNome, equipeNome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const historico = {};

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([catKey, catObj]) => {
        const categoria = formatarCategoria(catKey);
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === equipeNome) {
            const temAtleta = (eq.atletas || []).some(at =>
              at.nome && at.nome.trim().toLowerCase() === atletaNome.toLowerCase()
            );
            if (temAtleta) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({ equipe: eq.equipe, categoria });
            }
          }
        });
      });
    });

    renderizarHistoricoAtleta(atletaNome, historico, `na equipe ${equipeNome}`);
  });
}

// ====================================
// FUNÇÕES AUXILIARES
// ====================================
function formatarCategoria(chave) {
  const map = {
    "sub7": "Sub-7", "sub8": "Sub-8", "sub9": "Sub-9",
    "sub07": "Sub-7", "sub08": "Sub-8", "sub09": "Sub-9"
  };
  return map[chave.toLowerCase()] || chave.toUpperCase();
}

// ====================================
// RENDERIZAÇÃO FINAL COM CATEGORIA
// ====================================
function renderizarHistoricoAtleta(nome, historico, subtitulo = "") {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>${subtitulo}.</p>`;
    return;
  }

  const titulo = subtitulo ? `${nome} ${subtitulo}` : `Histórico completo: ${nome}`;
  let html = `<div class="atletas-header"><h3>${titulo}</h3></div>`;

  Object.keys(historico).sort((a, b) => b - a).forEach(ano => {
    const entradas = historico[ano];
    html += `<div class="ano-section">
               <h4>${ano} (${entradas.length} registro${entradas.length > 1 ? 's' : ''})</h4>`;

    entradas.forEach(reg => {
      html += `<div class="atleta-card">
                 <div class="atleta-info">
                   <strong>${reg.equipe}</strong>
                   <span class="categoria-tag">${reg.categoria}</span>
                 </div>
               </div>`;
    });
    html += `</div>`;
  });

  listaAtletasDiv.innerHTML = html;
}

function renderizarHistoricoEquipe(equipe, historico) {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para a equipe <strong>${equipe}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>Histórico da Equipe: ${equipe}</h3></div>`;

  Object.keys(historico).sort((a, b) => b - a).forEach(ano => {
    const entradas = historico[ano];
    const totalAtletas = entradas.length;
    html += `<div class="ano-section">
               <h4>${ano} (${totalAtletas} atleta${totalAtletas > 1 ? 's' : ''})</h4>`;

    entradas.forEach(reg => {
      html += `<div class="atleta-card">
                 <div class="atleta-info">
                   <strong>${reg.nome}</strong>
                   <span class="categoria-tag">${reg.categoria}</span>
                 </div>
               </div>`;
    });
    html += `</div>`;
  });

  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);