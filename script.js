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

// Variáveis de estado
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

    // Preenche lista de atletas
    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas`;

    // Preenche select de equipes
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

function abrirLista(lista) {
  exibirLista(lista);
  listaAtleta.classList.add("show");
}

function filtrarLista(termo) {
  const termoLower = termo.toLowerCase().trim();
  const filtrados = todosAtletas.filter(n => n.toLowerCase().includes(termoLower));
  exibirLista(filtrados);
}

function exibirLista(lista) {
  listaAtleta.innerHTML = "";
  if (lista.length === 0) {
    listaAtleta.innerHTML = '<div class="combobox-item" style="color:#999; font-style:italic; padding:10px;">Nenhum atleta encontrado</div>';
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
// FILTROS E BOTÕES
// ====================================
selEquipe.addEventListener("change", () => {
  equipeSelecionada = selEquipe.value;
});

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
  } else if (equipeSelecionada) {
    buscarHistoricoEquipe(equipeSelecionada);
  }
});

// BOTÃO LIMPAR
btnLimpar.addEventListener("click", () => {
  // Limpa atleta
  atletaSelecionado = "";
  inputAtleta.value = "";
  labelAtletaSelecionado.textContent = "";
  listaAtleta.classList.remove("show");

  // Limpa equipe
  equipeSelecionada = "";
  selEquipe.value = "";

  // Restaura mensagem inicial
  listaAtletasDiv.innerHTML = "<p>Use os filtros acima e clique em Buscar.</p>";
});

// ====================================
// FUNÇÕES DE BUSCA E RENDERIZAÇÃO
// ====================================
function buscarHistoricoAtleta(nome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            if (at.nome && at.nome.trim().toLowerCase() === nome.toLowerCase()) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({
                equipe: eq.equipe || "Desconhecida",
                categoria: "Diversas",
                posicao: at.posicao || "-",
                nascimento: at.data_nascimento || "-"
              });
            }
          });
        });
      });
    });

    renderizarHistorico(nome, historico, "Histórico Completo do Atleta");
  });
}

function buscarHistoricoEquipe(equipeNome) {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === equipeNome) {
            if (!historico[ano]) historico[ano] = [];
            (eq.atletas || []).forEach(at => {
              historico[ano].push({
                nome: at.nome || "Sem nome",
                posicao: at.posicao || "-",
                nascimento: at.data_nascimento || "-"
              });
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
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          if (eq.equipe === equipeNome) {
            (eq.atletas || []).forEach(at => {
              if (at.nome && at.nome.trim().toLowerCase() === atletaNome.toLowerCase()) {
                if (!historico[ano]) historico[ano] = [];
                historico[ano].push({
                  equipe: eq.equipe,
                  categoria: "Diversas",
                  posicao: at.posicao || "-",
                  nascimento: at.data_nascimento || "-"
                });
              }
            });
          }
        });
      });
    });

    renderizarHistorico(atletaNome, historico, `${atletaNome} na equipe ${equipeNome}`);
  });
}

function renderizarHistorico(titulo, historico, cabecalho = titulo) {
  if (Object.keys(historico).length === 0) {
    listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${titulo}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>${cabecalho}</h3></div>`;
  Object.keys(historico).sort((a, b) => b - a).forEach(ano => {
    html += `<div class="ano-section"><h4>${ano}</h4>`;
    historico[ano].forEach(reg => {
      html += `
        <div class="atleta-card">
          <div class="atleta-info">
            <strong>${reg.equipe || "Equipe não informada"}</strong><br>
            <small>Categoria: ${reg.categoria} • Posição: ${reg.posicao}</small><br>
            <small>Nascimento: ${reg.nascimento}</small>
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
    const atletasUnicos = [...new Set(historico[ano].map(a => a.nome))];
    html += `<div class="ano-section"><h4>${ano} (${atletasUnicos.length} atletas)</h4>`;
    atletasUnicos.forEach(nome => {
      const reg = historico[ano].find(r => r.nome === nome);
      html += `
        <div class="atleta-card">
          <div class="atleta-info">
            <strong>${nome}</strong><br>
            <small>Posição: ${reg.posicao} • Nascimento: ${reg.nascimento}</small>
          </div>
        </div>`;
    });
    html += `</div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIAR APLICAÇÃO
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);