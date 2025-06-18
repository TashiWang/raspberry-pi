# 🏠 IoT Device Management Platform

<div align="center">

![IoT Management Platform](frontend/public/image.png)

**A comprehensive full-stack platform for managing IoT devices with real-time command execution, sensor monitoring, and a modern React dashboard.**

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.x-yellow.svg)](https://python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

</div>

## 🚀 Overview

This IoT Device Management Platform provides a complete solution for monitoring and controlling distributed IoT devices (Raspberry Pi, laptops, servers) through a centralized web interface. Perfect for home automation, lab management, or industrial IoT deployments.

### ✨ Key Features

🎯 **Device Management**
- Register, monitor, and control multiple IoT devices
- Real-time device status and health monitoring
- Support for both physical and simulated devices
- Device categorization and filtering

🖥️ **Remote Command Execution**
- Execute shell commands remotely on any connected device
- Real-time command output and error handling
- Command history and logging
- Secure command validation and sanitization

📊 **Sensor Data Collection**
- Automated sensor data reporting (temperature, humidity, system stats)
- Historical data storage and visualization
- Configurable reporting intervals
- Custom sensor integration support

🎨 **Modern Web Dashboard**
- Responsive React-based interface
- Real-time updates and notifications
- Search, filter, and sort capabilities
- Dark/light theme support
- Mobile-friendly design

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Devices     │
│   (React.js)    │◄──►│  (Express.js)   │◄──►│ (Python Flask)  │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Command Exec  │
│ • Device Mgmt   │    │ • WebSocket     │    │ • Sensor Data   │
│ • Command UI    │    │ • Authentication│    │ • Health Check  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌─────────────────┐
                       │    Database     │
                       │   (MongoDB)     │
                       │                 │
                       │ • Device Data   │
                       │ • Sensor Logs   │
                       │ • Command Hist  │
                       └─────────────────┘
```

## 📁 Project Structure

```
iot-device-platform/
├── 🎨 frontend/              # React.js Dashboard
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── api/             # API integration
│   │   └── styles/          # CSS and styling
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
│
├── ⚙️ backend/               # Express.js API Server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # Database models
│   │   └── middleware/      # Auth and validation
│   ├── server.js            # Main server file
│   └── package.json         # Backend dependencies
│
├── 🤖 slave/                 # Device Agent (Python)
│   ├── slave.py             # Main agent script
│   └── requirements.txt     # Python dependencies
│
├── 📄 README.md              # This file
└── 📦 package.json           # Root dependencies
```

## 🛠️ Technology Stack

### Frontend
- **React 19.1.0** - Modern UI framework
- **TailwindCSS 4.x** - Utility-first CSS framework
- **FontAwesome** - Icon library
- **React Hot Toast** - Notification system

### Backend
- **Node.js 18.x** - Runtime environment
- **Express.js 5.x** - Web framework
- **MongoDB 6.x** - NoSQL database
- **CORS** - Cross-origin resource sharing

### Device Agent
- **Python 3.x** - Programming language
- **Flask** - Lightweight web framework
- **APScheduler** - Task scheduling
- **Requests** - HTTP client library

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16.x or higher
- **Python** 3.8 or higher
- **MongoDB** 6.x (local or cloud)
- **npm** or **yarn**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/iot-device-platform.git
cd iot-device-platform
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Start the backend server
npm start
```

The backend API will be available at `http://localhost:5000`

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory (new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The web dashboard will be available at `http://localhost:3000`

### 4️⃣ Device Agent Setup

```bash
# Navigate to slave directory (new terminal)
cd slave

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install flask requests apscheduler

# Configure the agent
# Edit slave.py to set:
# - MASTER_API_BASE_URL (backend server URL)
# - THIS_DEVICE_ID (unique device identifier)

# Start the device agent
python slave.py
```

The device agent will be available at `http://localhost:5001`

## 📖 Usage Guide

### Adding Devices

1. **Physical Devices**: Deploy the slave agent on your IoT devices
2. **Simulated Devices**: Use the dashboard to create virtual devices for testing

### Sending Commands

1. Select a device from the dashboard
2. Use the command terminal to execute shell commands
3. View real-time output and command history

### Monitoring Sensors

1. Device agents automatically report system metrics
2. View sensor data in the dashboard
3. Set up custom sensors by modifying the slave agent

## ⚙️ Configuration

### Backend Configuration (`.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/iot_platform

# Security (for production)
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here
```

### Device Agent Configuration

Edit `slave/slave.py`:

```python
# Master server configuration
MASTER_API_BASE_URL = "http://192.168.1.100:5000"  # Backend server IP
THIS_DEVICE_ID = "raspberry-pi-01"                 # Unique device ID

# Agent configuration
SLAVE_PORT = 5001
REPORT_INTERVAL = 30  # Sensor reporting interval in seconds
```

## 🔒 Security Considerations

⚠️ **Important**: This platform is designed for development and testing environments.

### For Production Use:

1. **Implement Authentication**
   - Add JWT-based authentication for API endpoints
   - Secure device registration and communication
   - Use API keys for device agents

2. **Secure Command Execution**
   - Implement command whitelisting
   - Add input validation and sanitization
   - Use sudo restrictions for privileged commands

3. **Network Security**
   - Use HTTPS for all communications
   - Implement VPN for device communications
   - Configure proper firewall rules

4. **Database Security**
   - Enable MongoDB authentication
   - Use connection encryption
   - Implement proper access controls

## 🧪 Development

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests (when implemented)
cd backend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The build folder will contain the production-ready files
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
- Ensure MongoDB is running and accessible
- Check the MongoDB URI in `.env`
- Verify all dependencies are installed

**Frontend can't connect to backend**
- Ensure backend is running on port 5000
- Check CORS configuration in backend
- Verify API URLs in frontend configuration

**Device agent not connecting**
- Check the `MASTER_API_BASE_URL` configuration
- Ensure backend is accessible from the device
- Verify network connectivity and firewall settings

**Commands not executing**
- Check device agent logs for errors
- Verify device permissions for command execution
- Ensure the device agent service is running

### Debug Mode

```bash
# Enable debug logging for backend
DEBUG=* npm start

# Enable verbose logging for device agent
python slave.py --debug
```

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. **Backend**: Deploy to cloud platform (AWS, Heroku, DigitalOcean)
2. **Frontend**: Build and serve static files (Netlify, Vercel, S3)
3. **Database**: Use managed MongoDB service (MongoDB Atlas)
4. **Devices**: Deploy agent scripts to target devices

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing frontend framework
- **Express.js** for the robust backend framework
- **MongoDB** for the flexible database solution
- **Flask** for the lightweight device agent framework
- **FontAwesome** for the beautiful icons
- **TailwindCSS** for the utility-first styling

## 📞 Support

If you have any questions or need help:

- 📧 Email: your.email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/iot-device-platform/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/iot-device-platform/discussions)

---

<div align="center">

**Made with ❤️ for the IoT Community**

⭐ Star this repository if it helped you!

</div>
