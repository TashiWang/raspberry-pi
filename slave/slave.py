# laptop_slave_app.py (Run this on your laptop)
from flask import Flask, request, jsonify
import json
import time
import os
import subprocess
import random
import re
import requests
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

# If you want to use the private key for signing/verification on the laptop,
# you would need a library like 'cryptography' (pip install cryptography)

app = Flask(__name__)

# --- Configuration for this Laptop Slave API ---
SLAVE_API_PORT = 5001
SLAVE_API_PATH = '/execute_command'

# --- Configuration for Master Backend API ---
# IMPORTANT: Replace with the actual IP and port of your Express.js server
MASTER_API_BASE_URL = "http://172.20.10.2:5000/api"
# This device's ID as registered in the master backend
THIS_DEVICE_ID = "laptop_tashi" # <-- IMPORTANT: Match the device_id you registered

# NEW: Sensor data sending interval (in seconds)
SENSOR_DATA_SEND_INTERVAL_SECONDS = 300 # Send data every 30 seconds

# IMPORTANT: Implement proper authentication for incoming commands
# This example uses a very basic check. In production:
# 1. Have your laptop verify a JWT signed by your Express backend's private key.
# 2. Use a pre-shared API key or secret in headers.
# 3. For security, don't expose this port directly to the internet without proper firewall/VPN.


# Function to send sensor data to the master backend
def send_sensor_data_to_master(temperature, humidity, status="active"):
    """
    Sends sensor data to the master Express.js backend.
    """
    try:
        report_url = f"{MASTER_API_BASE_URL}/sensor_data/{THIS_DEVICE_ID}/report"
        payload = {
            "timestamp": datetime.now().isoformat(),
            "temperature": temperature,
            "humidity": humidity,
            "status": status
        }
        headers = {'Content-Type': 'application/json'}

        # In a real scenario, you'd add authentication headers here (e.g., a signed JWT from this device)
        # headers['Authorization'] = 'Bearer YOUR_DEVICE_JWT'

        print(f"Sending sensor data to master: {report_url} with payload: {payload}")
        response = requests.post(report_url, json=payload, headers=headers)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        print(f"Sensor data sent successfully. Master response: {response.json()}")
        return True, response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending sensor data to master: {e}")
        return False, {"error": str(e)}
    except Exception as e:
        print(f"Unexpected error in send_sensor_data_to_master: {e}")
        return False, {"error": f"An unexpected error occurred: {e}"}

# NEW: Scheduled job function to collect and send sensor data
def collect_and_send_sensor_data():
    """
    Collects dummy sensor data and sends it to the master backend.
    In a real scenario, this would read from actual sensors.
    """
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Running scheduled sensor data collection...")
    # Collect some dummy sensor data (replace with actual sensor readings)
    temp = round(random.uniform(20.0, 30.0), 2)
    hum = round(random.uniform(50.0, 70.0), 2)
    status = random.choice(["active", "warning"])

    success, response = send_sensor_data_to_master(temp, hum, status)
    if success:
        print("Scheduled sensor data sent successfully.")
    else:
        print(f"Failed to send scheduled sensor data: {response}")


