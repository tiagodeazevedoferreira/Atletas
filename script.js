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

// Elementos da aba progressão
const inputProgressaoAtleta = document.getElementById("filtro-progressao-atleta");
const listaProgressaoAtleta = document.getElementById("filtro-progressao-lista");
const labelProgressaoAtletaSel = document.getElementById("progressao-atleta-selecionado");
const listaProgressaoDiv = document.getElementById("lista-progressao");
const progressaoInfo = document.getElementById("progressao-info");
const btnLimparProgressao = document.getElementById("btn-limpar-progressao");

// Elementos da aba fieis
const inputFieisAtleta = document.getElementById("filtro-fieis-atleta");
const listaFieisAtleta = document.getElementById("filtro-fieis-lista");
const labelFieisAtletaSel = document.getElementById("fieis-atleta-selecionado");
const listaFieisDiv = document.getElementById("lista-fieis");
const fieisInfo = document.getElementById("fieis-info");
const btnLimparFieis = document.getElementById("btn-limpar-fieis");

// Estado geral
let atletaSelecionado = "";
let equipeSelecionadaApelido = "";
let equipeSelecionadaCompleto = "";
let todosAtletas = [];
let timesApelidosMap = {};
let apelidosParaTimesMap = {};

// Estado para navegação "Voltar"
let ultimoResultadoEquipeHTML = null;

// Estado da progressão
let atletasProgressao = [];
let atletaProgressaoSelecionado = "";

// Estado da aba fieis
let atletasFieis = [];
let atletaFieisSelecionado = "";

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
// CARREGAR DADOS INICIAIS (ABA BUSCA)
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
// EVENTOS PRINCIPAIS (ABA BUSCA)
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

  if (inputProgressaoAtleta) {
    inputProgressaoAtleta.value = "";
    labelProgressaoAtletaSel.textContent = "";
    atletaProgressaoSelecionado = "";
    listaProgressaoAtleta.classList.remove("show");
    if (atletasProgressao.length > 0) renderizarListaProgressao();
  }
  if (inputFieisAtleta) {
    inputFieisAtleta.value = "";
    labelFieisAtletaSel.textContent = "";
    atletaFieisSelecionado = "";
    listaFieisAtleta.classList.remove("show");
    if (atletasFieis.length > 0) renderizarListaFieis();
  }
}

// ====================================
// FUNÇÕES GERAIS DE BUSCA E RENDER
// ====================================
function formatarCategoria(key) {
  const map = { "sub7": "Sub-7", "sub07": "Sub-7", "sub8": "Sub-8", "sub08": "Sub-8", "sub9": "Sub-9", "sub09": "Sub-9" };
  return map[key.toLowerCase()] || key.toUpperCase();
}

function buscarHistoricoAtleta(nome, targetDiv = listaAtletasDiv) {
  targetDiv.innerHTML = "<p>Carregando histórico...</p>";
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
    renderizarHistoricoAtleta(nome, historico, targetDiv);
  });
}

function renderizarHistoricoAtleta(nome, historico, targetDiv) {
  if (Object.keys(historico).length === 0) {
    targetDiv.innerHTML = `<p>Nenhum registro encontrado para <strong>${nome}</strong>.</p>`;
    return;
  }

  let html = `<div class="atletas-header"><h3>Histórico: ${nome}</h3></div>`;

  if (targetDiv === listaAtletasDiv && ultimoResultadoEquipeHTML) {
    html += `<button class="btn-voltar" id="btn-voltar-equipe-tmp">← Voltar à equipe</button>`;
  }

  Object.keys(historico).sort((a,b) => b-a).forEach(ano => {
    const regs = historico[ano];
    html += `<div class="ano-section"><h4>${ano} (${regs.length} registro${regs.length > 1 ? "s" : ""})</h4>`;
    regs.forEach(r => {
      html += `<div class="atleta-card"><div class="atleta-info"><strong>${r.equipe}</strong> <span class="categoria-tag">${r.categoria}</span></div></div>`;
    });
    html += `</div>`;
  });

  targetDiv.innerHTML = html;

  const btnVoltar = document.getElementById("btn-voltar-equipe-tmp");
  if (btnVoltar) {
    btnVoltar.onclick = () => {
      listaAtletasDiv.innerHTML = ultimoResultadoEquipeHTML;
      aplicarEventosCliqueAtletas();
    };
  }
}

