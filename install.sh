#!/bin/sh

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) URL="https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/channels/beta/xgsd-linux-x64.tar.gz" ;;
    aarch64) URL="https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/channels/beta/xgsd-linux-arm64.tar.gz" ;;
    armv7l|armv6l) URL="https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/channels/beta/xgsd-linux-arm.tar.gz" ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

OUTPUT="xgsd.tar.gz"

# Download file
if command -v curl >/dev/null 2>&1; then
    echo "Downloading $URL with curl..."
    curl -fSL "$URL" -o "$OUTPUT" || { echo "Download failed"; exit 1; }
elif command -v wget >/dev/null 2>&1; then
    echo "Downloading $URL with wget..."
    wget -O "$OUTPUT" "$URL" || { echo "Download failed"; exit 1; }
else
    echo "Error: curl or wget is required."
    exit 1
fi

# Extract tarball
echo "Extracting tarball..."
tar -xzf "$OUTPUT" || { echo "Extraction failed"; exit 1; }

# Remove tarball
rm -f "$OUTPUT"

# Make binary executable
chmod +x xgsd/bin

# Move binary to /usr/local/bin
sudo mv xgsd /usr/local/bin/xgsd

# Add to PATH in ~/.profile if not already present
if ! grep -q '/usr/local/bin/xgsd/bin' ~/.profile; then
    echo 'export PATH=$PATH:/usr/local/bin/xgsd/bin' >> ~/.profile
    echo "Added /usr/local/bin/xgsd/bin to PATH in ~/.profile"
fi

# Clean up extracted directory
rm -rf xgsd

# Verify installation
if command -v xgsd >/dev/null 2>&1; then
    echo "xgsd installed successfully!"
else
    echo "Installation complete, but restart your shell or run 'source ~/.profile' to use xgsd."
fi
