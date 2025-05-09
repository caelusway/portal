import React, { createContext, useContext, useState, useEffect } from 'react';

// Define interface for settings state
interface SettingsState {
  activeTab: string;
}

// Define interface for context value
interface SettingsContextType {
  settings: SettingsState;
  updateActiveTab: (tab: string) => void;
}

// Storage key for settings
const SETTINGS_STORAGE_KEY = 'bio-dao-settings';

// Default settings values
const defaultSettings: SettingsState = {
  activeTab: 'team',
};

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateActiveTab: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
      console.error('Failed to parse settings from localStorage:', error);
      return defaultSettings;
    }
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  // Update active tab
  const updateActiveTab = (tab: string) => {
    setSettings((prev) => ({
      ...prev,
      activeTab: tab,
    }));
  };

  const contextValue = {
    settings,
    updateActiveTab,
  };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

// Custom hook for using the settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