function buscarHistoricoEquipe(nomeCompleto) {
  listaAtletasDiv.innerHTML = "<p>Carregando...</p>";
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

function renderizarHistoricoEquipe(apelido, historico) {
  let html = `<div class="atletas-header"><h3>Histórico da equipe: ${apelido}</h3></div>`;

  Object.keys(historico).sort((a,b) => b-a).forEach(ano => {
    const regs = historico[ano];
    // Ordenação alfabética por nome do atleta
    regs.sort((a, b) => a.nome.localeCompare(b.nome));

    html += `<div class="ano-section"><h4>${ano} (${regs.length} atleta${regs.length > 1 ? "s" : ""})</h4>`;
    regs.forEach(r => {
      html += `<div class="atleta-card clickable-atleta" data-nome="${r.nome}"><div class="atleta-info"><strong>${r.nome}</strong> <span class="categoria-tag">${r.categoria}</span></div></div>`;
    });
    html += `</div>`;
  });

  ultimoResultadoEquipeHTML = html;
  listaAtletasDiv.innerHTML = html;
  aplicarEventosCliqueAtletas();
}

function aplicarEventosCliqueAtletas() {
  document.querySelectorAll(".clickable-atleta").forEach(el => {
    el.style.cursor = "pointer";
    el.onclick = () => {
      const nomeAtleta = el.getAttribute("data-nome");
      buscarHistoricoAtleta(nomeAtleta);
    };
  });
}

function buscarAtletaNaEquipe(atletaNome, equipeCompleto) {
  listaAtletasDiv.innerHTML = "<p>Carregando...</p>";
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
    renderizarHistoricoAtleta(atletaNome, historico, listaAtletasDiv);
  });
}

// Combobox aba busca
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

// ====================================
// NAVEGAÇÃO POR ABAS
// ====================================
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const aba = btn.dataset.aba;
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    abaContents.forEach(content => content.classList.remove("active"));
    document.getElementById(`aba-${aba}`).classList.add("active");

    if (aba === "progressao") carregarProgressaoSub7();
    else if (aba === "fieis") carregarAtletasFieis();
  });
});

// ====================================
// ABA PROGRESSÃO SUB7 → 2025
// ====================================
function carregarProgressaoSub7() {
  if (atletasProgressao.length > 0) {
    renderizarListaProgressao();
    return;
  }

  listaProgressaoDiv.innerHTML = "<p>Carregando dados da progressão...</p>";
  progressaoInfo.textContent = "Lista em ordem alfabética • Carregando...";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const sub7_2022 = new Set();
    const em_2025 = new Set();

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

    atletasProgressao = [...new Set([...sub7_2022].filter(n => em_2025.has(n)))].sort((a, b) => a.localeCompare(b));

    if (atletasProgressao.length === 0) {
      progressaoInfo.textContent = "";
      listaProgressaoDiv.innerHTML = "<p>Nenhum atleta encontrado com essa progressão.</p>";
      return;
    }

    progressaoInfo.textContent = `Lista em ordem alfabética • ${atletasProgressao.length} atleta(s) encontrado(s)`;
    configurarComboboxProgressao();
    renderizarListaProgressao();
  });
}

function configurarComboboxProgressao() {
  inputProgressaoAtleta.addEventListener("focus", () => exibirListaProgressao(atletasProgressao));
  inputProgressaoAtleta.addEventListener("input", () => filtrarListaProgressao(inputProgressaoAtleta.value.trim()));
  inputProgressaoAtleta.addEventListener("blur", () => setTimeout(() => listaProgressaoAtleta.classList.remove("show"), 200));

  btnLimparProgressao.addEventListener("click", () => {
    inputProgressaoAtleta.value = "";
    labelProgressaoAtletaSel.textContent = "";
    atletaProgressaoSelecionado = "";
    listaProgressaoAtleta.classList.remove("show");
    renderizarListaProgressao();
  });

  function exibirListaProgressao(lista) {
    listaProgressaoAtleta.innerHTML = "";
    if (lista.length === 0) {
      listaProgressaoAtleta.innerHTML = '<div class="combobox-item" style="padding:12px;color:#999;">Nenhum atleta encontrado</div>';
      return;
    }
    lista.forEach(nome => {
      const item = document.createElement("div");
      item.className = "combobox-item";
      item.textContent = nome;
      item.onclick = () => {
        atletaProgressaoSelecionado = nome;
        inputProgressaoAtleta.value = nome;
        labelProgressaoAtletaSel.textContent = `Selecionado: ${nome}`;
        listaProgressaoAtleta.classList.remove("show");
        buscarHistoricoAtleta(nome, listaProgressaoDiv);
      };
      listaProgressaoAtleta.appendChild(item);
    });
    listaProgressaoAtleta.classList.add("show");
  }

  function filtrarListaProgressao(termo) {
    if (!termo) return exibirListaProgressao(atletasProgressao);
    const filtrados = atletasProgressao.filter(n => n.toLowerCase().includes(termo.toLowerCase()));
    exibirListaProgressao(filtrados);
  }
}

function renderizarListaProgressao() {
  if (atletaProgressaoSelecionado) return;

  let html = "";
  atletasProgressao.forEach(nome => {
    html += `<div class="progressao-item">
      <div style="cursor:pointer;" onclick="buscarHistoricoAtleta('${nome.replace(/'/g, "\\'")}', listaProgressaoDiv)">
        <strong>${nome}</strong>
      </div>
    </div>`;
  });
  listaProgressaoDiv.innerHTML = html;
}

