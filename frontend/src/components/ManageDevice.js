import React, { useState, useEffect, useRef } from 'react';
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
  faRedo, // For reboot
  faRefresh, // For speedtest/refresh action
  faCopy, // For copy to clipboard
  faCheck // For copied feedback
} from '@fortawesome/free-solid-svg-icons';
// --- End Font Awesome Imports ---

const ManageDevices = () => {
  // State variables for managing device data and UI state
  const [devices, setDevices] = useState([]); // Stores the list of devices
  // State for the new device form fields
  const [newDevice, setNewDevice] = useState({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' });
  const [searchTerm, setSearchTerm] = useState(''); // For device search functionality
  const [deviceFilter, setDeviceFilter] = useState('All'); // 'All', 'Real', 'Simulated'
  const [selectedDeviceId, setSelectedDeviceId] = useState(null); // ID of the currently selected device
  const [commandResponse, setCommandResponse] = useState(null); // Stores the response from a command
  // State for the custom command input (terminal-like field)
  const [customMessage, setCustomMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null); // For displaying error messages
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false); // Controls add device modal visibility
  const [loading, setLoading] = useState(false); // Global loading indicator
  // State for the copy to clipboard button text/icon
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  // Ref to access the DOM element of the command response <pre> tag for copying
  const commandResponseRef = useRef(null);

  // Effect to manage body scroll when the Add Device modal is open
  useEffect(() => {
    if (isAddDeviceModalOpen) {
      // Add a CSS class to the body to prevent scrolling when modal is open
      document.body.classList.add(styles.modalOpen);
    } else {
      // Remove the CSS class when modal is closed
      document.body.classList.remove(styles.modalOpen);
    }
    // Cleanup function: ensures the class is removed if component unmounts while modal is open
    return () => {
      document.body.classList.remove(styles.modalOpen);
    };
  }, [isAddDeviceModalOpen]); // Rerun effect when isAddDeviceModalOpen changes

  // Function to fetch device data from the API
  const fetchDevicesData = async (isSimulated = null) => {
    setLoading(true); // Set loading state to true before fetching
    setErrorMessage(null); // Clear any previous error messages
    try {
      // Call the getDevices API, optionally filtering by simulated status
      const data = await getDevices(isSimulated);
      setDevices(data); // Update devices state with fetched data
    } catch (error) {
      // Catch and display any errors during fetching
      setErrorMessage(`Failed to fetch devices: ${error.message || 'Unknown error'}`);
      toast.error(`Failed to fetch devices: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false); // Set loading state to false after fetch completes
    }
  };

  // Effect hook to perform initial data fetch on component mount
  useEffect(() => {
    fetchDevicesData(); // Call fetchDevicesData when the component mounts
  }, []); // Empty dependency array means this effect runs only once

  // Derived state: calculate summary counts for dashboard cards
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const needsAttentionDevices = devices.filter(d => d.status === 'offline' || d.status === 'warning').length;
  const commandsToday = '—'; // Placeholder, actual logic would involve tracking commands

  // Filter devices based on search term and selected filter type (All, Real, Simulated)
  const filteredDevices = devices.filter(device => {
    // Check if device name, ID, or IP address matches the search term (case-insensitive)
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (device.ip_address && device.ip_address.includes(searchTerm));

    // Check if the device matches the selected filter (Real, Simulated, or All)
    const matchesFilter = deviceFilter === 'All' ||
                          (deviceFilter === 'Real' && !device.is_simulated) ||
                          (deviceFilter === 'Simulated' && device.is_simulated);
    return matchesSearch && matchesFilter; // Both search and filter conditions must be met
  });

  // Find the currently selected device object based on selectedDeviceId
  const selectedDevice = devices.find(d => d._id === selectedDeviceId);

  // Handler for clicking on a device card
  const handleDeviceCardClick = (deviceId) => {
    setSelectedDeviceId(deviceId); // Set the selected device
    setCommandResponse(null); // Clear previous command response
    setCustomMessage(''); // Clear custom message input
    setCopyButtonText('Copy'); // Reset copy button text
  };

  // Handler for changes in the new device form fields
  const handleNewDeviceChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: value })); // Update the newDevice state
  };

  // Handler for adding a new device (real or simulated)
  const handleAddDevice = async (isSimulated) => {
    // Basic validation: Device ID and Name are required
    if (!newDevice.device_id || !newDevice.name) {
      toast.error('Device ID and Name are required.');
      return;
    }

    setLoading(true); // Set loading state
    // Prepare the device object to be added, including default/placeholder fields
    const deviceToAdd = {
      ...newDevice,
      is_simulated: isSimulated,
      status: newDevice.status || 'online', // Default status if not provided
      registeredAt: new Date().toISOString(), // Add current timestamp
      last_seen: new Date().toISOString(), // Add current timestamp
      commands: ['system_info', 'network_info', 'reboot_pi', 'display_message'], // Default command list
      // Ensure these match your backend expected fields:
      ip_address: newDevice.ip_address || 'N/A',
      mac_address: newDevice.mac_address || 'N/A',
      location: newDevice.location || 'N/A',
      firmware: newDevice.firmware || 'v1.0.0',
      master_device_id: newDevice.master_device_id || 'N/A',
      public_key: newDevice.public_key || 'N/A'
    };

    try {
      toast.loading('Adding device...', { id: 'addDeviceToast' }); // Show loading toast
      await addDevice(deviceToAdd); // Call the addDevice API
      toast.success('Device added successfully', { id: 'addDeviceToast' }); // Show success toast
      // Re-fetch devices based on the current filter to update the list
      fetchDevicesData(deviceFilter === 'Real' ? false : deviceFilter === 'Simulated' ? true : null);
      setIsAddDeviceModalOpen(false); // Close the modal
      setNewDevice({ device_id: '', name: '', type: 'raspberry_pi', status: 'online' }); // Reset form fields
    } catch (err) {
      // Handle errors during device addition
      const msg = err.response?.data?.message || err.message || 'Unknown error occurred.';
      toast.error(`Error: ${msg}`, { id: 'addDeviceToast' });
      setErrorMessage(`Failed to add device: ${msg}`);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handler for deleting a device
  const handleDeleteDevice = async (deviceId, e) => {
    e.stopPropagation(); // Prevent the parent card's onClick from firing
    // Confirmation dialog before deleting
    if (!window.confirm(`Are you sure you want to delete device ${deviceId}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true); // Set loading state
    try {
      toast.loading('Deleting device...', { id: 'deleteDeviceToast' }); // Show loading toast
      await deleteDevice(deviceId); // Call the deleteDevice API
      toast.success('Device deleted successfully', { id: 'deleteDeviceToast' }); // Show success toast
      // Re-fetch devices to update the list
      fetchDevicesData(deviceFilter === 'Real' ? false : deviceFilter === 'Simulated' ? true : null);
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId(null); // Deselect if the deleted device was selected
        setCommandResponse(null); // Clear command response
      }
    } catch (err) {
      // Handle errors during device deletion
      const msg = err.response?.data?.message || err.message || 'Unknown error occurred.';
      toast.error(`Error: ${msg}`, { id: 'deleteDeviceToast' });
      setErrorMessage(`Failed to delete device: ${msg}`);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handler for sending a command to the selected device
  const handleSendCommand = async (command, value = '') => {
    // Ensure a device is selected before sending a command
    if (!selectedDevice?.device_id) {
      toast.error('Please select a device first.');
      return;
    }

    setLoading(true); // Set loading state
    setCommandResponse(null); // Clear previous command response
    setCopyButtonText('Copy'); // Reset copy button text
    // Create payload, only include 'value' if it's not empty
    const payload = { command, ...(value && value.trim() !== '' && { value }) };
    try {
      toast.loading(`Sending '${command}' to ${selectedDevice.name}...`, { id: 'sendCommandToast' }); // Show loading toast
      const response = await sendCommand(selectedDevice.device_id, payload); // Call the sendCommand API
      setCommandResponse(response); // Store the API response
      toast.success('Command sent successfully!', { id: 'sendCommandToast', duration: 3000 }); // Show success toast
    } catch (err) {
      // Handle errors during command sending
      const errMsg = err.response?.data || { error: err.message || 'Unknown error' };
      setCommandResponse(errMsg); // Display the error response
      toast.error('Command failed. See response for details.', { id: 'sendCommandToast', duration: 5000 });
      setErrorMessage(`Failed to send command: ${errMsg.error || 'Unknown error'}`);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Utility function to format JSON data for display in <pre> tags
  const formatJson = (data) => JSON.stringify(data, null, 2);

  // Function to copy the command response to the clipboard
  const handleCopyResponse = () => {
    if (commandResponseRef.current) {
      // Get the text content from the element referenced by commandResponseRef
      const textToCopy = commandResponseRef.current.textContent;
      // Use the Clipboard API to write text to clipboard
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopyButtonText('Copied!'); // Change button text to indicate success
          toast.success('Response copied to clipboard!'); // Show success toast
          // Reset button text after 2 seconds
          setTimeout(() => setCopyButtonText('Copy'), 2000);
        })
        .catch(err => {
          // Log and display error if copy fails
          console.error('Failed to copy text: ', err);
          toast.error('Failed to copy response.');
        });
    }
  };

  return (
    <div className={styles.manageDevicesContainer}>
      {/* Toast notifications container */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Main content wrapper with max width */}
      <div className={styles.maxWidth7xl}>

        {/* Dashboard Header Section */}
        <header className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            {/* Header titles removed as per design spec, keeping structure */}
          </div>
          <div className={styles.headerRight}>
            {/* Button to open Add Device modal */}
            <button onClick={() => setIsAddDeviceModalOpen(true)} className={`${styles.buttonBase} ${styles.addDeviceButton}`} disabled={loading}>
              <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Add Device
            </button>
            {/* User profile button */}
            <button className={styles.userProfileButton}>
              <FontAwesomeIcon icon={faUser} />
            </button>
          </div>
        </header>

        {/* Summary Cards Grid for device statistics */}
        <div className={styles.summaryCardsGrid}>
          {/* Total Devices Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faServer} className={`${styles.summaryCardIcon} ${styles.total}`} />
              <span className={styles.summaryCardCount}>{totalDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Total Devices <br/>Registered devices</div>
          </div>

          {/* Online Devices Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faCheckCircle} className={`${styles.summaryCardIcon} ${styles.online}`} />
              <span className={styles.summaryCardCount}>{onlineDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Online <br/>Connected and active</div>
          </div>

          {/* Needs Attention Devices Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faExclamationTriangle} className={`${styles.summaryCardIcon} ${styles.attention}`} />
              <span className={styles.summaryCardCount}>{needsAttentionDevices}</span>
            </div>
            <div className={styles.summaryCardLabel}>Needs Attention <br/>Offline or warning</div>
          </div>

          {/* Commands Today Card (placeholder) */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTop}>
              <FontAwesomeIcon icon={faChartLine} className={`${styles.summaryCardIcon} ${styles.commands}`} />
              <span className={`${styles.summaryCardCount} ${styles.placeholder}`}>{commandsToday}</span>
            </div>
            <div className={styles.summaryCardLabel}>Commands Today <br/>Activity metrics</div>
          </div>
        </div>

        {/* Display general error messages if any */}
        {errorMessage && <p className={styles.errorMessage}><FontAwesomeIcon icon={faExclamationTriangle} className={styles.iconRightMargin} /> {errorMessage}</p>}

        {/* Main Content Area: Divided into Left (Devices List) and Right (Details) Panels */}
        <div className={styles.mainContentGrid}>
          {/* Left Panel: Devices List (Cards) */}
          <div className={styles.devicesPanel}>
            <h2 className={styles.devicesPanelTitle}>Devices</h2>
            {/* Search and Filter Section */}
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

            {/* List of Device Cards */}
            <div className={styles.deviceList}>
              {loading && <p className={styles.loadingMessage}><FontAwesomeIcon icon={faSpinner} spin className={styles.iconRightMargin} /> Loading devices...</p>}
              {!loading && filteredDevices.length === 0 ? (
                // Message when no devices are found
                <div className={styles.emptyMessage}>
                  <FontAwesomeIcon icon={faInfoCircle} className={styles.noDeviceIcon} />
                  <p>No devices found matching your criteria.</p>
                </div>
              ) : (
                // Map through filtered devices and render a card for each
                filteredDevices.map(device => (
                  <div
                    key={device._id} // Unique key for React list rendering
                    className={`${styles.deviceCard} ${selectedDeviceId === device._id ? styles.selected : ''}`}
                    onClick={() => handleDeviceCardClick(device._id)}
                  >
                    <FontAwesomeIcon icon={faServer} className={styles.deviceIcon} />
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
                        {/* Power On Button */}
                        <button
                          className={`${styles.cardActionButton} ${styles.powerOn}`}
                          onClick={(e) => { e.stopPropagation(); handleSendCommand('power_on'); }}
                          title="Power On"
                          disabled={loading || device.status === 'online'}
                        >
                          <FontAwesomeIcon icon={faPlay} />
                        </button>
                        {/* Power Off Button */}
                        <button
                          className={`${styles.cardActionButton} ${styles.powerOff}`}
                          onClick={(e) => { e.stopPropagation(); handleSendCommand('shut_down'); }}
                          title="Power Off"
                          disabled={loading || device.status === 'offline'}
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
                   {/* Button to close the details panel */}
                   <button
                    className={styles.buttonClose}
                    onClick={() => { setSelectedDeviceId(null); setCommandResponse(null); setCustomMessage(''); setCopyButtonText('Copy'); }}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>

                {/* Display selected device's details */}
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
                  {selectedDevice.public_key && <><strong>Public Key:</strong> <pre>{selectedDevice.public_key}</pre></>} {/* Corrected Fragment Closure */}
                </div>

                {/* Commands Section for selected device */}
                <div className={styles.commandSection}>
                  <h4 className={styles.commandTitle}>Commands</h4>
                  <div className={styles.commandButtonsGroup}>
                    {/* Common command buttons */}
                    {['system_info', 'network_info', 'disk_usage', 'update_system', 'reboot_pi', 'shutdown_pi'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => handleSendCommand(cmd)}
                        className={styles.commandButton}
                        disabled={loading}
                      >
                        {cmd.replace(/_/g, ' ').toUpperCase()} {/* Format command string for display */}
                      </button>
                    ))}
                  </div>

                  {/* Terminal-like Input for custom messages/commands */}
                  <div className={styles.terminalInputGroup}>
                    <span className={styles.terminalPrompt}>$</span> {/* The terminal prompt */}
                    <input
                      type="text"
                      placeholder="eg. ifconfig wlan0"
                      className={styles.messageInput}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      onKeyDown={(e) => { // Allows sending command on Enter key press
                        if (e.key === 'Enter' && customMessage.trim()) {
                          handleSendCommand('execute_command', customMessage); // Send the command
                          setCustomMessage(''); // Clear input after sending
                        }
                      }}
                      disabled={loading}
                    />
                    <button
                      className={`${styles.buttonBase} ${styles.displayMessageButton}`}
                      onClick={() => handleSendCommand('execute_command', customMessage)}
                      disabled={loading || !customMessage.trim()}
                    >
                      <FontAwesomeIcon icon={faPlus} className={styles.iconRightMargin} /> Send Command
                    </button>
                  </div>

                  {/* Command Response Display Section */}
                  <div className={styles.commandResponseSection}>
                    <div className={styles.commandResponseHeader}>
                      {/* <h5 className={styles.commandResponseTitle}>Command Response:</h5> */}
                      <button
                        onClick={handleCopyResponse}
                        className={styles.copyButton}
                        disabled={loading || !commandResponse} // Disable if loading or no response
                      >
                        {/* Dynamic icon based on copy state */}
                        <FontAwesomeIcon icon={copyButtonText === 'Copy' ? faCopy : faCheck} className={styles.iconRightMargin} />
                        {copyButtonText}
                      </button>
                    </div>
                    {/* Pre-formatted tag to display JSON response, with ref for copying */}
                    <pre ref={commandResponseRef} className={styles.commandResponsePre}>
                      {commandResponse ? formatJson(commandResponse) : 'Awaiting command response...'}

                    </pre>
                  </div>
                </div>

                {/* Footer command buttons */}
                <div className={styles.commandSection}>
                    <div className={styles.commandButtonsGroup}>
                        <button className={styles.commandButton} onClick={() => handleSendCommand('system_info')} disabled={loading}>
                          <FontAwesomeIcon icon={faInfoCircle} className={styles.iconRightMargin} /> Info
                        </button>
                        <button className={styles.commandButton} onClick={() => handleSendCommand('run_speedtest')} disabled={loading}>
                          <FontAwesomeIcon icon={faRefresh} className={styles.iconRightMargin} /> Speedtest
                        </button>
                        <button className={styles.commandButton} onClick={() => handleSendCommand('reboot_pi')} disabled={loading}>
                          <FontAwesomeIcon icon={faRedo} className={styles.iconRightMargin} /> Reboot
                        </button>
                        <button className={styles.commandButton} onClick={() => toast('Manage functionality would open a new view or modal')} disabled={loading}>
                          Manage <FontAwesomeIcon icon={faPlus} className={styles.iconLeftMargin} />
                        </button>
                    </div>
                </div>
              </div>
            ) : (
              // Message when no device is selected
              <div className={styles.noDeviceSelected}>
                <FontAwesomeIcon icon={faServer} className={styles.noDeviceIcon} />
                <p className={styles.noDeviceText}>No Device Selected</p>
                <p className={styles.noDeviceText}>Click on a device card to view details and send commands</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Device Modal Overlay */}
      {isAddDeviceModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddDeviceModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddDeviceModalOpen(false)} className={styles.modalCloseButton} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.panelTitle}>Add New Device</h2>
            {/* Add Device Form */}
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
