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
// ELEMENTOS DA UI
// ====================================
const selAno = document.getElementById("filtro-ano");
const selCategoria = document.getElementById("filtro-categoria");
const selEquipe = document.getElementById("filtro-equipe");
const inputAtleta = document.getElementById("filtro-atleta-input");
const listaAtleta = document.getElementById("filtro-atleta-lista");
const labelAtletaSelecionado = document.getElementById("atleta-selecionado");
const btnCarregar = document.getElementById("btn-carregar");
const listaAtletasDiv = document.getElementById("lista-atletas");

let atletaSelecionado = "";
let todosAtletas = [];

// ====================================
// SERVICE WORKER
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(() => console.log("Service Worker registrado"))
      .catch(err => console.error("Erro no SW:", err));
  });
}

// ====================================
// CARREGAR ANOS
// ====================================
function carregarAnos() {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a); // mais recente primeiro
    selAno.innerHTML = '<option value="">Selecione o ano</option>';
    anos.forEach(ano => {
      selAno.appendChild(new Option(ano, ano));
    });
  }).catch(err => {
    console.error("Erro ao carregar anos:", err);
    alert("Erro ao conectar com o banco de dados.");
  });
}

// ====================================
// AO MUDAR ANO → CARREGAR CATEGORIAS
// ====================================
selAno.addEventListener("change", () => {
  const ano = selAno.value;
  selCategoria.innerHTML = '<option value="">Carregando...</option>';
  selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
  limparAtleta();

  if (!ano) {
    selCategoria.innerHTML = '<option value="">Selecione primeiro o ano</option>';
    return;
  }

  db.ref(`atletas/${ano}`).once("value", snapshot => {
    const data = snapshot.val() || {};
    const categorias = Object.keys(data).sort();
    selCategoria.innerHTML = '<option value="">Selecione a categoria</option>';
    categorias.forEach(cat => {
      selCategoria.appendChild(new Option(cat, cat));
    });
  });
});

// ====================================
// AO MUDAR CATEGORIA → CARREGAR EQUIPES E ATLETAS
// ====================================
selCategoria.addEventListener("change", () => {
  const ano = selAno.value;
  const cat = selCategoria.value;
  if (!ano || !cat) return;

  selEquipe.innerHTML = '<option value="">Carregando equipes...</option>';
  limparAtleta();

  db.ref(`atletas/${ano}/${cat}`).once("value", snapshot => {
    const data = snapshot.val() || {};
    const equipesMap = {};
    const atletasSet = new Set();

    Object.values(data).forEach(eq => {
      if (eq.equipe && eq.equipe_id) {
        equipesMap[eq.equipe_id] = eq.equipe;
      }
      (eq.atletas || []).forEach(at => {
        if (at.nome && at.nome.trim()) {
          atletasSet.add(at.nome.trim());
        }
      });
    });

    // Preenche equipes
    selEquipe.innerHTML = '<option value="">Todas as equipes</option>';
    Object.keys(equipesMap)
      .sort((a, b) => equipesMap[a].localeCompare(equipesMap[b]))
      .forEach(id => {
        selEquipe.appendChild(new Option(equipesMap[id], id));
      });

    // Preenche lista de atletas para o combobox com busca
    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas...`;
  });
});

// ====================================
// COMBOBOX DE ATLETAS COM BUSCA EM TEMPO REAL
// ====================================
inputAtleta.addEventListener("focus", () => {
  if (todosAtletas.length > 0) {
    exibirTodosAtletas();
    listaAtleta.classList.add("show");
  }
});

inputAtleta.addEventListener("input", filtrarAtletas);

inputAtleta.addEventListener("blur", () => {
  setTimeout(() => listaAtleta.classList.remove("show"), 200);
});

function exibirTodosAtletas() {
  listaAtleta.innerHTML = "";
  todosAtletas.forEach(nome => criarItemAtleta(nome));
}

function filtrarAtletas() {
  const termo = inputAtleta.value.toLowerCase().trim();
  listaAtleta.innerHTML = "";

  if (!termo) {
    exibirTodosAtletas();
    listaAtleta.classList.add("show");
    return;
  }

  const filtrados = todosAtletas.filter(nome =>
    nome.toLowerCase().includes(termo)
  );

  if (filtrados.length === 0) {
    listaAtleta.innerHTML = '<div class="combobox-item" style="color:#999; font-style:italic; padding:10px;">Nenhum atleta encontrado</div>';
  } else {
    filtrados.forEach(nome => criarItemAtleta(nome));
  }
  listaAtleta.classList.add("show");
}

function criarItemAtleta(nome) {
  const div = document.createElement("div");
  div.className = "combobox-item";
  div.textContent = nome;
  div.onclick = () => selecionarAtleta(nome);
  listaAtleta.appendChild(div);
}

function selecionarAtleta(nome) {
  atletaSelecionado = nome;
  inputAtleta.value = nome;
  labelAtletaSelecionado.textContent = `Selecionado: ${nome}`;
  listaAtleta.classList.remove("show");
}

function limparAtleta() {
  inputAtleta.value = "";
  labelAtletaSelecionado.textContent = "";
  atletaSelecionado = "";
  listaAtleta.classList.remove("show");
  todosAtletas = [];
  inputAtleta.placeholder = "Primeiro selecione ano e categoria";
}

// ====================================
// BOTÃO CARREGAR
// ====================================
btnCarregar.addEventListener("click", () => {
  const ano = selAno.value;
  const categoria = selCategoria.value;
  const equipeId = selEquipe.value;

  if (!ano || !categoria) {
    alert("Ano e Categoria são obrigatórios!");
    return;
  }

  listaAtletasDiv.innerHTML = "<p>Carregando...</p>";

  if (atletaSelecionado) {
    buscarHistoricoAtleta(atletaSelecionado);
  } else if (equipeId) {
    carregarAtletasDaEquipe(ano, categoria, equipeId);
  } else {
    carregarTodasEquipes(ano, categoria);
  }
});

// ====================================
// FUNÇÕES DE EXIBIÇÃO
// ====================================
function buscarHistoricoAtleta(nomeAtleta) {
  listaAtletasDiv.innerHTML = `<p>Buscando histórico de <strong>${nomeAtleta}</strong>...</p>`;

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a);
    const historico = {};

    anos.forEach(ano => {
      const categorias = data[ano] || {};
      Object.keys(categorias).forEach(cat => {
        const equipes = categorias[cat] || {};
        Object.values(equipes).forEach(eq => {
          if (!eq.atletas) return;
          eq.atletas.forEach(at => {
            if (at.nome && at.nome.trim().toLowerCase() === nomeAtleta.toLowerCase()) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({
                equipe: eq.equipe || "Não informado",
                categoria: cat,
                posicao: at.posicao || "-",
                nascimento: at.data_nascimento || "-"
              });
            }
          });
        });
      });
    });

    if (Object.keys(historico).length === 0) {
      listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nomeAtleta}</strong></p>`;
      return;
    }

    let html = `<div class="atletas-header"><h3>Histórico de ${nomeAtleta}</h3></div>`;
    anos.forEach(ano => {
      if (historico[ano]) {
        html += `<div class="ano-section"><h4>${ano}</h4>`;
        historico[ano].forEach(reg => {
          html += `
            <div class="atleta-card">
              <div class="atleta-info">
                <strong>${reg.equipe}</strong><br>
                <small>Categoria: ${reg.categoria} • Posição: ${reg.posicao}</small><br>
                <small>Nascimento: ${reg.nascimento}</small>
              </div>
            </div>`;
        });
        html += `</div>`;
      }
    });
    listaAtletasDiv.innerHTML = html;
  });
}

