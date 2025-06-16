// src/api/deviceApi.js
const API_BASE_URL = 'http://localhost:5000/api/devices'; // IMPORTANT: Adjust if your backend is on a different host/port

// Helper for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Attempt to parse JSON error, fallback to text if not JSON
    const errorData = await response.json().catch(() => ({ message: response.statusText || 'Unknown error', details: response.statusText }));
    const error = new Error(errorData.message || 'API request failed');
    // Attach original response status and parsed data for more details
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  return response.json();
};

/**
 * Fetches a list of devices from the backend.
 * @param {boolean | null} isSimulated Optional. Filters devices by simulation status.
 * True for simulated, False for real, null/undefined for all.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of device objects.
 */
export const getDevices = async (isSimulated = null) => {
  let url = API_BASE_URL;
  const params = new URLSearchParams();
  if (isSimulated !== null) {
    params.append('is_simulated', isSimulated.toString());
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  const response = await fetch(url);
  return handleResponse(response);
};

/**
 * Adds a new device to the backend.
 * @param {Object} device The device object to add.
 * @returns {Promise<Object>} A promise that resolves to the backend response.
 */
export const addDevice = async (device) => {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(device),
  });
  return handleResponse(response);
};

/**
 * Updates an existing device on the backend.
 * @param {string} deviceId The ID of the device to update.
 * @param {Object} updatedData The partial device object with updated fields.
 * @returns {Promise<Object>} A promise that resolves to the backend response.
 */
export const updateDevice = async (deviceId, updatedData) => {
  const response = await fetch(`${API_BASE_URL}/${deviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedData),
  });
  return handleResponse(response);
};

/**
 * Deletes a device from the backend.
 * @param {string} deviceId The ID of the device to delete.
 * @returns {Promise<Object>} A promise that resolves to the backend response.
 */
export const deleteDevice = async (deviceId) => {
  const response = await fetch(`${API_BASE_URL}/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
};

/**
 * Sends a command to a specific device.
 * @param {string} deviceId The device_id of the target device.
 * @param {Object} payload The command and any associated value.
 * @returns {Promise<Object>} A promise that resolves to the backend response.
 */
export const sendCommand = async (deviceId, payload) => {
  const response = await fetch(`${API_BASE_URL}/${deviceId}/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};
