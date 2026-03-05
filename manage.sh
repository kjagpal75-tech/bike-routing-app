#!/bin/bash

# Bike Routing App Management Script

case "$1" in
    start)
        echo "🚀 Starting Bike Routing App..."
        pm2 start ecosystem.config.js
        echo "✅ App started!"
        echo "📊 Status: pm2 status"
        echo "🌐 URL: http://localhost:8000"
        ;;
    stop)
        echo "🛑 Stopping Bike Routing App..."
        pm2 stop bike-routing-app
        echo "✅ App stopped!"
        ;;
    restart)
        echo "🔄 Restarting Bike Routing App..."
        pm2 restart bike-routing-app
        echo "✅ App restarted!"
        ;;
    status)
        echo "📊 Bike Routing App Status:"
        pm2 status
        ;;
    logs)
        echo "📝 Showing logs (Ctrl+C to exit):"
        pm2 logs bike-routing-app
        ;;
    monitor)
        echo "👀 Opening PM2 monitor..."
        pm2 monit
        ;;
    *)
        echo "🚴 Bike Routing App Manager"
        echo "Usage: $0 {start|stop|restart|status|logs|monitor}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the app"
        echo "  stop    - Stop the app"
        echo "  restart - Restart the app"
        echo "  status  - Show app status"
        echo "  logs    - Show app logs"
        echo "  monitor - Open PM2 monitor"
        exit 1
        ;;
esac