function carregarAtletasDaEquipe(ano, categoria, equipeId) {
  db.ref(`atletas/${ano}/${categoria}/${equipeId}`).once("value", snapshot => {
    const data = snapshot.val();
    if (!data || !data.atletas || data.atletas.length === 0) {
      listaAtletasDiv.innerHTML = "<p>Nenhum atleta encontrado nesta equipe.</p>";
      return;
    }
    exibirListaAtletas(data);
  });
}

function carregarTodasEquipes(ano, categoria) {
  db.ref(`atletas/${ano}/${categoria}`).once("value", snapshot => {
    const equipes = snapshot.val() || {};
    let html = `<div class="atletas-header"><h3>${ano} • ${categoria}</h3><p>${Object.keys(equipes).length} equipes</p></div>`;

    Object.values(equipes).forEach(eq => {
      if (eq.equipe && eq.atletas && eq.atletas.length > 0) {
        html += `<div class="ano-section"><h4>${eq.equipe} (${eq.atletas.length} atletas)</h4>`;
        eq.atletas.forEach((at, i) => {
          html += `
            <div class="atleta-card">
              <div class="atleta-numero">${at.numero || (i + 1)}</div>
              <div class="atleta-info">
                <strong>${at.nome || "Sem nome"}</strong><br>
                <small>Posição: ${at.posicao || "-"} • Nascimento: ${at.data_nascimento || "-"}</small>
              </div>
            </div>`;
        });
        html += `</div>`;
      }
    });

    listaAtletasDiv.innerHTML = html || "<p>Nenhum dado disponível.</p>";
  });
}

function exibirListaAtletas(data) {
  let html = `
    <div class="atletas-header">
      <h3>${data.equipe} • ${data.categoria} ${data.ano || ""}</h3>
      <p>Total: ${data.total_atletas || data.atletas.length} atletas</p>
    </div>`;

  data.atletas.forEach((at, i) => {
    html += `
      <div class="atleta-card">
        <div class="atleta-numero">${at.numero || (i + 1)}</div>
        <div class="atleta-info">
          <strong>${at.nome || "Sem nome"}</strong><br>
          <small>Posição: ${at.posicao || "-"} • Nascimento: ${at.data_nascimento || "-"}</small>
        </div>
      </div>`;
  });
  listaAtletasDiv.innerHTML = html;
}

// ====================================
// INICIALIZAÇÃO
// ====================================
document.addEventListener("DOMContentLoaded", carregarAnos);