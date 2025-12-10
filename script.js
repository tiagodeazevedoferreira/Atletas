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
// ELEMENTOS
// ====================================
const inputAtleta = document.getElementById("filtro-atleta-input");
const listaAtleta = document.getElementById("filtro-atleta-lista");
const labelAtletaSelecionado = document.getElementById("atleta-selecionado");
const selEquipe = document.getElementById("filtro-equipe");
const btnCarregar = document.getElementById("btn-carregar");
const listaAtletasDiv = document.getElementById("lista-atletas");

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
  listaAtletasDiv.innerHTML = "<p>Carregando dados da FPFS...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletasSet = new Set();

    Object.values(data).forEach(anoObj => {
      Object.values(anoObj).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe) todasEquipes.add(eq.equipe);
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim()) {
                atletasSet.add(at.nome.trim());
              }
            });
          });
        });
      });
    });

    // Atletas
    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas`;

    // Equipes
    const equipesOrdenadas = Array.from(todasEquipes).sort((a, b) => a.localeCompare(b));
    selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
    equipesOrdenadas.forEach(eq => {
      selEquipe.appendChild(new Option(eq, eq));
    });

    listaAtletasDiv.innerHTML = "<p>Digite um atleta ou selecione uma equipe e clique em <strong>Buscar</strong>.</p>";
  }).catch(err => {
    console.error("Erro Firebase:", err);
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
  const filtrados = todosAtletas.filter(n => n.toLowerCase().includes(termo.toLowerCase().trim()));
  exibirLista(filtrados);
}
function exibirLista(lista) {
  listaAtleta.innerHTML = "";
  if (lista.length === 0) {
    listaAtleta.innerHTML = '<div class="combobox-item" style="color:#999; font-style:italic;">Nenhum atleta encontrado</div>';
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

selEquipe.addEventListener("change", () => {
  equipeSelecionada = selEquipe.value;
});

// ====================================
// BUSCAR
// ====================================
btnCarregar.addEventListener("click", () => {
  if (!atletaSelecionado && !equipeSelecionada) {
    alert("Selecione um atleta ou uma equipe.");
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

// ====================================
// FUNÇÕES DE BUSCA
// ====================================
function buscarHistoricoAtleta(nome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const categoriaFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim().toLowerCase() === nome.toLowerCase()) {
                if (!historico[ano]) historico[ano] = [];
                historico[ano].push({
                  equipe: eq.equipe || "Não informada",
                  categoria: categoriaFormatada
                });
              }
            });
          });
        });
      });
    });

    renderizarHistoricoAtleta(nome, historico);
  });
}

function buscarHistoricoEquipe(equipeNome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const categoriaFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe === equipeNome) {
              (eq.atletas || []).forEach(at => {
                if (!historico[ano]) historico[ano] = { categoria: categoriaFormatada, atletas: [] };
                historico[ano].atletas.push(at.nome || "Sem nome");
              });
            }
          });
        });
      });
    });

    renderizarHistoricoEquipe(equipeNome, historico);
  });
}

function buscarAtletaNaEquipe(atletaNome, equipeNome) {
  // Mesma lógica, mas com filtro de equipe
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.keys(catObj).forEach(categoria => {
          const categoriaFormatada = formatarCategoria(categoria);
          Object.values(catObj[categoria]).forEach(eq => {
            if (eq.equipe === equipeNome) {
              (eq.atletas || []).forEach(at => {
                if (at.nome && at.nome.trim().toLowerCase() === atletaNome.toLowerCase()) {
                  if (!historico[ano]) historico[ano] = [];
                  historico[ano].push({ categoria: categoriaFormatada });
                }
              });
            }
          });
        });
      });
    });

    renderizarHistoricoAtleta(atletaNome, historico, `na ${equipeNome}`);
  });
}

// ====================================
// FORMATAÇÃO DE CATEGORIA
// ====================================
function formatarCategoria(cat) {
  const mapa = {
    "sub7": "SUB 7",
    "sub8": "SUB 8",
    "sub9": "SUB 9",
    "sub-7": "SUB 7",
    "sub-8": "SUB 8",
    "sub-9": "SUB 9",
    "sub07": "SUB 7",
    "sub08": "SUB 8",
    "sub09": "SUB 9"
  };
  const chave = cat.toLowerCase().replace(/\s/g, '');
  return mapa[chave] || cat.toUpperCase();
}

// ====================================
// RENDERIZAÇÃO FINAL
// ====================================
function renderizarHistoricoAtleta(nome, historico, complemento = "") {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>${complemento}.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>${nome}${complemento}</h3></div>`;
  Object.keys(historico).sort((a, b) => b - a).forEach(ano => {
    const registros = historico[ano];
    const equipesUnicas = [...new Set(registros.map(r => r.equipe))];
    html += `<div class="ano-section"><h4>${ano}</h4>`;
    equipesUnicas.forEach(eq => {
      const cats = registros.filter(r => r.equipe === eq).map(r => r.categoria);
      const catsUnicas = [...new Set(cats)];
      html += `<div class="atleta-card"><div class="atleta-info">
        <strong>${eq}</strong><br>
        <small>${catsUnicas.join(" • ")}</small>
      </div></div>`;
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

  let html = `<div class="atletas-header"><h3>Histórico: ${equipe}</h3></div>`;
  Object.keys(historico).sort((a, b) => b - a).forEach(ano => {
    const info = historico[ano];
    const totalAtletas = info.atletas.length;
    html += `<div class="ano-section"><h4>${ano} • ${info.categoria}</h4>`;
    html += `<p><strong>${totalAtletas} atleta(s)</strong></p>`;
    html += `</div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);