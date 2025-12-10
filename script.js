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
const inputEquipe = document.getElementById("filtro-equipe-input");
const listaEquipe = document.getElementById("filtro-equipe-lista");
const labelEquipeSel = document.getElementById("equipe-selecionada");

const inputAtleta = document.getElementById("filtro-atleta-input");
const listaAtleta = document.getElementById("filtro-atleta-lista");
const labelAtletaSel = document.getElementById("atleta-selecionado");

const btnCarregar = document.getElementById("btn-carregar");
const btnLimpar = document.getElementById("btn-limpar");
const listaAtletasDiv = document.getElementById("lista-atletas");

// Variáveis de estado
let equipeSelecionada = "";
let atletaSelecionado = "";
let todosAtletas = [];
let todasEquipes = [];

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
  listaAtletasDiv.innerHTML = "<p>Carregando dados da FPFS...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletasSet = new Set();
    const equipesSet = new Set();

    Object.values(data).forEach(anoObj => {
      Object.values(anoObj).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe && eq.equipe.trim()) {
              equipesSet.add(eq.equipe.trim());
            }
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim()) {
                atletasSet.add(at.nome.trim());
              }
            });
          });
        });
      });
    });

    // Popular listas
    todasEquipes = Array.from(equipesSet).sort((a, b) => a.localeCompare(b));
    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));

    inputEquipe.placeholder = `Buscar entre ${todasEquipes.length} equipes`;
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas`;

    listaAtletasDiv.innerHTML = "<p>Digite uma equipe ou atleta ou clique em <strong>Buscar</strong>.</p>";
  }).catch(err => {
    console.error("Erro Firebase:", err);
    listaAtletasDiv.innerHTML = "<p style='color:red;'>Erro ao carregar dados. Verifique sua conexão.</p>";
  });
}

// ====================================
// FUNÇÕES DE COMBOBOX (reutilizáveis)
// ====================================
function configurarCombobox(input, lista, dados, callbackSelecao, label) {
  input.addEventListener("focus", () => exibirListaCompleta(dados, lista));
  input.addEventListener("input", () => filtrarEExibir(input.value, dados, lista));
  input.addEventListener("blur", () => setTimeout(() => lista.classList.remove("show"), 200));

  function exibirListaCompleta(array, listaEl) {
    exibirLista(array, listaEl);
    listaEl.classList.add("show");
  }

  function filtrarEExibir(termo, array, listaEl) {
    const filtrados = array.filter(item => 
      item.toLowerCase().includes(termo.toLowerCase().trim())
    );
    exibirLista(filtrados, listaEl);
    listaEl.classList.add("show");
  }

  function exibirLista(array, listaEl) {
    listaEl.innerHTML = "";
    if (array.length === 0) {
      listaEl.innerHTML = '<div class="combobox-item" style="color:#999; font-style:italic;">Nenhum item encontrado</div>';
      return;
    }
    array.forEach(item => {
      const div = document.createElement("div");
      div.className = "combobox-item";
      div.textContent = item;
      div.onclick = () => {
        callbackSelecao(item);
        input.value = item;
        label.textContent = `Selecionado: ${item}`;
        listaEl.classList.remove("show");
      };
      listaEl.appendChild(div);
    });
  }
}

// Configurar combobox de equipe
configurarCombobox(
  inputEquipe,
  listaEquipe,
  todasEquipes,
  (nome) => equipeSelecionada = nome,
  labelEquipeSel
);

// Configurar combobox de atleta
configurarCombobox(
  inputAtleta,
  listaAtleta,
  todosAtletas,
  (nome) => atletaSelecionado = nome,
  labelAtletaSel
);

// ====================================
// BOTÃO BUSCAR
// ====================================
btnCarregar.addEventListener("click", () => {
  if (!atletaSelecionado && !equipeSelecionada) {
    alert("Por favor, selecione uma equipe ou um atleta.");
    return;
  }

  listaAtletasDiv.innerHTML = "<p>Buscando...</p>";

  if (atletaSelecionado && equipeSelecionada) {
    buscarAtletaEmEquipe(atletaSelecionado, equipeSelecionada);
  } else if (atletaSelecionado) {
    buscarHistoricoAtleta(atletaSelecionado);
  } else {
    buscarHistoricoEquipe(equipeSelecionada);
  }
});

// ====================================
// BOTÃO LIMPAR
// ====================================
btnLimpar.addEventListener("click", () => {
  equipeSelecionada = "";
  atletaSelecionado = "";
  inputEquipe.value = "";
  inputAtleta.value = "";
  labelEquipeSel.textContent = "";
  labelAtletaSel.textContent = "";
  listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em <strong>Buscar</strong>.</p>";
});

// ====================================
// FUNÇÕES DE BUSCA
// ====================================
function formatarCategoria(cat) {
  const mapa = {
    "sub7": "SUB 7", "sub07": "SUB 7", "sub-7": "SUB 7",
    "sub8": "SUB 8", "sub08": "SUB 8", "sub-8": "SUB 8",
    "sub9": "SUB 9", "sub09": "SUB 9", "sub-9": "SUB 9"
  };
  const chave = cat.toLowerCase().replace(/[^a-z0-9]/g, '');
  return mapa[chave] || cat.toUpperCase();
}

function buscarHistoricoAtleta(nomeAtleta) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const resultados = [];

    Object.keys(data).sort((a, b) => b - a).forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const catFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim().toLowerCase() === nomeAtleta.toLowerCase()) {
                resultados.push({
                  ano,
                  equipe: eq.equipe || "Não informada",
                  categoria: catFormatada
                });
              }
            });
          });
        });
      });
    });

    renderizarResultadoAtleta(nomeAtleta(nomeAtleta, resultados);
  });
}

function buscarHistoricoEquipe(nomeEquipe) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const resultados = [];

    Object.keys(data).sort((a, b) => b - a).forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const catFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe === nomeEquipe) {
              (eq.atletas || []).forEach(at => {
                if (at.nome && at.nome.trim()) {
                  resultados.push({
                    ano,
                    nome: at.nome.trim(),
                    categoria: catFormatada
                  });
                }
              });
            }
          });
        });
      });
    });

    renderizarResultadoEquipe(nomeEquipe, resultados);
  });
}

function buscarAtletaEmEquipe(nomeAtleta, nomeEquipe) {
  // Mesmo que buscarHistoricoAtleta, mas só onde equipe === nomeEquipe
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const resultados = [];

    Object.keys(data).sort((a, b) => b - a).forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const catFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe === nomeEquipe) {
              (eq.atletas || []).forEach(at => {
                if (at.nome && at.nome.trim().toLowerCase() === nomeAtleta.toLowerCase()) {
                  resultados.push({ ano, categoria: catFormatada });
                }
              });
            }
          });
        });
      });
    });

    renderizarResultadoAtletaEmEquipe(nomeAtleta, nomeEquipe, resultados);
  });
}

// ====================================
// RENDERIZAÇÃO FINAL (apenas Nome + Categoria)
// ====================================
function renderizarResultadoAtleta(nome, resultados) {
  if (resultados.length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>Histórico de ${nome}</h3></div>`;
  resultados.forEach(r => {
    html += `
      <div class="atleta-card">
        <div class="atleta-info">
          <strong>${r.nome || nome}</strong><br>
          <small>${r.ano} • ${r.categoria} • ${r.equipe}</small>
        </div>
      </div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

function renderizarResultadoEquipe(equipe, resultados) {
  if (resultados.length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum atleta encontrado para a equipe <strong>${equipe}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>Atletas da equipe: ${equipe}</h3></div>`;
  resultados.forEach(r => {
    html += `
      <div class="atleta-card">
        <div class="atleta-info">
          <strong>${r.nome}</strong><br>
          <small>${r.ano} • ${r.categoria}</small>
        </div>
      </div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

function renderizarResultadoAtletaEmEquipe(nomeAtleta, equipe, resultados) {
  if (resultados.length === 0) {
    listaAtletasDiv.innerHTML = `<p>${nomeAtleta} não encontrado na equipe <strong>${equipe}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>${nomeAtleta} na ${equipe}</h3></div>`;
  resultados.forEach(r => {
    html += `
      <div class="atleta-card">
        <div class="atleta-info">
          <strong>${nomeAtleta}</strong><br>
          <small>${r.ano} • ${r.categoria}</small>
        </div>
      </div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);