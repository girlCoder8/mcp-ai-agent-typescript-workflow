#!/bin/bash
# start-wiremock.sh - Script to start Wiremock server

echo "🚀 Starting Wiremock server..."

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8080 is already in use. Checking if it's Wiremock..."

    # Test if it's a Wiremock server
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/__admin/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✅ Wiremock server is already running on port 8080"
        exit 0
    else
        echo "❌ Port 8080 is occupied by a different service"
        echo "Please stop the service or choose a different port"
        exit 1
    fi
fi

# Method 1: Docker (recommended)
start_with_docker() {
    echo "Starting Wiremock with Docker..."
    docker run -d \
        --name wiremock-test-server \
        -p 8080:8080 \
        -v "$(pwd)/wiremock:/home/wiremock" \
        wiremock/wiremock:latest \
        --global-response-templating \
        --verbose

    if [ $? -eq 0 ]; then
        echo "✅ Wiremock started with Docker"
        return 0
    else
        echo "❌ Failed to start Wiremock with Docker"
        return 1
    fi
}

# Method 2: Java JAR
start_with_jar() {
    echo "Starting Wiremock with JAR file..."

    # Download JAR if it doesn't exist
    if [ ! -f "wiremock-standalone.jar" ]; then
        echo "📥 Downloading Wiremock JAR..."
        curl -o wiremock-standalone.jar \
            https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-jre8-standalone/2.35.0/wiremock-jre8-standalone-2.35.0.jar
    fi

    # Start Wiremock
    java -jar wiremock-standalone.jar \
        --port 8080 \
        --global-response-templating \
        --verbose &

    # Store PID for later cleanup
    echo $! > wiremock.pid

    if [ $? -eq 0 ]; then
        echo "✅ Wiremock started with JAR (PID: $(cat wiremock.pid))"
        return 0
    else
        echo "❌ Failed to start Wiremock with JAR"
        return 1
    fi
}

# Method 3: npm global package
start_with_npm() {
    echo "Starting Wiremock with npm package..."

    # Check if wiremock is installed globally
    if ! command -v wiremock &> /dev/null; then
        echo "📦 Installing Wiremock globally..."
        npm install -g wiremock
    fi

    # Start Wiremock
    wiremock --port 8080 --verbose &

    # Store PID
    echo $! > wiremock.pid

    if [ $? -eq 0 ]; then
        echo "✅ Wiremock started with npm (PID: $(cat wiremock.pid))"
        return 0
    else
        echo "❌ Failed to start Wiremock with npm"
        return 1
    fi
}

# Try different methods in order of preference
echo "Attempting to start Wiremock..."

# Check if Docker is available
if command -v docker &> /dev/null && docker info &> /dev/null; then
    start_with_docker && started=true
fi

# If Docker failed or isn't available, try JAR
if [ -z "$started" ] && command -v java &> /dev/null; then
    start_with_jar && started=true
fi

# If JAR failed, try npm
if [ -z "$started" ] && command -v npm &> /dev/null; then
    start_with_npm && started=true
fi

if [ -z "$started" ]; then
    echo "❌ Failed to start Wiremock with any method"
    echo "Please ensure you have one of the following installed:"
    echo "  - Docker"
    echo "  - Java (for JAR method)"
    echo "  - Node.js/npm (for npm method)"
    exit 1
fi

# Wait for Wiremock to be ready
echo "⏳ Waiting for Wiremock to be ready..."
for i in {1..30}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/__admin/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✅ Wiremock server is ready! (took ${i} seconds)"
        echo "🌐 Admin UI: http://localhost:8080/__admin/"
        echo "🔧 Health check: http://localhost:8080/__admin/health"
        exit 0
    fi
    echo "   Attempt $i/30..."
    sleep 1
done

echo "❌ Wiremock did not start within 30 seconds"
echo "Check the logs and try again"
exit 1

# Usage examples:
# ./start-wiremock.sh
# ./start-wiremock.sh docker  # Force Docker method
# ./start-wiremock.sh jar     # Force JAR method
# ./start-wiremock.sh npm     # Force npm method