import re
import json
import os
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict, List
from difflib import get_close_matches

app = FastAPI(title="Smart Mobile Extractor v4")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "training_data.json")

initial_knowledge = {
    "brands": {"IPHONE": "Apple", "SAM": "Samsung", "PIXEL": "Google", "1+": "OnePlus"},
    "models": [],
    "corrections": {}
}

knowledge_base = initial_knowledge

def init_db():
    global knowledge_base
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                data = json.load(f)
                # Fix missing keys if migrating
                if "models" not in data: data["models"] = []
                if "brands" not in data: data["brands"] = initial_knowledge["brands"]
                if "corrections" not in data: data["corrections"] = {}
                knowledge_base = data
        except:
            save_brain()
    else:
        save_brain()

def save_brain():
    with open(DB_FILE, "w") as f:
        json.dump(knowledge_base, f, indent=4)

init_db()

# ==========================================
# 2. PARSER LOGIC
# ==========================================

class ListingParser:
    def __init__(self):
        self.common_ram = {4, 6, 8, 12, 16, 18, 24}
        self.common_storage = {32, 64, 128, 256, 512, 1024}

    def clean_text(self, text: str) -> str:
        text = re.sub(r'([/%])', r' \1 ', text)
        return text.strip()

    def detect_brand(self, first_word: str):
        clean = first_word.upper()
        if clean in knowledge_base["brands"]: return knowledge_base["brands"][clean]
        
        matches = get_close_matches(clean, knowledge_base["brands"].keys(), n=1, cutoff=0.7)
        return knowledge_base["brands"][matches[0]] if matches else "Unknown"

    def extract_brand_model(self, words: List[str]):
        brand = "Unknown"
        if words:
            brand = self.detect_brand(words[0])
            if brand == "Unknown": brand = words[0].title()

        model_tokens = []
        for i, w in enumerate(words[1:]):
            # STOP CONDITIONS
            w_up = w.upper()
            
            # 1. Explicit Specs (GB, %, /)
            if "GB" in w_up or "%" in w_up or re.search(r'\d+/\d+', w): break
            
            # 2. Numbers check
            if w.isdigit():
                val = int(w)
                if val > 50: break # Likely storage/price
                
                # CHECK NEXT WORD (The "8 256" Fix)
                # We are at words[1+i]. Look at words[1+i+1]
                next_idx = i + 2
                if next_idx < len(words):
                    next_w = words[next_idx]
                    
                    # If next word is a Storage Size (e.g. 256) -> STOP
                    if next_w.isdigit() and int(next_w) in self.common_storage:
                        # But wait! Is 'val' a valid RAM size? (e.g. 8)
                        if val in self.common_ram:
                            break
                    
                    # If next word is GB/RAM -> STOP
                    if next_w.upper() in ["GB", "RAM", "/", "TB"]:
                        break

            model_tokens.append(w)

        model = " ".join(model_tokens).title()
        
        # Apply Learning
        if knowledge_base["models"]:
            matches = get_close_matches(model, knowledge_base["models"], n=1, cutoff=0.6)
            if matches: model = matches[0]

        return brand, model

    def parse(self, raw_text: str):
        # Recall
        key = raw_text.strip().lower()
        if key in knowledge_base["corrections"]: return knowledge_base["corrections"][key]

        clean = self.clean_text(raw_text)
        words = clean.split()
        upper = clean.upper()

        brand, model = self.extract_brand_model(words)

        # --- EXTRACT SPECS (Improved) ---
        ram, storage = None, None
        
        # Priority 1: Slash (8/128)
        slash = re.search(r'(\d{1,2})\s?/\s?(\d{2,4})', upper)
        
        # Priority 2: Explicit GB (8GB 128GB)
        gbs = sorted([int(x) for x in re.findall(r'(\d+)\s?GB', upper)], reverse=True)

        # Priority 3: Loose Numbers (8 256) -> THE FIX
        loose_nums = [int(x) for x in re.findall(r'\b(\d+)\b', upper)]
        
        if slash:
            v1, v2 = int(slash.group(1)), int(slash.group(2))
            ram, storage = (v1, v2) if v1 < v2 else (v2, v1)
        elif gbs:
            storage = gbs[0]
            if len(gbs) > 1: ram = gbs[1]
        else:
            # Try to find a valid RAM+Storage pair in the loose numbers
            # We look for a pattern where a RAM-sized number is followed by a Storage-sized number
            for i in range(len(loose_nums) - 1):
                n1 = loose_nums[i]
                n2 = loose_nums[i+1]
                
                # Check if n1 is RAM (4-24) and n2 is Storage (32-1024)
                if n1 in self.common_ram and n2 in self.common_storage:
                    ram = n1
                    storage = n2
                    break
                # Reverse check (just in case "256 8")
                if n2 in self.common_ram and n1 in self.common_storage:
                    ram = n2
                    storage = n1
                    break

        # --- EXTRACT REST ---
        battery, condition, price = None, None, None
        
        batt = re.search(r'(\d{2,3})\s?%\s?(?:BAT|HEALTH|🔋)', upper)
        if batt: battery = int(batt.group(1))

        cond = re.search(r'(\d{2,3})\s?%\s?(?:COND|KIT)', upper)
        if cond: condition = int(cond.group(1))
        
        # Fallback Percentage
        if not battery and not condition:
            percents = [int(x) for x in re.findall(r'(\d{2,3})\s?%', upper)]
            for p in percents:
                if p==100 and not condition: condition=100
                elif p<100 and not battery: battery=p
        
        # Price (exclude RAM/Storage numbers we just found to avoid confusion)
        # Create a text string WITHOUT the found specs to search for price safely
        price_text = upper
        if ram: price_text = price_text.replace(str(ram), "", 1)
        if storage: price_text = price_text.replace(str(storage), "", 1)
        
        # Look for remaining big numbers
        nums = [int(x) for x in re.findall(r'\b\d{4,7}\b', price_text)]
        if nums: price = max(nums)

        return {
            "raw_text": raw_text,
            "brand": brand,
            "model": model,
            "ram_gb": ram,
            "storage_gb": storage,
            "battery_percent": battery,
            "condition_percent": condition,
            "price": price
        }

parser = ListingParser()

# ==========================================
# 3. ENDPOINTS
# ==========================================

class InputData(BaseModel): text: str
class TrainingData(BaseModel): raw_text: str; corrected_data: Dict

@app.post("/extract")
def extract_endpoint(data: InputData): return parser.parse(data.text)

@app.post("/train")
def train_endpoint(data: TrainingData):
    key = data.raw_text.strip().lower()
    knowledge_base["corrections"][key] = data.corrected_data
    
    brand = data.corrected_data.get("brand")
    if brand and brand != "Unknown":
        knowledge_base["brands"][data.raw_text.split()[0].upper()] = brand
        knowledge_base["brands"][brand.upper()] = brand
        
    model = data.corrected_data.get("model")
    if model and model not in knowledge_base["models"]:
        knowledge_base["models"].append(model)
        
    save_brain()
    return {"status": "Learned"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)