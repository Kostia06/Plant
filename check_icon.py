from PIL import Image
import sys
import os

path = "client\\src\\app\\icon.png"

try:
    if not os.path.exists(path):
        print("File not found.")
        sys.exit()

    with Image.open(path) as img:
        print(f"File Dimensions: {img.size}")
        bbox = img.getbbox()
        if bbox:
            print(f"Content Bounding Box: {bbox}")
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            print(f"Content Dimensions: {width}x{height}")
            if height > 0:
                print(f"Aspect Ratio: {width/height:.2f}")
        else:
            print("Image is fully transparent")
            
except Exception as e:
    print(f"Error: {e}")
