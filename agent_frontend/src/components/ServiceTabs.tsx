import React from 'react';
import { useAppStore } from '../store';
import { cn } from '../utils';

export const ServiceTabs: React.FC = () => {
  const { services, setActiveService } = useAppStore();

  return (
    <div className="flex items-center space-x-2 border-b border-gray-200 p-2 overflow-x-auto bg-white dark:bg-gray-900 dark:border-gray-800">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => setActiveService(service.id)}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
            service.isActive 
              ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400" 
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          )}
        >
          <span>{service.icon}</span>
          <span>{service.name}</span>
        </button>
      ))}
    </div>
  );
};
