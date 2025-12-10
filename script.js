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
const btnCarregar = document.getElementById("btn-carregar");
const listaAtletasDiv = document.getElementById("lista-atletas");

let atletaSelecionado = "";
let todosAtletas = [];

// ====================================
// SERVICE WORKER
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ====================================
// CARREGAR TODOS OS ATLETAS (uma única vez)
// ====================================
function carregarListaDeAtletas() {
  listaAtletasDiv.innerHTML = "<p>Carregando lista de atletas...</p>";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletasSet = new Set();

    Object.values(data).forEach(anoObj => {
      Object.values(anoObj).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            if (at.nome && at.nome.trim()) {
              atletasSet.add(at.nome.trim());
            }
          });
        });
      });
    });

    todosAtletas = Array.from(atletasSet).sort((a, b) => a.localeCompare(b));
    inputAtleta.placeholder = `Buscar entre ${todosAtletas.length} atletas cadastrados`;
    listaAtletasDiv.innerHTML = "<p>Digite o nome do atleta acima e clique em buscar.</p>";
  }).catch(err => {
    console.error(err);
    listaAtletasDiv.innerHTML = "<p style='color:red;'>Erro ao conectar com o banco de dados.</p>";
  });
}

// ====================================
// COMBOBOX COM BUSCA EM TEMPO REAL
// ====================================
inputAtleta.addEventListener("focus", abrirLista);
inputAtleta.addEventListener("input", filtrarLista);
inputAtleta.addEventListener("blur", () => setTimeout(() => listaAtleta.classList.remove("show"), 200));

function abrirLista() {
  if (todosAtletas.length > 0) {
    exibirLista(todosAtletas);
    listaAtleta.classList.add("show");
  }
}

function filtrarLista() {
  const termo = inputAtleta.value.toLowerCase().trim();
  const filtrados = todosAtletas.filter(nome => nome.toLowerCase().includes(termo));
  
  exibirLista(filtrados);
  listaAtleta.classList.add("show");
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

// ====================================
// BUSCAR HISTÓRICO COMPLETO
// ====================================
btnCarregar.addEventListener("click", () => {
  if (!atletaSelecionado) {
    alert("Por favor, selecione ou digite um atleta válido.");
    return;
  }

  listaAtletasDiv.innerHTML = `<p>Buscando histórico completo de <strong>${atletaSelecionado}</strong>...</p>`;

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a); // 2025 primeiro
    const historico = {};

    anos.forEach(ano => {
      Object.values(data[ano] || {}).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            if (at.nome && at.nome.trim().toLowerCase() === atletaSelecionado.toLowerCase()) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({
                equipe: eq.equipe || "Não informado",
                categoria: Object.keys(catObj).find(key => catObj[key] === eq) || "Não informado",
                posicao: at.posicao || "-",
                nascimento: at.data_nascimento || "-"
              });
            }
          });
        });
      });
    });

    if (Object.keys(historico).length === 0) {
      listaAtletasDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${atletaSelecionado}</strong>.</p>`;
      return;
    }

    let html = `<div class="atletas-header"><h3>Histórico Completo: ${atletaSelecionado}</h3></div>`;
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
});

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarListaDeAtletas);