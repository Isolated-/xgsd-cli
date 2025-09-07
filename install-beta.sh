#!/usr/bin/env bash

# URL of the tarball
URL="https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/channels/beta/xgsd-linux-x64.tar.gz"

# Output file
OUTPUT="xgsd-linux-x64.tar.gz"

# Check if curl is available, otherwise fallback to wget
if command -v curl >/dev/null 2>&1; then
  echo "Downloading with curl..."
  curl -fSL "$URL" -o "$OUTPUT"
elif command -v wget >/dev/null 2>&1; then
  echo "Downloading with wget..."
  wget "$URL" -O "$OUTPUT"
else
  echo "Error: curl or wget is required to download files."
  exit 1
fi

# Verify download success
if [[ -f "$OUTPUT" ]]; then
  echo "Downloaded file to $OUTPUT"
else
  echo "Download failed."
  exit 1
fi

# Extract the tarball
echo "Extracting the tarball..."
tar -xzf "$OUTPUT"

# Verify extraction success
if [[ $? -ne 0 ]]; then
  echo "Extraction failed."
  exit 1
fi

# Remove the tarball
rm "$OUTPUT"
echo "Removed the tarball."

# Make the binary executable
chmod +x xgsd/bin
echo "Made xgsd executable."

# Move the binary to /usr/local/bin
sudo mv xgsd/bin /usr/local/bin/xgsd

# Add binary to path
if ! grep -q 'export PATH=$PATH:/usr/local/bin/xgsd' ~/.bashrc; then
  echo 'export PATH=$PATH:/usr/local/bin/xgsd' >> ~/.bashrc
  echo "Added /usr/local/bin/xgsd to PATH in ~/.bashrc"
fi

# Source the updated .bashrc
source ~/.bashrc

# Verify installation
if command -v xgsd >/dev/null 2>&1; then
  echo "xgsd installed successfully and is available in your PATH."
else
  echo "You need to restart your terminal or run 'source ~/.bashrc' to use xgsd."
  exit 1
fi

# Clean up extracted directory
rm -rf xgsd