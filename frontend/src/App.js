// src/App.js
import React from 'react';
import ManageDevices from './components/ManageDevice'; // Removed .js extension
import './index.css';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-inter">
      {/* You can add a header or navigation here if needed */}
      <header className="text-center py-6">
        <h1 className="text-4xl font-bold text-gray-900">Device Admin Panel</h1>
        <p className="text-lg text-gray-600 mt-2">Manage your IoT devices efficiently</p>
      </header>
      <main>
        <ManageDevices />
      </main>
      {/* You can add a footer here if needed */}
    </div>
  );
}

export default App;
