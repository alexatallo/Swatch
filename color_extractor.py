from flask import Flask, request, jsonify
from PIL import Image
import io
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/extract-color', methods=['POST'])
def extract_color():
    try:
        
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files['image']
        

        if 'x' not in request.form or 'y' not in request.form:
            return jsonify({"error": "No coordinates provided"}), 400
            
        x = int(request.form['x'])
        y = int(request.form['y'])
        
        
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        pixels = np.array(img)
        
        
        if y >= pixels.shape[0] or x >= pixels.shape[1]:
            return jsonify({"error": "Coordinates out of bounds"}), 400
            
        
        r, g, b = map(int, pixels[y, x][:3])  
        
        return jsonify({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "rgb": [r, g, b]  
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)