// ====================================
// ABA FIEIS
// ====================================
function carregarAtletasFieis() {
  if (atletasFieis.length > 0) {
    renderizarListaFieis();
    return;
  }

  listaFieisDiv.innerHTML = "<p>Carregando dados...</p>";
  fieisInfo.textContent = "Lista em ordem alfabética • Carregando...";

  db.ref("atletas").once("value", snapshot => {
    const data = snapshot.val() || {};
    const atletaEquipeMap = {};
    const atletaAnosMap = {};
    const ativos2025 = new Set();

    if (data["2025"]) {
      Object.values(data["2025"]).forEach(catObj => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            const nome = at.nome?.trim();
            if (nome) ativos2025.add(nome);
          });
        });
      });
    }

    Object.entries(data).forEach(([ano, anoObj]) => {
      Object.entries(anoObj).forEach(([, catObj]) => {
        Object.values(catObj).forEach(eq => {
          (eq.atletas || []).forEach(at => {
            const nome = at.nome?.trim();
            if (nome && eq.equipe) {
              if (!atletaEquipeMap[nome]) {
                atletaEquipeMap[nome] = new Set();
                atletaAnosMap[nome] = new Set();
              }
              atletaEquipeMap[nome].add(eq.equipe.trim());
              atletaAnosMap[nome].add(ano);
            }
          });
        });
      });
    });

    const fieis = [];
    Object.entries(atletaEquipeMap).forEach(([nome, equipes]) => {
      if (equipes.size === 1 && ativos2025.has(nome)) {
        const equipeCompleta = [...equipes][0];
        const apelido = timesApelidosMap[equipeCompleta] || equipeCompleta;
        const anosJogados = atletaAnosMap[nome].size;
        fieis.push({ nome, equipe: apelido, anosJogados });
      }
    });

    atletasFieis = fieis.sort((a, b) => a.nome.localeCompare(b.nome));

    if (atletasFieis.length === 0) {
      fieisInfo.textContent = "";
      listaFieisDiv.innerHTML = "<p>Nenhum atleta fiel ativo em 2025 encontrado.</p>";
      return;
    }

    fieisInfo.textContent = `Lista em ordem alfabética • ${atletasFieis.length} atleta(s) fiel(is) e ativo(s) em 2025`;
    configurarComboboxFieis();
    renderizarListaFieis();
  });
}

function configurarComboboxFieis() {
  inputFieisAtleta.addEventListener("focus", () => exibirListaFieis(atletasFieis.map(f => f.nome)));
  inputFieisAtleta.addEventListener("input", () => filtrarListaFieis(inputFieisAtleta.value.trim()));
  inputFieisAtleta.addEventListener("blur", () => setTimeout(() => listaFieisAtleta.classList.remove("show"), 200));

  btnLimparFieis.addEventListener("click", () => {
    inputFieisAtleta.value = "";
    labelFieisAtletaSel.textContent = "";
    atletaFieisSelecionado = "";
    listaFieisAtleta.classList.remove("show");
    renderizarListaFieis();
  });

  function exibirListaFieis(lista) {
    listaFieisAtleta.innerHTML = "";
    if (lista.length === 0) {
      listaFieisAtleta.innerHTML = '<div class="combobox-item" style="padding:12px;color:#999;">Nenhum atleta encontrado</div>';
      return;
    }
    lista.forEach(nome => {
      const item = document.createElement("div");
      item.className = "combobox-item";
      item.textContent = nome;
      item.onclick = () => {
        atletaFieisSelecionado = nome;
        inputFieisAtleta.value = nome;
        labelFieisAtletaSel.textContent = `Selecionado: ${nome}`;
        listaFieisAtleta.classList.remove("show");
        renderizarListaFieis();
      };
      listaFieisAtleta.appendChild(item);
    });
    listaFieisAtleta.classList.add("show");
  }

  function filtrarListaFieis(termo) {
    if (!termo) return exibirListaFieis(atletasFieis.map(f => f.nome));
    const filtrados = atletasFieis.filter(f => f.nome.toLowerCase().includes(termo.toLowerCase())).map(f => f.nome);
    exibirListaFieis(filtrados);
  }
}

function renderizarListaFieis() {
  let listaParaMostrar = atletasFieis;

  if (atletaFieisSelecionado) {
    listaParaMostrar = atletasFieis.filter(f => f.nome === atletaFieisSelecionado);
  }

  if (listaParaMostrar.length === 0) {
    listaFieisDiv.innerHTML = "<p>Nenhum atleta corresponde ao filtro.</p>";
    return;
  }

  let html = "";
  listaParaMostrar.forEach(f => {
    const anosTexto = f.anosJogados === 1 ? "1 ano" : `${f.anosJogados} anos`;
    html += `<div class="progressao-item">
      <div style="cursor:pointer;" onclick="buscarHistoricoAtleta('${f.nome.replace(/'/g, "\\'")}', listaAtletasDiv)">
        <strong>${f.nome}</strong> <small>— Sempre no ${f.equipe} (${anosTexto})</small>
      </div>
    </div>`;
  });

  listaFieisDiv.innerHTML = html;
}

// ====================================
// INICIAR
// ====================================
document.addEventListener("DOMContentLoaded", carregarDadosIniciais);