@app.route(SLAVE_API_PATH, methods=["POST"])
def execute_command_flask_route(): # Renamed to avoid conflict with the 'command' variable
    try:
        data = request.get_json()
        command = data.get("command")
        value = data.get("value")
        # In a real scenario, you'd verify the sender's identity/authenticity
        # e.g., check for a valid JWT from your master server
        # auth_token = request.headers.get('Authorization')

        print(f"Received command: {command} with value: {value}")

        if command == "ping_test":
            response_message = f"Laptop received ping test. Value: {value}"
            print(response_message)
            return jsonify({"status": "success", "message": response_message, "echo_value": value}), 200
        elif command == "get_cpu_temp":
            # This is a dummy for laptop. Real RPi would use specific sensor.
            # On Linux/macOS, you might run 'sysctl -a | grep temperature' or similar
            # On Windows, you'd need WMI or specific libraries.
            # os.getloadavg() is Linux/macOS specific.
            try:
                # Ensure os.getloadavg() exists before calling
                if hasattr(os, 'getloadavg'):
                    dummy_temp = round(os.getloadavg()[0] * 10 + 30 + (time.time() % 5), 2) # Simulate load-based temp
                else:
                    # Fallback for systems without getloadavg (e.g., Windows)
                    dummy_temp = round(random.uniform(30, 60), 2)
            except Exception as e: # Catch any other potential errors during temperature simulation
                print(f"Error simulating CPU temp: {e}")
                dummy_temp = round(random.uniform(30, 60), 2) # Fallback to random
            response_message = f"Laptop CPU temperature (simulated): {dummy_temp}°C"
            print(response_message)
            return jsonify({"status": "success", "temperature": dummy_temp, "unit": "Celsius"}), 200
        elif command == "display_message":
            if value is not None: # Explicitly check if value is not None
                print(f"Displaying message on laptop: {value}")
                # In a real scenario, you might trigger a desktop notification or show a pop-up
                # For example, using 'plyer' (pip install plyer) or platform-specific tools
                return jsonify({"status": "success", "message": f"Message '{value}' received for display"}), 200
            else:
                return jsonify({"status": "error", "message": "No message provided for display"}), 400
        elif command == "system_info":
            try:
                # Use subprocess.run for better error handling and output capture
                # Ensure default empty string for output if command fails or yields nothing
                hostname = subprocess.run("hostname", shell=True, text=True, capture_output=True, check=False).stdout.strip()
                os_name_cmd = "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d '\"' -f 2" # Redirect stderr
                os_name = subprocess.run(os_name_cmd, shell=True, text=True, capture_output=True, check=False).stdout.strip()
                kernel = subprocess.run("uname -r", shell=True, text=True, capture_output=True, check=False).stdout.strip()
                uptime = subprocess.run("uptime -p", shell=True, text=True, capture_output=True, check=False).stdout.strip()
                cpu_cmd = "lscpu 2>/dev/null | grep \"Model name\" | cut -d ':' -f 2 | xargs"
                cpu = subprocess.run(cpu_cmd, shell=True, text=True, capture_output=True, check=False).stdout.strip()
                memory_cmd = "free -h 2>/dev/null | awk '/Mem/{print $3 \"/\" $2}'"
                memory = subprocess.run(memory_cmd, shell=True, text=True, capture_output=True, check=False).stdout.strip()


                sys_info = {
                    "hostname": hostname or "N/A", # Provide default if empty
                    "os": os_name or "N/A",
                    "kernel": kernel or "N/A",
                    "uptime": uptime or "N/A",
                    "cpu": cpu or "N/A",
                    "memory": memory or "N/A"
                }
                print("Generated System Info:", sys_info)
                return jsonify({"status": "success", "system_info": sys_info}), 200
            except Exception as e:
                print(f"Error getting system info: {e}")
                return jsonify({"status": "error", "message": f"Failed to get system info: {str(e)}"}), 500
        elif command == "update_system":
            try:
                print("Executing system update: apt update && apt upgrade -y")
                update_result = subprocess.run("sudo apt update && sudo apt upgrade -y", shell=True, text=True, capture_output=True, check=True)
                print("Update stdout:\n", update_result.stdout)
                print("Update stderr:\n", update_result.stderr)

                print("Executing system autoremove: apt autoremove -y")
                autoremove_result = subprocess.run("sudo apt autoremove -y", shell=True, text=True, capture_output=True, check=True)
                print("Autoremove stdout:\n", autoremove_result.stdout)
                print("Autoremove stderr:\n", autoremove_result.stderr)

                return jsonify({"status": "success", "message": "System update initiated and completed.", "update_output": update_result.stdout, "autoremove_output": autoremove_result.stdout}), 200
            except FileNotFoundError:
                return jsonify({"status": "error", "message": "apt command not found. This command is for Debian/Ubuntu based systems."}), 500
            except subprocess.CalledProcessError as e:
                print(f"Error during system update: {e}")
                return jsonify({"status": "error", "message": f"System update failed: {e.stderr.strip()}", "details": e.stdout.strip()}), 500
            except Exception as e:
                print(f"Unexpected error during system update: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during update: {e}"}), 500
        elif command == "reboot_pi":
            try:
                print("Executing reboot command...")
                subprocess.run("sudo reboot", shell=True, check=True)
                return jsonify({"status": "success", "message": "Reboot command sent."}), 200
            except FileNotFoundError:
                return jsonify({"status": "error", "message": "reboot command not found."}), 500
            except subprocess.CalledProcessError as e:
                print(f"Error during reboot: {e}")
                return jsonify({"status": "error", "message": f"Reboot failed: {e.stderr.strip()}"}), 500
            except Exception as e:
                print(f"Unexpected error during reboot: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during reboot: {e}"}), 500
        elif command == "shutdown_pi":
            try:
                print("Executing shutdown command...")
                subprocess.run("sudo shutdown now", shell=True, check=True)
                return jsonify({"status": "success", "message": "Shutdown command sent."}), 200
            except FileNotFoundError:
                return jsonify({"status": "error", "message": "shutdown command not found."}), 500
            except subprocess.CalledProcessError as e:
                print(f"Error during shutdown: {e}")
                return jsonify({"status": "error", "message": f"Shutdown failed: {e.stderr.strip()}"}), 500
            except Exception as e:
                print(f"Unexpected error during shutdown: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during shutdown: {e}"}), 500
        elif command == "network_info":
            try:
                local_ip = subprocess.run("hostname -I", shell=True, text=True, capture_output=True, check=False).stdout.strip()

                mac_address = "N/A"
                try:
                    default_interface_cmd = "ip route show default | awk '/default/ {print $5}'"
                    default_interface_result = subprocess.run(default_interface_cmd, shell=True, text=True, capture_output=True, check=False)
                    default_interface = default_interface_result.stdout.strip()
                    if default_interface:
                        mac_address = subprocess.run(f"cat /sys/class/net/{default_interface}/address", shell=True, text=True, capture_output=True, check=False).stdout.strip()
                except Exception as e:
                    print(f"Could not retrieve MAC address: {e}")
                    mac_address = "Could not retrieve (Linux/macOS specific or command missing/error)"


                public_ip = "N/A"
                try:
                    public_ip_response = requests.get("https://ifconfig.me/ip")
                    public_ip_response.raise_for_status()
                    public_ip = public_ip_response.text.strip()
                except requests.exceptions.RequestException as e:
                    print(f"Error getting public IP: {e}")
                    public_ip = "Could not retrieve (curl missing or network issue)"

                net_info = {
                    "local_ip_addresses": local_ip.split() if local_ip else [],
                    "mac_address": mac_address,
                    "public_ip": public_ip
                }
                print("Generated Network Info:", net_info)
                return jsonify({"status": "success", "network_info": net_info}), 200
            except Exception as e:
                print(f"Unexpected error during network info retrieval: {e}")
                return jsonify({"status": "error", "message": f"Failed to get network info: {str(e)}"}), 500
        elif command == "disk_usage":
            try:
                disk_output = subprocess.run("df -h", shell=True, text=True, capture_output=True, check=False).stdout.strip()
                print("Generated Disk Usage:", disk_output)
                return jsonify({"status": "success", "disk_usage": disk_output or "N/A"}), 200 # Provide default if empty
            except Exception as e:
                print(f"Error getting disk usage: {e}")
                return jsonify({"status": "error", "message": f"Failed to get disk usage: {str(e)}"}), 500
        elif command == "cpu_temp":
            try:
                # IMPORTANT: vcgencmd is ONLY available on Raspberry Pi devices.
                # Use 'lscpu' or platform-specific tools for general Linux/macOS.
                temp_output = "N/A - vcgencmd is for Raspberry Pi. Use 'get_cpu_temp' for laptop." # Default for non-RPi
                try:
                    # Attempt vcgencmd (will fail on non-RPi, caught by CalledProcessError/FileNotFoundError)
                    rpi_temp_result = subprocess.run("vcgencmd measure_temp", shell=True, text=True, capture_output=True, check=True, timeout=5)
                    temp_output = rpi_temp_result.stdout.strip()
                    temp_celsius = temp_output.split('=')[1].replace('\'C', '') # Parse format like "temp=45.6'C"
                    print("Generated CPU Temperature (RPi):", temp_celsius)
                    return jsonify({"status": "success", "cpu_temperature": temp_celsius, "unit": "Celsius"}), 200
                except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                    # Fallback for non-Raspberry Pi or command not found
                    # Attempt a more general Linux CPU temperature command if available
                    cpu_temp_sensors_cmd = "sensors -j" # Requires lm-sensors (sudo apt install lm-sensors)
                    try:
                        sensors_output = subprocess.run(cpu_temp_sensors_cmd, shell=True, text=True, capture_output=True, check=True, timeout=10).stdout.strip()
                        if sensors_output:
                            sensors_data = json.loads(sensors_output)
                            # Attempt to extract a common CPU temperature (e.g., from 'coretemp' or 'k10temp')
                            cpu_temp = "N/A"
                            for chip_name, chip_data in sensors_data.items():
                                for feature_name, feature_data in chip_data.get('features', {}).items():
                                    if 'temp' in feature_name.lower() and '_input' in feature_data:
                                        cpu_temp = feature_data[feature_name + '_input']
                                        break
                                if cpu_temp != "N/A":
                                    break
                            if cpu_temp != "N/A":
                                print("Generated CPU Temperature (sensors):", cpu_temp)
                                return jsonify({"status": "success", "cpu_temperature": cpu_temp, "unit": "Celsius", "source": "lm-sensors"}), 200
                        else:
                            return jsonify({"status": "error", "message": "lm-sensors output empty or not parsed. Try 'get_cpu_temp' for a simulated value."}), 500
                    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError) as err:
                        print(f"Error with lm-sensors or vcgencmd, falling back to simulated: {err}")
                        # Fallback to simulated temperature if hardware read fails
                        dummy_temp = round(random.uniform(30, 60), 2)
                        return jsonify({"status": "success", "cpu_temperature": dummy_temp, "unit": "Celsius", "source": "simulated (hardware read failed)"}), 200

            except Exception as e:
                print(f"Unexpected error during CPU temp retrieval: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during CPU temp retrieval: {str(e)}"}), 500
        elif command == "run_speedtest":
            try:
                check_cmd_result = subprocess.run("command -v speedtest", shell=True, text=True, capture_output=True)

                if check_cmd_result.returncode != 0:
                    print("speedtest command not found. Attempting to install...")
                    # Assuming Debian/Ubuntu, adjust for other OS
                    install_cmd = "sudo apt update && sudo apt install -y speedtest-cli" # Or 'speedtest' if it's the newer official one
                    install_result = subprocess.run(install_cmd, shell=True, text=True, capture_output=True, check=True)
                    print("speedtest installation output:\n", install_result.stdout)
                    print("speedtest installation errors:\n", install_result.stderr)
                    print("speedtest installed.")
                else:
                    print("speedtest command is installed.")

                print("Running speedtest...")
                # Use `speedtest --json` for structured output
                speedtest_run_result = subprocess.run("speedtest --json", shell=True, text=True, capture_output=True, check=True, timeout=120)

                speedtest_output = speedtest_run_result.stdout.strip()
                speedtest_stderr = speedtest_run_result.stderr.strip()

                if speedtest_stderr:
                    print(f"Speedtest stderr: {speedtest_stderr}")

                if speedtest_output:
                    try:
                        speedtest_data = json.loads(speedtest_output)
                        return jsonify({"status": "success", "speedtest_results": speedtest_data}), 200
                    except json.JSONDecodeError:
                        print("Warning: speedtest --json output was not valid JSON. Returning raw output.")
                        return jsonify({"status": "success", "speedtest_raw_output": speedtest_output}), 200
                else:
                    return jsonify({"status": "error", "message": "Speedtest command returned no output.", "details": speedtest_stderr}), 500

            except subprocess.TimeoutExpired:
                print("Speedtest command timed out.")
                return jsonify({"status": "error", "message": "Speedtest command timed out after 120 seconds."}), 500
            except subprocess.CalledProcessError as e:
                error_stdout = e.stdout.strip()
                error_stderr = e.stderr.strip()
                print(f"Error during speedtest (CalledProcessError): {e}")
                return jsonify({"status": "error", "message": f"Speedtest failed (exit code {e.returncode}): {error_stderr}", "details": error_stdout}), 500
            except FileNotFoundError:
                return jsonify({"status": "error", "message": "speedtest or apt command not found. Ensure they are in PATH and speedtest is installed."}), 500
            except Exception as e:
                print(f"Unexpected error during speedtest: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during speedtest: {str(e)}"}), 500
        elif command == "send_sensor_data": # Command to trigger sending sensor data to master
            temp = round(random.uniform(20.0, 30.0), 2)
            hum = round(random.uniform(50.0, 70.0), 2)
            status = random.choice(["active", "warning"])

            success, response = send_sensor_data_to_master(temp, hum, status)
            if success:
                return jsonify({"status": "success", "message": "Sensor data sent to master.", "master_response": response}), 200
            else:
                return jsonify({"status": "error", "message": "Failed to send sensor data to master.", "master_error": response}), 500
        elif command == "trace_location":
            ip_to_trace = value # Use the provided value as IP, if any

            # If no IP is provided, try to get the public IP of the laptop
            if not ip_to_trace:
                try:
                    public_ip_response = requests.get("https://ifconfig.me/ip")
                    public_ip_response.raise_for_status()
                    ip_to_trace = public_ip_response.text.strip()
                    print(f"No IP provided, using public IP: {ip_to_trace}")
                except requests.exceptions.RequestException as e:
                    print(f"Error getting public IP: {e}")
                    return jsonify({"status": "error", "message": f"Failed to get public IP: {str(e)}"}), 500

            # Ensure ip_to_trace is a string before using it in the URL
            ip_to_trace_str = str(ip_to_trace) if ip_to_trace is not None else ""

            try:
                print(f"Tracing location for IP: {ip_to_trace_str}")
                geo_response = requests.get(f"http://ip-api.com/json/{ip_to_trace_str}")
                geo_response.raise_for_status()
                geo_data = geo_response.json()

                if geo_data is None:
                    return jsonify({"status": "error", "message": "Failed to parse geolocation response as JSON (response was empty).", "details": geo_response.text}), 500


                # Check for "fail" status from ip-api.com
                if geo_data.get("status") == "fail":
                    return jsonify({"status": "error", "message": geo_data.get("message", "Geolocation lookup failed"), "details": geo_data}), 400

                # Filter and format the relevant fields
                filtered_geo_data = {
                    "query": geo_data.get("query"),
                    "status": geo_data.get("status"),
                    "country": geo_data.get("country"),
                    "countryCode": geo_data.get("countryCode"),
                    "region": geo_data.get("region"),
                    "regionName": geo_data.get("regionName"),
                    "city": geo_data.get("city"),
                    "zip": geo_data.get("zip"),
                    "lat": geo_data.get("lat"),
                    "lon": geo_data.get("lon"),
                    "timezone": geo_data.get("timezone"),
                    "isp": geo_data.get("isp"),
                    "org": geo_data.get("org"),
                    "as": geo_data.get("as")
                }

                return jsonify({"status": "success", "ip_geolocation": filtered_geo_data}), 200
            except requests.exceptions.RequestException as e:
                print(f"Error tracing IP location: {e}")
                return jsonify({"status": "error", "message": f"Failed to trace IP location: {str(e)}"}), 500
            except json.JSONDecodeError as e:
                 print(f"Error decoding JSON from ip-api.com: {e}")
                 return jsonify({"status": "error", "message": f"Invalid JSON response from IP geolocation service: {str(e)}"}), 500
            except Exception as e:
                print(f"Unexpected error during IP location trace: {e}")
                return jsonify({"status": "error", "message": f"An unexpected error occurred during IP location trace: {str(e)}"}), 500
        elif command == "execute_command": # This is the new command handler
            if value: # Check if a command string was provided
                try:
                    # Execute the command as a shell command
                    # WARNING: This is highly insecure for untrusted input.
                    # For a real application, you must sanitize 'value' or use a whitelist of commands.
                    result = subprocess.run(value, shell=True, text=True, capture_output=True, check=False)

                    # Return stdout, stderr, and return code
                    return jsonify({
                        "status": "success",
                        "command_executed": value,
                        "stdout": result.stdout.strip(),
                        "stderr": result.stderr.strip(),
                        "return_code": result.returncode
                    }), 200
                except FileNotFoundError:
                    return jsonify({"status": "error", "message": f"Command not found: '{value.split(' ')[0]}'"}), 400
                except Exception as e:
                    return jsonify({"status": "error", "message": f"Error executing command: {str(e)}"}), 500
            else:
                return jsonify({"status": "error", "message": "No command string provided to execute."}), 400
        else:
            return jsonify({"status": "error", "message": f"Unknown command: {command}"}), 400

    except Exception as e:
        print(f"Error on Laptop Slave API: {e}")
        return jsonify({"status": "error", "message": f"Internal Laptop error: {str(e)}"}), 500 # Ensure e is converted to string

if __name__ == "__main__":
    # Initialize the scheduler
    scheduler = BackgroundScheduler()
    # Add the scheduled job
    scheduler.add_job(
        func=collect_and_send_sensor_data,
        trigger="interval",
        seconds=SENSOR_DATA_SEND_INTERVAL_SECONDS,
        id="sensor_data_collector",
        name="Collect and send sensor data to master"
    )
    # Start the scheduler
    scheduler.start()
    print(f"Scheduled sensor data collection to run every {SENSOR_DATA_SEND_INTERVAL_SECONDS} seconds.")

    # Run the Flask app
    app.run(host="0.0.0.0", port=SLAVE_API_PORT, debug=True, use_reloader=False)
