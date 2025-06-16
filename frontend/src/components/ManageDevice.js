// src/components/ManageDevices.js
import React, { useState, useEffect } from 'react';
import { getDevices, addDevice, deleteDevice, sendCommand } from '../api/deviceApi';
import toast, { Toaster } from 'react-hot-toast';

const ManageDevices = () => {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [commandResponse, setCommandResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [addFormVisible, setAddFormVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async (isSimulated = null) => {
    setLoading(true);
    try {
      const data = await getDevices(isSimulated);
      setDevices(data);
    } catch (error) {
      setErrorMessage(`Failed to fetch devices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleNewDeviceChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value }));
  };

  const toggleAddForm = () => {
    setAddFormVisible(prev => !prev);
    if (!addFormVisible) setNewDevice({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' });
  };

  const handleAddDevice = async (isSimulated) => {
    setLoading(true);
    const deviceToAdd = { ...newDevice, is_simulated: isSimulated };
    try {
      toast.loading('Adding device...');
      await addDevice(deviceToAdd);
      toast.success('Device added successfully');
      fetchDevices();
      toggleAddForm();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  };

  const handleDeleteDevice = async (deviceId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete device ${deviceId}?`)) return;
    setLoading(true);
    try {
      await deleteDevice(deviceId);
      toast.success('Device deleted');
      fetchDevices();
      if (selectedDevice?.device_id === deviceId) setSelectedDevice(null);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommand = async (command, value = '') => {
    if (!selectedDevice?.device_id) return toast.error('No device selected');
    setLoading(true);
    const payload = { command, ...(value && value.trim() !== '' && { value }) };
    try {
      const response = await sendCommand(selectedDevice.device_id, payload);
      setCommandResponse(response);
      toast.success('Command sent');
    } catch (err) {
      setCommandResponse(err.response?.data || { error: err.message });
      toast.error('Command failed');
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (data) => JSON.stringify(data, null, 2);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Device Management</h1>
          <button onClick={toggleAddForm} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow transition-all duration-300">
            {addFormVisible ? 'Close Form' : 'Add Device'}
          </button>
        </div>

        {addFormVisible && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddDevice(false); }} className="bg-slate-900 p-6 rounded-lg mb-6 shadow space-y-4">
            {['device_id', 'name', 'type', 'ip_address', 'mac_address', 'master_device_id'].map((field) => (
              <input
                key={field}
                name={field}
                value={newDevice[field] || ''}
                onChange={handleNewDeviceChange}
                placeholder={field.replace('_', ' ').toUpperCase()}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ))}
            <textarea
              name="public_key"
              value={newDevice.public_key || ''}
              onChange={handleNewDeviceChange}
              placeholder="Public Key"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md">Add Real</button>
              <button type="button" onClick={() => handleAddDevice(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md">Add Simulated</button>
            </div>
          </form>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Devices</h2>
            <div className="flex gap-2 mb-4">
              {['All', 'Real', 'Simulated'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => fetchDevices(i === 1 ? false : i === 2 ? true : null)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1 rounded-md"
                >{label}</button>
              ))}
            </div>
            <table className="w-full text-sm table-auto">
              <thead className="bg-slate-800">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device._id} onClick={() => setSelectedDevice(device)} className="hover:bg-slate-800 cursor-pointer">
                    <td className="p-2">{device.name}</td>
                    <td className="p-2">{device.device_id}</td>
                    <td className="p-2">{device.type}</td>
                    <td className="p-2">{device.status}</td>
                    <td className="p-2">
                      <button onClick={(e) => handleDeleteDevice(device.device_id, e)} className="text-rose-400 hover:text-rose-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedDevice && (
            <div className="bg-slate-900 rounded-lg p-6 shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{selectedDevice.name}</h2>
                <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-white">Close</button>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>ID:</strong> {selectedDevice.device_id}</p>
                <p><strong>Type:</strong> {selectedDevice.type}</p>
                <p><strong>IP:</strong> {selectedDevice.ip_address || 'N/A'}</p>
                <p><strong>MAC:</strong> {selectedDevice.mac_address || 'N/A'}</p>
                <p><strong>Status:</strong> {selectedDevice.status}</p>
                <p><strong>Location:</strong> {selectedDevice.location || 'N/A'}</p>
                <p><strong>Last Seen:</strong> {selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString() : 'N/A'}</p>
                <p><strong>Registered At:</strong> {selectedDevice.registeredAt ? new Date(selectedDevice.registeredAt).toLocaleString() : 'N/A'}</p>
                <p><strong>Master ID:</strong> {selectedDevice.master_device_id || 'N/A'}</p>
                {/* {selectedDevice.public_key && (
                  <div>
                    <strong>Public Key:</strong>
                    <pre className="bg-slate-800 p-2 rounded text-xs overflow-x-auto break-words whitespace-pre-wrap border border-slate-700 text-slate-100">{selectedDevice.public_key}</pre>
                  </div>
                )}
                <p><strong>Simulated:</strong> {selectedDevice.is_simulated ? 'Yes' : 'No'}</p> */}
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Send Command:</h3>
                {[
                  'system_info', 'network_info', 'disk_usage', 'cpu_temp',
                  'ping_test', 'run_speedtest', 'trace_location', 'send_sensor_data',
                  'update_system', 'reboot_pi', 'shutdown_pi'
                ].map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleSendCommand(cmd)}
                    className="bg-indigo-600 hover:bg-indigo-500 btn-text px-3 py-1 rounded-md mr-2"
                  >{cmd}</button>
                ))}
                <div className="flex items-center space-x-2 mt-2">
                  <input type="text" id="messageInput" placeholder="Message to display"
                         className="flex-1 shadow-inner appearance-none border border-slate-700 rounded-md py-2 px-3 text-slate-100 bg-slate-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <button onClick={() => handleSendCommand('display_message', document.getElementById('messageInput').value)}
                          className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                    Display Message
                  </button>
                </div>
              </div>
              {commandResponse && (
                <div className="mt-6 bg-slate-800 p-4 rounded-lg shadow-inner border border-slate-700">
                  <h4 className="text-lg font-semibold text-blue-300 mb-2">Command Response:</h4>
                  <pre className="bg-slate-900 p-3 rounded-md text-sm text-white overflow-x-auto whitespace-pre-wrap border border-slate-700">{formatJson(commandResponse)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDevices;
