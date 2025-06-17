# IoT Device Management Platform

A full-stack platform for managing IoT devices (e.g., Raspberry Pi, laptops) with real-time command execution, sensor data reporting, and a modern React dashboard.

---

## Project Structure

```
backend/    # Express.js API server (MongoDB, REST API)
frontend/   # React.js admin dashboard (device management UI)
slave/      # Python Flask app for device-side command execution
```

---

## Features

- **Device Management:** Register, view, filter, and delete real or simulated devices.
- **Command Execution:** Send system/network/maintenance commands to devices and view responses.
- **Sensor Data Reporting:** Devices periodically report temperature, humidity, and status to the backend.
- **Dashboard:** Modern React UI with device stats, search/filter, and command terminal.
- **Simulated Devices:** Add and manage simulated devices for testing/demo purposes.

---

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm
- Python 3.x (for slave)
- MongoDB (local or remote)

---

### 1. Backend (Express.js API)

#### Setup

```sh
cd backend
npm install
```

#### Configuration

- Edit `.env` for MongoDB URI and port (defaults provided).

#### Start Server

```sh
npm start
# or
node server.js
```

API runs at [http://localhost:5000](http://localhost:5000)

---

### 2. Frontend (React Dashboard)

#### Setup

```sh
cd frontend
npm install
```

#### Start Development Server

```sh
npm start
```

- Runs at [http://localhost:3000](http://localhost:3000)
- Make sure the backend is running at `http://localhost:5000` (adjust in `src/api/deviceApi.js` if needed).

---

### 3. Slave (Device Agent - Python Flask)

#### Setup

```sh
cd slave
pip install flask requests apscheduler
```

#### Configuration

- Edit `slave.py` to set:
  - `MASTER_API_BASE_URL` (backend IP/port)
  - `THIS_DEVICE_ID` (unique device ID)

#### Run Slave

```sh
python slave.py
```

- Listens on port 5001 by default.

---

## Usage

- Open the React dashboard to manage devices.
- Add real or simulated devices.
- Select a device to view details and send commands.
- Devices (real or simulated) will report sensor data to the backend.
- Use the terminal input to send custom shell commands to devices (for demo/testing).

---

## Security Notes

- **Authentication:** The current setup is for demo/testing. For production, implement authentication (JWT, API keys, etc.) for device and command APIs.
- **Command Execution:** The slave's `execute_command` endpoint is powerful but dangerous. Restrict or sanitize commands in production.

---

## Customization

- **Device Types:** Extend device types and commands in the backend and frontend as needed.
- **Sensor Data:** Integrate real sensors in `slave.py` for actual hardware.

---

## License

MIT License

---

## Credits

- React, Express, MongoDB, Flask, FontAwesome, Bootstrap

---

## Screenshots

_Add screenshots of your dashboard UI here!_

---

## Troubleshooting

- Ensure MongoDB is running and accessible.
- Adjust API URLs if running on different hosts/ports.
- For CORS issues, check backend CORS settings.

---

## Contributing

Pull requests welcome! Please open issues for bugs or feature requests.
