import time
import pandas as pd
import firebase_admin
from firebase_admin import credentials, db

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ====================================
# CONFIGURAÇÕES - ATUALIZE AQUI
# ====================================

# Caminho do arquivo JSON de credenciais (baixado do Firebase)
FIREBASE_CREDENTIALS_PATH = "credentials.json"

# URL do seu Realtime Database
FIREBASE_DB_URL = "https://fpfs-atletas-web-default-rtdb.firebaseio.com/"

# Caminho do arquivo Excel com os links
EXCEL_PATH = "Links.xlsx"

# ====================================
# INICIALIZAÇÃO DO FIREBASE
# ====================================

def init_firebase():
    """Inicializa a conexão com Firebase"""
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred, {
            "databaseURL": FIREBASE_DB_URL
        })
        print("✓ Firebase inicializado com sucesso!")
    except FileNotFoundError:
        print(f"✗ Erro: Arquivo '{FIREBASE_CREDENTIALS_PATH}' não encontrado!")
        print("  Baixe o arquivo JSON da conta de serviço no Firebase Console")
        exit(1)
    except Exception as e:
        print(f"✗ Erro ao inicializar Firebase: {e}")
        exit(1)

# ====================================
# INICIALIZAÇÃO DO SELENIUM
# ====================================

def init_driver():
    """Inicializa o navegador Chrome"""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver

# ====================================
# CARREGAR EXCEL
# ====================================

def load_links():
    """Lê o arquivo Excel com os links"""
    try:
        df = pd.read_excel(EXCEL_PATH)
        print(f"✓ {len(df)} linhas lidas de {EXCEL_PATH}")
        print(f"  Colunas encontradas: {list(df.columns)}")  # Log para debug
        return df
    except FileNotFoundError:
        print(f"✗ Erro: Arquivo '{EXCEL_PATH}' não encontrado!")
        exit(1)
    except Exception as e:
        print(f"✗ Erro ao ler Excel: {e}")
        exit(1)

# ====================================
# WEBSCRAPING
# ====================================

def scrape_atletas_from_page(driver, url):
    """
    Faz webscraping de uma página de atletas
    
    Ajuste os seletores CSS conforme o HTML real da página
    """
    try:
        print(f"  → Acessando: {url}")
        driver.get(url)
        
        # Aguarda o carregamento da tabela (ajustado para 30s)
        table = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )
        
        rows = table.find_elements(By.TAG_NAME, "tr")
        print(f"    → Encontradas {len(rows)} linhas na tabela")  # Log para debug
        atletas = []
        
        for i, row in enumerate(rows[1:], 1):  # Pula cabeçalho
            cols = row.find_elements(By.TAG_NAME, "td")
            if len(cols) < 2:  # Pula linhas inválidas (menos de 2 colunas)
                print(f"      - Linha {i} pulada: menos de 2 colunas")
                continue
            
            texts = [c.text.strip() for c in cols]
            
            atleta = {
                "numero": texts[0] if len(texts) > 0 else "",
                "nome": texts[1] if len(texts) > 1 else "",
                "apelido": texts[2] if len(texts) > 2 else "",
            }
            atletas.append(atleta)
        
        print(f"    → {len(atletas)} atletas encontrados")
        return atletas
        
    except Exception as e:
        print(f"    ✗ Erro ao fazer scraping: {e}")
        return []

# ====================================
# GRAVAR NO FIREBASE
# ====================================

def save_atletas_to_firebase(ano, categoria, divisao, equipe, equipe_id, atletas):
    """Grava dados dos atletas no Firebase"""
    try:
        root = db.reference("atletas")
        path = f"{ano}/{categoria}/{equipe_id}"
        
        payload = {
            "ano": int(ano) if str(ano).isdigit() else ano,
            "categoria": str(categoria),
            "divisao": str(divisao),
            "equipe": str(equipe),
            "equipe_id": int(equipe_id) if str(equipe_id).isdigit() else equipe_id,
            "atletas": atletas,
            "timestamp": int(time.time()),
            "total_atletas": len(atletas)
        }
        
        root.child(path).set(payload)
        print(f"    ✓ Gravado no Firebase: {len(atletas)} atletas")
        
    except Exception as e:
        print(f"    ✗ Erro ao gravar no Firebase: {e}")

# ====================================
# FLUXO PRINCIPAL
# ====================================

def main():
    print("\n" + "="*60)
    print("  FPFS ATLETAS - WEBSCRAPER")
    print("="*60 + "\n")
    
    # Inicializa Firebase
    init_firebase()
    
    # Inicializa Selenium
    driver = init_driver()
    
    try:
        # Carrega links do Excel
        df = load_links()
        
        print(f"\n▶ Processando {len(df)} equipes...\n")
        
        sucesso = 0
        erro = 0
        
        for idx, row in df.iterrows():
            print(f"[{idx+1}/{len(df)}]", end=" ")
            
            ano = row.get("Ano")
            categoria = row.get("Categoria")
            divisao = row.get("Divisão", "")
            equipe = row.get("Nome da Equipe", "")
            equipe_id = row.get("ID")
            url = row.get("URLdaPáginadeAtletas", "")  # Coluna corrigida!
            
            if not url or pd.isna(url):
                print(f"✗ {equipe} - URL vazia")
                erro += 1
                continue
            
            print(f"Equipe: {equipe} ({equipe_id})")
            
            try:
                atletas = scrape_atletas_from_page(driver, str(url))
                
                if atletas:
                    save_atletas_to_firebase(ano, categoria, divisao, equipe, equipe_id, atletas)
                    sucesso += 1
                else:
                    print(f"    ⚠ Nenhum atleta encontrado")
                    erro += 1
                    
            except Exception as e:
                print(f"    ✗ Erro: {e}")
                erro += 1
            
            # Aguarda 3 segundos entre requisições (respeita servidor)
            time.sleep(3)
        
        print(f"\n" + "="*60)
        print(f"✓ Sucesso: {sucesso} | ✗ Erro: {erro}")
        print("="*60 + "\n")
        
    finally:
        driver.quit()
        print("Scraper finalizado.")

if __name__ == "__main__":
    main()