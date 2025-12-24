import requests
import json
import re

API_URL = "http://127.0.0.1:8000"
TEMP_DB_FILE = "training_temp.json"

# ==========================================
# 1. THE CHEAT SHEET (Force Corrections)
# ==========================================
# This dictionary maps common typos found in your text to the REAL Brand
AUTO_FIXES = {
    "samsang": "Samsung",
    "sam": "Samsung",
    "samsung": "Samsung",
    "iphone": "Apple",
    "apple": "Apple",
    "oneplus": "OnePlus",
    "1+": "OnePlus",
    "mi": "Xiaomi",
    "redmi": "Xiaomi",
    "xiaomi": "Xiaomi",
    "poco": "Xiaomi",
    "pixel": "Google",
    "google": "Google",
    "nothing": "Nothing",
    "cmf": "Nothing",
    "moto": "Motorola",
    "motorola": "Motorola",
    "realme": "Realme",
    "oppo": "Oppo",
    "vivo": "Vivo",
    "iqoo": "iQOO",
    "tecno": "Tecno",
    "asus": "Asus",
    "rog": "Asus",
    "honor": "Honor"
}

raw_dataset = """
samsang s26 ultra 8/128 100%condition 100%battery 8000
Iphone 15 pro max 256gb natural titanium 99% health full kit 115000
Oneplus 11r 16/256 gb black 100 cond 32k urgent sell
Google pixel 7 pro 12 128 gb hazel mint condition box cable 38999
S23 ultra 12/512 green 💚 100% condition warranty left 75000
iphone 13 128gb pink battery 88% face id ok 32000
nothing phone 2 12/256 white 🤍 full box bill 28000
Redmi note 13 pro plus 12 512 purple 100% cond 24500
vivo x100 pro 16/512 orange 🍊 kit available 65000
Iphone 14 plus 128 gb blue 92% bh clean piece 42000
Sam s24 ultra 12/256 titanium gray 100/100 condition 88000
moto edge 50 pro 12 256 lavender 💜 sealed pack 29999
iphone 11 64gb black 78 health display changed 15000
Poco f5 12/256 carbon black gaming beast 18500
iqoo 12 16/512 legend bmw edition white 100 cond 49999
iphone 15 128 gb black 🖤 100% batt cycle count 20 58000
Oneplus 9 pro 8/128 silver line on display 12000
Samsung z fold 5 12/512 icy blue warranty out 85000
iphone x 256 gb white battery service 10000
pixel 6a 6/128 charcoal body 90% scratchless 16000
realme gt 6t 8/256 silver fluid amoled 26000
S22 ultra 12/256 burgundy dot on screen 35000
iphone 12 mini 64gb blue 85 health small dent 18000
xiaomi 14 12/512 jade green leica cam 55000
oppo reno 10 pro 12/256 glossy purple bill box 22000
Sam s21 fe 8/128 olive 🫒 5g snapdragon 19000
iphone 15 plus 256 gb yellow 💛 100 batt activate today 72000
Nothing phone 1 8 256 black glyph working 16000
Samsung m34 6/128 blue 6000mah battery 11000
iphone 14 pro 256gb deep purple 🟣 90 bh mint 78000
Oneplus nord ce 3 8/128 grey clean condition 15000
pixel 8 8/128 rose 🌹 warranty available 45000
vivo v30 pro 12/512 andaman blue zeiss 36000
iphone se 2020 64 gb red 82 battery touch id ok 9500
S20 fe 5g 8/128 navy blue cloud mint 13000
iphone 13 pro 256 sierra blue 89 health true tone ok 58000
motorola razr 40 ultra 8/256 peach fuzz flip 45000
Realme 12 pro plus 8 256 navigator beige 23000
iphone 16 pro 128 desert titanium booking receipt 119900
S24 plus 12/256 violet 💜 100 condition 68000
google pixel 4xl 6/64 orange face unlock fail 7000
iphone xr 128 gb coral body 88% battery 14000
Asus rog 6 12/256 black gaming phone rgb light 32000
honor 90 8/256 diamond silver 200mp cam 21000
iphone 14 128gb midnight 🌑 95% health 100% condition 45000
samsang a55 8/256 awesome lilac sealed 33000
oneplus 12 16/512 flowy emerald 100 batt 58000
iphone 15 pro 1 tb natural titanium usa variant 95000
cmf phone 1 8/128 orange screw back 14500
tecno pova 5 pro 8/256 led back light 11000
"""

def clean_brand(raw_text, current_brand):
    """
    Checks the raw text for any known keywords and forces the Correct Brand.
    """
    first_word = raw_text.split()[0].lower()
    
    # 1. Check strict typos (e.g. 'samsang')
    if first_word in AUTO_FIXES:
        return AUTO_FIXES[first_word]
    
    # 2. Check strict mapping for Models starting with Model Name (S23 -> Samsung)
    if first_word.startswith("s2") or first_word.startswith("z"):
        return "Samsung"
        
    return current_brand

def run_training():
    lines = [line.strip() for line in raw_dataset.strip().split('\n') if line.strip()]
    training_log = []
    
    print(f"🚀 Starting Smart Training on {len(lines)} items...\n")

    for i, line in enumerate(lines):
        try:
            # 1. Get initial guess from API
            response = requests.post(f"{API_URL}/extract", json={"text": line})
            extracted_data = response.json()
            
            # 2. APPLY FIXES (The Critical Step)
            # Even if API says "Samsang", we overwrite it with "Samsung"
            # because we know "samsang" maps to "Samsung" in our cheat sheet.
            fixed_brand = clean_brand(line, extracted_data['brand'])
            extracted_data['brand'] = fixed_brand
            
            # 3. Send corrected data to be learned
            train_payload = {
                "raw_text": line,
                "corrected_data": extracted_data
            }
            
            requests.post(f"{API_URL}/train", json=train_payload)
            
            print(f"✅ Learned: {line.split()[0]} -> {fixed_brand}")
            
            training_log.append({
                "input": line, 
                "fixed_brand": fixed_brand,
                "data": extracted_data
            })

        except Exception as e:
            print(f"❌ Error on line {i}: {e}")

    with open(TEMP_DB_FILE, "w", encoding='utf-8') as f:
        json.dump(training_log, f, indent=4)
    print("\n💾 Done! Training data fixed and saved.")

if __name__ == "__main__":
    run_training()