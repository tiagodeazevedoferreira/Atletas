// ====================================
// CONFIGURAÇÃO FIREBASE (substitua com seus dados)
// ====================================
const firebaseConfig = {
  apiKey: "AIzaSyCleLlq8sLVD0mrRjvMqLztZH7-Yqd9-eA",
  authDomain: "fpfs-atletas-web.firebaseapp.com",
  databaseURL: "https://fpfs-atletas-web-default-rtdb.firebaseio.com",
  projectId: "fpfs-atletas-web",
  storageBucket: "fpfs-atletas-web.firebaseiostorage.app",
  messagingSenderId: "634040999870",
  appId: "1:634040999870:web:3d9e0d56d6dbc746aae3ef"
}
;

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ====================================
// REGISTRO DO SERVICE WORKER
// ====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(reg => console.log("✓ Service Worker registrado"))
      .catch(err => console.error("✗ Erro ao registrar SW:", err));
  });
}

// ====================================
// ELEMENTOS DA UI
// ====================================
const selAno = document.getElementById("filtro-ano");
const selCategoria = document.getElementById("filtro-categoria");
const selEquipe = document.getElementById("filtro-equipe");
const btnCarregar = document.getElementById("btn-carregar");
const listaAtletasDiv = document.getElementById("lista-atletas");

// ====================================
// FUNÇÕES DE FILTRO
// ====================================

function carregarFiltros() {
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort();
    
    selAno.innerHTML = '<option value="">Selecione</option>';
    anos.forEach(ano => {
      selAno.appendChild(new Option(ano, ano));
    });
    
    selCategoria.innerHTML = '<option value="">Selecione</option>';
    selEquipe.innerHTML = '<option value="">Selecione</option>';
  });
}

selAno.addEventListener("change", () => {
  const ano = selAno.value;
  if (!ano) return;

  db.ref(`atletas/${ano}`).once("value", snapshot => {
    const data = snapshot.val() || {};
    const categorias = Object.keys(data).sort();
    
    selCategoria.innerHTML = '<option value="">Selecione</option>';
    categorias.forEach(cat => {
      selCategoria.appendChild(new Option(cat, cat));
    });
    
    selEquipe.innerHTML = '<option value="">Selecione</option>';
  });
});

selCategoria.addEventListener("change", () => {
  const ano = selAno.value;
  const categoria = selCategoria.value;
  if (!ano || !categoria) return;

  db.ref(`atletas/${ano}/${categoria}`).once("value", snapshot => {
    const data = snapshot.val() || {};
    const equipes = Object.values(data).map(e => ({
      id: e.equipe_id,
      nome: e.equipe
    }));
    
    selEquipe.innerHTML = '<option value="">Selecione</option>';
    equipes.forEach(eq => {
      selEquipe.appendChild(new Option(eq.nome, eq.id));
    });
  });
});

btnCarregar.addEventListener("click", () => {
  const ano = selAno.value;
  const categoria = selCategoria.value;
  const equipeId = selEquipe.value;
  
  if (!ano || !categoria || !equipeId) {
    alert("Por favor, selecione ano, categoria e equipe.");
    return;
  }

  listaAtletasDiv.innerHTML = '<p>Carregando...</p>';
  
  db.ref(`atletas/${ano}/${categoria}/${equipeId}`).once("value", snapshot => {
    const data = snapshot.val();
    
    if (!data || !data.atletas) {
      listaAtletasDiv.innerHTML = "<p>Nenhum atleta encontrado.</p>";
      return;
    }

    const atletas = data.atletas;
    listaAtletasDiv.innerHTML = "";
    
    const header = document.createElement("div");
    header.className = "atletas-header";
    header.innerHTML = `
      <p><strong>Equipe:</strong> ${data.equipe} | 
         <strong>Total:</strong> ${data.total_atletas || atletas.length} atletas</p>
    `;
    listaAtletasDiv.appendChild(header);
    
    atletas.forEach((at, idx) => {
      const div = document.createElement("div");
      div.className = "atleta-card";
      div.innerHTML = `
        <div class="atleta-numero">${at.numero || idx + 1}</div>
        <div class="atleta-info">
          <strong>${at.nome || "Sem nome"}</strong><br>
          <small>Posição: ${at.posicao || "-"}</small><br>
          <small>Nascimento: ${at.data_nascimento || "-"}</small>
        </div>
      `;
      listaAtletasDiv.appendChild(div);
    });
  });
});

// Inicializa na carga
document.addEventListener("DOMContentLoaded", carregarFiltros);
