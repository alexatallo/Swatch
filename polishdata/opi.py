from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pymongo import MongoClient
import requests
import numpy as np
import time
from concurrent.futures import ThreadPoolExecutor
from sklearn.cluster import KMeans
from PIL import Image
from io import BytesIO

client = MongoClient("my_uri") 
db = client["Swatch"]  
collection = db["Polish"] 

service = Service(executable_path=r"my_path")   
driver = webdriver.Chrome(service=service)
 
base_url = 'https://www.opi.com/collections/nail-colors?page={}&product-type=Nail%20Lacquer--Gel%20Nail%20Polish--Infinite%20Shine--Natural%20Origin%20Nail%20Lacquer--RapiDry%E2%84%A2'
 
products = []

def get_image_from_url(url):
    response = requests.get(url)
    image = Image.open(BytesIO(response.content))
    return image

def get_dominant_color(image, k=1):
    image = image.convert('RGB')
    image = image.resize((image.width // 10, image.height // 10))
    pixels = np.array(image).reshape((-1, 3))
    kmeans = KMeans(n_clusters=k, n_init=10)
    kmeans.fit(pixels)
    dominant_color = kmeans.cluster_centers_[0]
    return tuple(int(c) for c in dominant_color)

def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])

def url_to_hex(image_url):
    try:
        image = get_image_from_url(image_url)
        dominant_color = get_dominant_color(image)
        return rgb_to_hex(dominant_color)
    except Exception:
        return "N/A"
 
for page in range(1, 37):
    url = base_url.format(page)
    driver.get(url)
    print(f"\nScraping page {page}...\n" + "=" * 80)
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'ais-InfiniteHits-list'))
        )
    except Exception:
        print(f"Skipping page {page}, no products found.")
        continue

    ol_tag = driver.find_element(By.CLASS_NAME, 'ais-InfiniteHits-list')
    product_cards = ol_tag.find_elements(By.CLASS_NAME, 'col.xs2.l3')
    
    for product in product_cards:
        try:
            image_wrapper = product.find_element(By.CLASS_NAME, 'productCard__imageWrapper')
            image = image_wrapper.find_element(By.TAG_NAME, 'img')
            image_url = image.get_attribute('src')
        except Exception:
            image_url = "N/A"
        
        try:
            a_tag = product.find_element(By.TAG_NAME, 'a')
            colorfamily = a_tag.get_attribute('data-color-family-primary') or "Unknown"
            finish = a_tag.get_attribute('data-color-finish') or "Unknown"
            link = a_tag.get_attribute('href') or "Unknown"
            product_name = a_tag.find_element(By.CLASS_NAME, 'productCard__title').text.strip()
        except Exception:
            colorfamily = "N/A"
            finish = "N/A"
            link = "N/A"
            product_name = "N/A"
        
        products.append({
            "name": product_name,
            "picture": image_url,
            "color family": colorfamily,
            "link": link,
            "finish": finish,
            "hex": "N/A"
        })
        
        time.sleep(1)  
print(f"\nTotal products scraped: {len(products)}")
 
driver.quit()

# process hex colors  
def process_image_color(product):
    if product["picture"] != "N/A":
        product["hex"] = url_to_hex(product["picture"])
    return product

# *** inserting polish data ***
# for product in products: 
    #    try:
    #       result = collection.insert_one(product) 
    #   except Exception as e:
    #      print(f"MongoDB insertion failed for {product_name}: {e}")
