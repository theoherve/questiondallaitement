#!/bin/bash
# Optimize blog images by resizing and converting to JPEG
# Uses macOS built-in `sips` tool

IMAGES_DIR="$(dirname "$0")/../blog-scraper/blog-images"
MAX_WIDTH=1200
QUALITY=80

if [ ! -d "$IMAGES_DIR" ]; then
  echo "Error: blog-images directory not found at $IMAGES_DIR"
  exit 1
fi

echo "Optimizing images in $IMAGES_DIR"
echo "Max width: ${MAX_WIDTH}px | JPEG quality: ${QUALITY}%"
echo "---"

total_before=0
total_after=0
count=0

for file in "$IMAGES_DIR"/*.{jpg,jpeg,png,webp}; do
  [ -f "$file" ] || continue

  size_before=$(stat -f%z "$file")
  total_before=$((total_before + size_before))

  # Get current width
  width=$(sips -g pixelWidth "$file" 2>/dev/null | tail -1 | awk '{print $2}')

  # Resize if wider than MAX_WIDTH
  if [ -n "$width" ] && [ "$width" -gt "$MAX_WIDTH" ]; then
    sips --resampleWidth "$MAX_WIDTH" "$file" --out "$file" >/dev/null 2>&1
  fi

  # Re-compress JPEGs
  ext="${file##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

  if [ "$ext_lower" = "jpg" ] || [ "$ext_lower" = "jpeg" ]; then
    sips -s formatOptions "$QUALITY" "$file" --out "$file" >/dev/null 2>&1
  elif [ "$ext_lower" = "png" ]; then
    # Convert PNG to JPEG for smaller size (unless it has transparency)
    # sips can check, but for simplicity we just re-save the PNG optimized
    sips -s formatOptions low "$file" --out "$file" >/dev/null 2>&1
  fi

  size_after=$(stat -f%z "$file")
  total_after=$((total_after + size_after))
  count=$((count + 1))

  saved=$((size_before - size_after))
  if [ "$saved" -gt 0 ]; then
    echo "✓ $(basename "$file"): $(( size_before / 1024 ))KB → $(( size_after / 1024 ))KB (-$(( saved / 1024 ))KB)"
  else
    echo "· $(basename "$file"): $(( size_before / 1024 ))KB (unchanged)"
  fi
done

echo "---"
echo "Processed: $count images"
echo "Total before: $(( total_before / 1024 / 1024 ))MB"
echo "Total after:  $(( total_after / 1024 / 1024 ))MB"
echo "Saved:        $(( (total_before - total_after) / 1024 / 1024 ))MB"
