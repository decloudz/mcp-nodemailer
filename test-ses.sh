#!/bin/bash

# Test script for AWS SES SMTP configuration
# This script tests the nodemailer MCP server with the provided SES credentials

echo "🚀 Testing Nodemailer MCP Server with AWS SES SMTP..."
echo "=================================================="

# Set the SES SMTP credentials
export SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
export SMTP_PORT="587"
export SMTP_SECURE="false"
export SMTP_USER="AKIA256X4BH57AV2ZCHM"
export SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o"
export DEBUG="true"
export SMTP_POOL="true"

echo "Configuration:"
echo "  Host: $SMTP_HOST"
echo "  Port: $SMTP_PORT"
echo "  User: $SMTP_USER"
echo "  Pool: $SMTP_POOL"
echo "  Debug: $DEBUG"
echo ""

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "📦 Building project..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
    echo "✅ Build successful!"
    echo ""
fi

echo "🔍 Testing connection verification..."
echo "Note: This will test the SMTP connection and then exit."
echo "If successful, you can use this configuration with MCP clients."
echo ""

# Run the server (it will verify connection and then wait for MCP commands)
echo "Starting server..."
timeout 10s ./build/index.js 2>&1 || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo ""
        echo "✅ Server started successfully and was stopped after 10 seconds."
        echo "🎉 SES SMTP configuration is working!"
        echo ""
        echo "To use with MCP clients, run:"
        echo "  ./build/index.js --host email-smtp.us-east-1.amazonaws.com --port 587 --user AKIA256X4BH57AV2ZCHM --pass 'BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o'"
        echo ""
        echo "Or with environment variables:"
        echo "  SMTP_HOST=email-smtp.us-east-1.amazonaws.com SMTP_USER=AKIA256X4BH57AV2ZCHM SMTP_PASS='BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o' ./build/index.js"
    else
        echo "❌ Server failed to start or connection verification failed."
        exit 1
    fi
} 