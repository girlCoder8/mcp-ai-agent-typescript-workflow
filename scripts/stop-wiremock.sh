#!/bin/bash
# stop-wiremock.sh - Script to stop Wiremock server

echo "🛑 Stopping Wiremock server..."

# Function to stop Docker container
stop_docker() {
    echo "Stopping Docker container..."
    if docker ps -q -f name=wiremock-test-server | grep -q .; then
        docker stop wiremock-test-server
        docker rm wiremock-test-server
        echo "✅ Docker Wiremock container stopped and removed"
        return 0
    else
        echo "ℹ️  No Docker Wiremock container found"
        return 1
    fi
}

# Function to stop JAR/npm process
stop_process() {
    if [ -f "wiremock.pid" ]; then
        pid=$(cat wiremock.pid)
        echo "Stopping Wiremock process (PID: $pid)..."

        if kill -0 $pid 2>/dev/null; then
            kill $pid
            sleep 2

            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo "Force killing process..."
                kill -9 $pid
            fi

            rm wiremock.pid
            echo "✅ Wiremock process stopped"
            return 0
        else
            echo "ℹ️  Process not running"
            rm wiremock.pid
            return 1
        fi
    else
        echo "ℹ️  No PID file found"
        return 1
    fi
}

# Function to stop any process on port 8080
stop_port_process() {
    echo "Looking for processes on port 8080..."
    pid=$(lsof -ti:8080)

    if [ -n "$pid" ]; then
        echo "Stopping process on port 8080 (PID: $pid)..."
        kill $pid
        sleep 2

        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo "Force killing process..."
            kill -9 $pid
        fi

        echo "✅ Process on port 8080 stopped"
        return 0
    else
        echo "ℹ️  No process found on port 8080"
        return 1
    fi
}

# Try different stop methods
stopped=false

# Try Docker first
stop_docker && stopped=true

# Try PID file method
if [ "$stopped" = false ]; then
    stop_process && stopped=true
fi

# Try port-based method as last resort
if [ "$stopped" = false ]; then
    stop_port_process && stopped=true
fi

if [ "$stopped" = false ]; then
    echo "ℹ️  No Wiremock server found to stop"
else
    echo "✅ Wiremock server stopped successfully"
fi

# Verify port is free
sleep 1
if ! lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Port 8080 is now free"
else
    echo "⚠️  Port 8080 is still in use by another process"
fi