// ====================================
// CONFIGURAÇÃO FIREBASE (substitua com seus dados)
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
const selAtleta = document.getElementById("filtro-atleta");
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
  }, err => {
    console.error("Erro ao carregar filtros:", err);
    alert("Erro ao carregar anos do Firebase.");
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
  }, err => {
    console.error("Erro ao carregar categorias:", err);
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
  }, err => {
    console.error("Erro ao carregar equipes:", err);
  });
});

// Função para buscar histórico do atleta
function buscarHistoricoAtleta(nome) {
  nome = nome.toLowerCase().trim();
  if (!nome) return;

  listaAtletasDiv.innerHTML = '<p>Carregando histórico...</p>';
  
  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const anos = Object.keys(data).sort((a, b) => b - a); // Ordem regressiva: 2025 primeiro
    
    const historico = {};
    
    anos.forEach(ano => {
      const categorias = data[ano] || {};
      Object.keys(categorias).forEach(cat => {
        const equipes = categorias[cat] || {};
        Object.keys(equipes).forEach(eqId => {
          const equipeData = equipes[eqId];
          const atletas = equipeData.atletas || [];
          atletas.forEach(at => {
            if (at.nome.toLowerCase().includes(nome)) {
              if (!historico[ano]) historico[ano] = [];
              historico[ano].push({
                equipe: equipeData.equipe,
                categoria: cat,
                posicao: at.posicao,
                data_nascimento: at.data_nascimento
              });
            }
          });
        });
      });
    });
    
    listaAtletasDiv.innerHTML = "";
    
    if (Object.keys(historico).length === 0) {
      listaAtletasDiv.innerHTML = "<p>Nenhum histórico encontrado para este atleta.</p>";
      return;
    }
    
    const header = document.createElement("div");
    header.className = "atletas-header";
    header.innerHTML = `<p><strong>Histórico de ${nome.toUpperCase()}</strong></p>`;
    listaAtletasDiv.appendChild(header);
    
    anos.forEach(ano => {
      if (historico[ano]) {
        const divAno = document.createElement("div");
        divAno.className = "ano-section";
        divAno.innerHTML = `<h3>${ano}</h3>`;
        
        historico[ano].forEach(entry => {
          const div = document.createElement("div");
          div.className = "atleta-card";
          div.innerHTML = `
            <div class="atleta-info">
              <strong>Equipe: ${entry.equipe}</strong><br>
              <small>Categoria: ${entry.categoria}</small><br>
              <small>Posição: ${entry.posicao || "-"}</small><br>
              <small>Nascimento: ${entry.data_nascimento || "-"}</small>
            </div>
          `;
          divAno.appendChild(div);
        });
        
        listaAtletasDiv.appendChild(divAno);
      }
    });
  }, err => {
    console.error("Erro ao buscar histórico:", err);
    listaAtletasDiv.innerHTML = "<p>Erro ao carregar dados do Firebase.</p>";
  });
}

btnCarregar.addEventListener("click", () => {
  const atletaNome = selAtleta.value.trim();
  
  if (atletaNome) {
    // Modo filtro por atleta: ignora outros filtros
    buscarHistoricoAtleta(atletaNome);
    return;
  }
  
  // Modo original: filtro por equipe
  const ano = selAno.value;
  const categoria = selCategoria.value;
  const equipeId = selEquipe.value;
  
  if (!ano || !categoria || !equipeId) {
    alert("Por favor, selecione ano, categoria e equipe (ou digite o nome do atleta).");
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
  }, err => {
    console.error("Erro ao carregar atletas:", err);
    listaAtletasDiv.innerHTML = "<p>Erro ao carregar dados do Firebase.</p>";
  });
});

// Inicializa na carga
document.addEventListener("DOMContentLoaded", carregarFiltros);