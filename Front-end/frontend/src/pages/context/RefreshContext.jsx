
import React, { createContext, useState, useContext, useCallback } from 'react';


const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {

    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshKey(prevKey => prevKey + 1);
    }, []); 
   
   
    
   return (
        <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
            {children}
        </RefreshContext.Provider>
    );
};

export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (!context) {
        throw new Error('useRefresh debe ser usado dentro de un RefreshProvider');
    }
    return context;
};