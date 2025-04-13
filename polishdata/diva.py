from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pymongo import MongoClient
from PIL import Image 
from io import BytesIO
import requests
import colorsys
import time 
import datetime
client = MongoClient("my_uri")
db = client["Swatch"]
collection = db["Polish"]

COLOR_LIST = [
    "red", "orange", "yellow", "green", "blue", "purple", "pink",
    "brown", "gray", "black", "white", "nude", "neutral"
]
 
service = Service(executable_path=r"my_path")  
driver = webdriver.Chrome(service=service)

def classify_color(hex_code):
    if hex_code == "N/A":
        return "Nudes/Neutrals"  
    try:
        hex_code = hex_code.lstrip("#")
        r, g, b = tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))
        h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
        h = h * 360

        if h < 2: return "Red"
        elif 2 <= h < 39: return "Orange"
        elif 320 <= h < 340 and s > 0.3: return "Pink"
        if l > 0.85 and s < 0.15: return "White"
        if l < 0.15: return "Black"
        if s < 0.10 and 0.2 < l < 0.85: return "Gray"
        elif s < 0.18 and l >= 0.75: return "Nudes/Neutrals"
        if 300 <= h < 320: return "Pink"
        elif 40 <= h < 80: return "Yellow"
        elif 80 <= h < 170: return "Green"
        elif 170 <= h < 250: return "Blue"
        elif 250 <= h < 300: return "Purple"
        if 15 <= h <= 50 and s < 0.5 and l < 0.5: return "Brown"
        return "Brown"
    except:
        return "Unknown"

def get_image_from_url(url):
    try:
        response = requests.get(url, timeout=10)
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"Error fetching image: {e}")
        return None

def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])

def get_center_pixel_color(image):
    if not image: return (0, 0, 0)
    image = image.convert('RGB')
    center_x, center_y = image.size[0] // 2, image.size[1] // 2
    return image.getpixel((center_x, center_y))

def url_to_hex(image_url):
    if image_url == "N/A": return "N/A"
    try:
        image = get_image_from_url(image_url)
        if image:
            return rgb_to_hex(get_center_pixel_color(image))
        return "N/A"
    except Exception as e:
        print(f"Error extracting hex color: {e}")
        return "N/A"

def get_color_from_description(driver, hex_color):
    try:
        desc_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'product__description')))
        description = desc_element.text.lower()
        for color in COLOR_LIST:
            if color in description:
                return color.capitalize()
    except Exception as e:
        print(f"Error extracting description: {e}")
    return classify_color(hex_color)

def get_product_name(driver):
    try:
        product_header = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".product h1")))
        product_name = product_header.text.strip()
        
        product_name = product_name.replace(" - FINAL SALE", "")
         
        return product_name[:-4] if len(product_name) > 4 else product_name
    except Exception as e:
        print(f"Error extracting product name: {e}")
        return "Unknown Product"
 
all_links = set()
base_url = 'https://www.dndgel.com/collections/diva?page={}'

for page in range(1, 9):
    try:
        driver.get(base_url.format(page))
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".pi-product-item")))
        
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

        product_cards = driver.find_elements(By.CLASS_NAME, 'pi-product-item')
        for product in product_cards:
            try:
                link = product.find_element(By.CSS_SELECTOR, ".card__media a").get_attribute('href')
                if link and link not in all_links:
                    all_links.add(link)
                    print(f"Found product: {link}")
            except Exception as e:
                print(f"Error finding link: {e}")
    except Exception as e:
        print(f"Skipping page {page}: {e}")

# process each product
for link in all_links:
    try:
        driver.get(link)
        product_name = get_product_name(driver)
        
        # get product image
        try:
            img_src = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'product__media.media.media--transparent'))
                ).find_element(By.TAG_NAME, 'img').get_attribute('src')
        except:
            img_src = "N/A"

        # get hex color
        try:
            hex_image = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(@aria-label, 'Load image 2 in gallery view')]//img")))
            hex_url = hex_image.get_attribute('src')
            hex_color = url_to_hex(hex_url)
        except:
            hex_color = "N/A"

        color_category = get_color_from_description(driver, hex_color)
         
        document = {
            "brand": "DND",
            "name": product_name.title(),
            "picture": img_src,
            "color family": color_category,   
            "link": link,  
            "type": "LACQUER & GEL",
            "hex": hex_color,  
        }
 
    # *** inserting polish data ***     
    #    try:
    #       result = collection.insert_one(document) 
    #   except Exception as e:
    #      print(f"MongoDB insertion failed for {product_name}: {e}")

    except Exception as e:
        print(f"Error processing {link}: {e}")

driver.quit()