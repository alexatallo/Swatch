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
        # Verify image exists in request
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files['image']
        
        # Verify coordinates exist
        if 'x' not in request.form or 'y' not in request.form:
            return jsonify({"error": "No coordinates provided"}), 400
            
        x = int(request.form['x'])
        y = int(request.form['y'])
        
        # Process image
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        pixels = np.array(img)
        
        # Verify coordinates are within bounds
        if y >= pixels.shape[0] or x >= pixels.shape[1]:
            return jsonify({"error": "Coordinates out of bounds"}), 400
            
        # Get RGB values and convert to native Python int
        r, g, b = map(int, pixels[y, x][:3])  # Convert numpy uint8 to regular int
        
        return jsonify({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "rgb": [r, g, b]  # Now contains regular integers
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)