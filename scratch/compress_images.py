import os
import glob
from PIL import Image

def compress_images():
    dir_path = "public/photos/engagement"
    # Match jpg, jpeg, png, both uppercase and lowercase
    extensions = ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(dir_path, ext)))
    
    # Remove duplicates
    files = list(set(files))
    
    print(f"Found {len(files)} images to compress in {dir_path}.")
    
    total_before = 0
    total_after = 0
    
    for idx, f in enumerate(files):
        try:
            size_before = os.path.getsize(f)
            total_before += size_before
            
            img = Image.open(f)
            
            # Handle orientation EXIF tag if present
            try:
                # Rotate image based on EXIF tag 274 (Orientation) if it exists
                exif = img._getexif()
                if exif is not None and 274 in exif:
                    orientation = exif[274]
                    if orientation == 3:
                        img = img.rotate(180, expand=True)
                    elif orientation == 6:
                        img = img.rotate(270, expand=True)
                    elif orientation == 8:
                        img = img.rotate(90, expand=True)
            except Exception:
                pass # Fail silently if EXIF read fails
                
            # Convert RGBA to RGB (JPEGs do not support transparency)
            if img.mode in ('RGBA', 'LA'):
                img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Max width/height 1600px for web optimization
            max_size = 1600
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Save back, overwriting the original file
            img.save(f, "JPEG", quality=80, optimize=True)
            
            size_after = os.path.getsize(f)
            total_after += size_after
            
            print(f"[{idx+1}/{len(files)}] Optimized {os.path.basename(f)}: {size_before/1024/1024:.1f}MB -> {size_after/1024:.1f}KB")
        except Exception as e:
            print(f"Error compressing {f}: {e}")

    print("\n--------------------------------------------------------")
    print(f"Compression Complete!")
    print(f"Total Size Before: {total_before/1024/1024:.1f} MB")
    print(f"Total Size After:  {total_after/1024/1024:.1f} MB")
    print(f"Saved:             {(total_before - total_after)/1024/1024:.1f} MB ({(1 - total_after/total_before)*100:.1f}% reduction)")
    print("--------------------------------------------------------")

if __name__ == "__main__":
    compress_images()
