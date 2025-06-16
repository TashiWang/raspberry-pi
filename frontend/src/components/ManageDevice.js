import React, { useState, useEffect } from 'react';
// Assuming '../api/deviceApi' provides the actual API functions
import { getDevices, addDevice, deleteDevice, sendCommand } from '../api/deviceApi';
import toast, { Toaster } from 'react-hot-toast';
import styles from './ManageDevices.module.css';

// --- Font Awesome Imports ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faInfoCircle,
  faPowerOff,
  faExclamationTriangle,
  faUser, // For user profile button
  faServer, // For device icon in cards and header
  faCheckCircle, // For online count
  faBolt, // Alternative for power on (if faPowerOff is used for both/off)
  faPlay, // For Power On
  faStop, // For Power Off
  faWifi, // For network icon (if needed)
  faChartLine, // For activity/commands today
  faSearch, // For search bar
  faRedo // For reboot
  
} from '@fortawesome/free-solid-svg-icons';
// --- End Font Awesome Imports ---

const ManageDevices = () => {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' });
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('All'); // 'All', 'Real', 'Simulated'
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [commandResponse, setCommandResponse] = useState(null);
  const [customMessage, setCustomMessage] = useState(''); // Changed from messageToDisplay
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Effect to manage body scroll when modal is open
  useEffect(() => {
    if (isAddDeviceModalOpen) {
      document.body.classList.add(styles.modalOpen); // Use CSS module class
    } else {
      document.body.classList.remove(styles.modalOpen); // Use CSS module class
    }
    // Cleanup function
    return () => {
      document.body.classList.remove(styles.modalOpen);
    };
  }, [isAddDeviceModalOpen]);

  // Data Fetching Logic
  const fetchDevicesData = async (isSimulated = null) => {
    setLoading(true);
    setErrorMessage(null); // Clear previous errors
    try {
      const data = await getDevices(isSimulated);
      setDevices(data);
    } catch (error) {
      setErrorMessage(`Failed to fetch devices: ${error.message || 'Unknown error'}`);
      toast.error(`Failed to fetch devices: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesData(); // Initial fetch on component mount
  }, []); // Empty dependency array means run once on mount

  // Derived state for summary cards
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const needsAttentionDevices = devices.filter(d => d.status === 'offline' || d.status === 'warning').length;
  const commandsToday = '—'; // Placeholder as per image, logic would be complex and depend on your backend

  // Filtering logic
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (device.ip_address && device.ip_address.includes(searchTerm));
    
    const matchesFilter = deviceFilter === 'All' ||
                          (deviceFilter === 'Real' && !device.is_simulated) || 
                          (deviceFilter === 'Simulated' && device.is_simulated);
    return matchesSearch && matchesFilter;
  });

  const selectedDevice = devices.find(d => d._id === selectedDeviceId); // Use _id for selection

  const handleDeviceCardClick = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCommandResponse(null); // Clear response when selecting new device
    setCustomMessage(''); // Clear custom message input
  };

  const handleNewDeviceChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDevice = async (isSimulated) => {
    if (!newDevice.device_id || !newDevice.name) {
      toast.error('Device ID and Name are required.');
      return;
    }

    setLoading(true);
    const deviceToAdd = { 
      ...newDevice, 
      is_simulated: isSimulated,
      status: newDevice.status || 'online', // Default status if not provided
      registeredAt: new Date().toISOString(), // Add timestamp
      last_seen: new Date().toISOString(), // Add timestamp
      commands: ['system_info', 'network_info', 'reboot', 'display_message'], // Default commands
      // Ensure these match your backend expected fields:
      ip_address: newDevice.ip_address || 'N/A',
      mac_address: newDevice.mac_address || 'N/A',
      location: newDevice.location || 'N/A',
      firmware: newDevice.firmware || 'v1.0.0',
      master_device_id: newDevice.master_device_id || 'N/A',
      public_key: newDevice.public_key || 'N/A'
    };

    try {
      toast.loading('Adding device...', { id: 'addDeviceToast' });
      await addDevice(deviceToAdd); // Call your actual addDevice API
      toast.success('Device added successfully', { id: 'addDeviceToast' });
      fetchDevicesData(deviceFilter === 'Real' ? false : deviceFilter === 'Simulated' ? true : null); // Re-fetch based on current filter
      setIsAddDeviceModalOpen(false); // Close modal on success
      setNewDevice({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' }); // Reset form
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error occurred.';
      toast.error(`Error: ${msg}`, { id: 'addDeviceToast' });
      setErrorMessage(`Failed to add device: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId, e) => {
    e.stopPropagation(); // Prevent card selection when delete button is clicked
    if (!window.confirm(`Are you sure you want to delete device ${deviceId}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      toast.loading('Deleting device...', { id: 'deleteDeviceToast' });
      await deleteDevice(deviceId); // Call your actual deleteDevice API
      toast.success('Device deleted successfully', { id: 'deleteDeviceToast' });
      fetchDevicesData(deviceFilter === 'Real' ? false : deviceFilter === 'Simulated' ? true : null); // Re-fetch based on current filter
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId(null); // Deselect if the deleted device was selected
        setCommandResponse(null); // Clear command response
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error occurred.';
      toast.error(`Error: ${msg}`, { id: 'deleteDeviceToast' });
      setErrorMessage(`Failed to delete device: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommand = async (command, value = '') => {
    if (!selectedDevice?.device_id) {
      toast.error('Please select a device first.');
      return;
    }

    setLoading(true);
    setCommandResponse(null); // Clear previous response
    const payload = { command, ...(value && value.trim() !== '' && { value }) };
    try {
      toast.loading(`Sending '${command}' to ${selectedDevice.name}...`, { id: 'sendCommandToast' });
      const response = await sendCommand(selectedDevice.device_id, payload); // Call your actual sendCommand API
      setCommandResponse(response); // Display API response directly
      toast.success('Command sent successfully!', { id: 'sendCommandToast' });
    } catch (err) {
      const errMsg = err.response?.data || { error: err.message || 'Unknown error' };
      setCommandResponse(errMsg); // Display error response
      toast.error('Command failed. See response for details.', { id: 'sendCommandToast' });
      setErrorMessage(`Failed to send command: ${errMsg.error || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to format JSON for display in <pre> tag
  const formatJson = (data) => JSON.stringify(data, null, 2);

  return (
    <div className={styles.manageDevicesContainer}>
      <Toaster position="top-right" reverseOrder={false} />

      <div className={styles.maxWidth7xl}>

        {/* Dashboard Header */}
        <header className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            {/* <FontAwesomeIcon icon={faServer} className={styles.headerIcon} /> */}
            {/* <div className={styles.headerTitles}>
              <h1 className={styles.h1Title}>Device Management</h1>
              <p className={styles.dashboardSubtitle}>Professional IoT Dashboard</p>
            </div> */}
          </div>
          <div className={styles.headerRight}>
            <button onClick={() => setIsAddDeviceModalOpen(true)} className={`${styles.buttonBase} ${styles.addDeviceButton}`} disabled={loading}>
              <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Add Device
            </button>
            <button className={styles.userProfileButton}>
              <FontAwesomeIcon icon={faUser} />
            </button>
          </div>
        </header>

        {/* Summary Cards Grid */}
        <div className={styles.summaryCardsGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faServer} className={`${styles.summaryCardIcon} ${styles.total}`} />
              <span className={styles.summaryCardCount}>{totalDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Total Devices <br/>Registered devices</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faCheckCircle} className={`${styles.summaryCardIcon} ${styles.online}`} />
              <span className={styles.summaryCardCount}>{onlineDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Online <br/>Connected and active</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faExclamationTriangle} className={`${styles.summaryCardIcon} ${styles.attention}`} />
              <span className={styles.summaryCardCount}>{needsAttentionDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Needs Attention <br/>Offline or warning</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faChartLine} className={`${styles.summaryCardIcon} ${styles.commands}`} />
              <span className={`${styles.summaryCardCount} ${styles.placeholder}`}>{commandsToday}</span>
            </div>
            <div className={styles.summaryCardLabel}>Commands Today <br/>Activity metrics</div>
          </div>
        </div>

        {errorMessage && <p className={styles.errorMessage}><FontAwesomeIcon icon={faExclamationTriangle} className={styles.iconRightMargin} /> {errorMessage}</p>}

        {/* Main Content Area */}
        <div className={styles.mainContentGrid}>
          {/* Left Panel: Devices List (Cards) */}
          <div className={styles.devicesPanel}>
            <h2 className={styles.devicesPanelTitle}>Devices</h2>
            <div className={styles.searchAndFilter}>
              <div className={styles.searchBar}>
                <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search devices..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className={styles.filterButtonsGroup}>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'All' ? styles.active : ''}`}
                  onClick={() => {setDeviceFilter('All'); fetchDevicesData(null);}}
                  disabled={loading}
                >
                  All
                </button>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'Real' ? styles.active : ''}`}
                  onClick={() => {setDeviceFilter('Real'); fetchDevicesData(false);}}
                  disabled={loading}
                >
                  Real
                </button>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'Simulated' ? styles.active : ''}`}
                  onClick={() => {setDeviceFilter('Simulated'); fetchDevicesData(true);}}
                  disabled={loading}
                >
                  Simulated
                </button>
              </div>
            </div>

            <div className={styles.deviceList}>
              {loading && <p className={styles.loadingMessage}><FontAwesomeIcon icon={faSpinner} spin className={styles.iconRightMargin} /> Loading devices...</p>}
              {!loading && filteredDevices.length === 0 ? (
                <div className={styles.emptyMessage}>
                  <FontAwesomeIcon icon={faInfoCircle} className={styles.noDeviceIcon} />
                  <p>No devices found matching your criteria.</p>
                </div>
              ) : (
                filteredDevices.map(device => (
                  <div
                    key={device._id} // Use _id as unique key for React list
                    className={`${styles.deviceCard} ${selectedDeviceId === device._id ? styles.selected : ''}`}
                    onClick={() => handleDeviceCardClick(device._id)}
                  >
                    <FontAwesomeIcon icon={faServer} className={styles.deviceIcon} /> {/* Generic server/device icon */}
                    <div className={styles.deviceDetailsMain}>
                      <span className={styles.deviceName}>{device.name}</span>
                      <span className={styles.deviceSubText}>ID: {device.device_id}</span>
                      {device.type && <span className={styles.deviceSubText}>Type: <strong>{device.type}</strong></span>}
                      {device.ip_address && <span className={styles.deviceSubText}>IP: <strong>{device.ip_address}</strong></span>}
                      {device.location && <span className={styles.deviceSubText}>Location: {device.location}</span>}
                      {device.last_seen && <span className={styles.deviceSubText}>Last Seen: {new Date(device.last_seen).toLocaleString()}</span>}
                    </div>
                    <div className={styles.deviceStatusActions}>
                      {device.status && (
                        <span className={`${styles.deviceStatus} ${styles[device.status]}`}>
                          {device.status}
                        </span>
                      )}
                      <div className={styles.actionButtons}>
                        {/* Power On/Off Buttons */}
                        <button
                          className={`${styles.cardActionButton} ${styles.powerOn}`}
                          onClick={(e) => { e.stopPropagation(); handleSendCommand('power_on'); }}
                          title="Power On"
                          disabled={loading || device.status === 'online'} // Disable if already online
                        >
                          <FontAwesomeIcon icon={faPlay} />
                        </button>
                        <button
                          className={`${styles.cardActionButton} ${styles.powerOff}`}
                          onClick={(e) => { e.stopPropagation(); handleSendCommand('shut_down'); }}
                          title="Power Off"
                          disabled={loading || device.status === 'offline'} // Disable if already offline
                        >
                          <FontAwesomeIcon icon={faStop} />
                        </button>
                        {/* Delete Button */}
                        <button
                          className={`${styles.cardActionButton} ${styles.delete}`}
                          onClick={(e) => handleDeleteDevice(device.device_id, e)}
                          title="Delete Device"
                          disabled={loading}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Selected Device Details */}
          <div className={styles.deviceDetailPanel}>
            {selectedDevice ? (
              <div className={styles.selectedDeviceContent}>
                <div className={styles.selectedDeviceHeader}>
                  <h3 className={styles.selectedDeviceName}>{selectedDevice.name} Details</h3>
                   <button
                    className={styles.buttonClose}
                    onClick={() => { setSelectedDeviceId(null); setCommandResponse(null); setCustomMessage(''); }}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>

                <div className={styles.deviceDetails}>
                  {selectedDevice.type && <><strong>Type:</strong> <span>{selectedDevice.type}</span></>}
                  {selectedDevice.device_id && <><strong>ID:</strong> <span>{selectedDevice.device_id}</span></>}
                  {selectedDevice.ip_address && <><strong>IP Address:</strong> <span>{selectedDevice.ip_address}</span></>}
                  {selectedDevice.mac_address && <><strong>MAC Address:</strong> <span>{selectedDevice.mac_address}</span></>}
                  {selectedDevice.location && <><strong>Location:</strong> <span>{selectedDevice.location}</span></>}
                  {selectedDevice.firmware && <><strong>Firmware:</strong> <span>{selectedDevice.firmware}</span></>}
                  {selectedDevice.status && (
                    <>
                      <strong>Status:</strong> <span className={`${styles.deviceStatus} ${styles[selectedDevice.status]}`}>
                        {selectedDevice.status}
                      </span>
                    </>
                  )}
                  {selectedDevice.last_seen && <><strong>Last Seen:</strong> <span>{new Date(selectedDevice.last_seen).toLocaleString()}</span></>}
                  {selectedDevice.registeredAt && <><strong>Registered At:</strong> <span>{new Date(selectedDevice.registeredAt).toLocaleString()}</span></>}
                  {selectedDevice.master_device_id && <><strong>Master Device ID:</strong> <span>{selectedDevice.master_device_id}</span></>}
                  {selectedDevice.public_key && <><strong>Public Key:</strong> <pre>{selectedDevice.public_key}</pre></>}
                </div>

                {/* Commands Section */}
                <div className={styles.commandSection}>
                  <h4 className={styles.commandTitle}>Commands</h4>
                  <div className={styles.commandButtonsGroup}>
                    {/* Common Commands */}
                    {['system_info', 'network_info', 'reboot'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => handleSendCommand(cmd)}
                        className={styles.commandButton}
                        disabled={loading}
                      >
                        {cmd.replace(/_/g, ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className={styles.messageInputGroup}>
                    <input
                      type="text"
                      placeholder="Send custom message..."
                      className={styles.messageInput}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      className={`${styles.buttonBase} ${styles.displayMessageButton}`}
                      onClick={() => handleSendCommand('display_message', customMessage)}
                      disabled={loading || !customMessage.trim()}
                    >
                      <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Send Message
                    </button>
                  </div>

                  <div className={styles.commandResponseSection}>
                    <h5 className={styles.commandResponseTitle}>Command Response:</h5>
                    <pre className={styles.commandResponsePre}>
                      {commandResponse ? formatJson(commandResponse) : 'Awaiting command response...'}
                    </pre>
                  </div>
                </div>

                {/* Footer buttons: Info, Reboot, Manage */}
                <div className={styles.commandSection}>
                    <div className={styles.commandButtonsGroup}>
                        <button className={styles.commandButton} onClick={() => handleSendCommand('system_info')} disabled={loading}>
                          <FontAwesomeIcon icon={faInfoCircle} className={styles.iconRightMargin} /> Info
                        </button>
                        <button className={styles.commandButton} onClick={() => handleSendCommand('reboot')} disabled={loading}>
                          <FontAwesomeIcon icon={faRedo} className={styles.iconRightMargin} /> Reboot
                        </button>
                        <button className={styles.commandButton} onClick={() => toast('Manage functionality would open a new view or modal')} disabled={loading}>
                          Manage <FontAwesomeIcon icon={faPlus} className={styles.iconLeftMargin} />
                        </button>
                    </div>
                </div>

              </div>
            ) : (
              <div className={styles.noDeviceSelected}>
                <FontAwesomeIcon icon={faServer} className={styles.noDeviceIcon} />
                <p className={styles.noDeviceText}>No Device Selected</p>
                <p className={styles.noDeviceText}>Click on a device card to view details and send commands</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {isAddDeviceModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddDeviceModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddDeviceModalOpen(false)} className={styles.modalCloseButton} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.panelTitle}>Add New Device</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddDevice(false); }} className={styles.formContainer}>
              {/* Form fields for new device. */}
              {['device_id', 'name', 'type', 'ip_address', 'mac_address', 'location', 'firmware', 'master_device_id'].map((field) => (
                <input
                  key={field}
                  name={field}
                  value={newDevice[field] || ''}
                  onChange={handleNewDeviceChange}
                  placeholder={
                    field.replace(/_/g, ' ').toUpperCase() +
                    (field === 'device_id' || field === 'name' ? ' (Required)' : ' (Optional)')
                  }
                  className={styles.formInput}
                  required={field === 'device_id' || field === 'name'}
                  disabled={loading}
                />
              ))}
              <textarea
                name="public_key"
                value={newDevice.public_key || ''}
                onChange={handleNewDeviceChange}
                placeholder="Public Key (Optional)"
                className={styles.formInput}
                rows="3"
                disabled={loading}
              />
              <div className={styles.formButtons}>
                <button type="submit" className={styles.buttonAddReal} disabled={loading}>
                  <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Add Real Device
                </button>
                <button type="button" onClick={() => handleAddDevice(true)} className={styles.buttonAddSimulated} disabled={loading}>
                  <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Add Simulated Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDevices;