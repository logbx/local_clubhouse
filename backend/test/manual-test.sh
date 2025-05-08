#!/bin/bash

# Create test image
convert -size 100x100 xc:white test-image.jpg

# Test profile picture upload
echo "Testing profile picture upload..."
curl -X POST \
  http://localhost:5000/api/upload/profile-pic \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@test-image.jpg' \
  -v

echo -e "\n\nTesting event cover upload..."
curl -X POST \
  http://localhost:5000/api/upload/event-cover \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@test-image.jpg' \
  -v

# Test invalid file type
echo -e "\n\nTesting invalid file type..."
echo "invalid" > test.txt
curl -X POST \
  http://localhost:5000/api/upload/profile-pic \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@test.txt' \
  -v

# Test file size limit
echo -e "\n\nTesting file size limit..."
dd if=/dev/zero of=large.jpg bs=1M count=6
curl -X POST \
  http://localhost:5000/api/upload/profile-pic \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@large.jpg' \
  -v

# Clean up test files
rm -f test-image.jpg test.txt large.jpg 