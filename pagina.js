// hooks/useTenant.js
import { useState, useEffect } from 'react';

export const useTenant = () => {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    // Obtener subdominio: "barberia.miweb.com" -> "barberia"
    const host = window.location.host; 
    const subdomain = host.split('.')[0]; 

    // En desarrollo forzamos uno
    const slug = subdomain === 'localhost' ? 'demo-barberia' : subdomain;

    fetch(https://api.misaas.com/tenants/${slug})
      .then(res => res.json())
      .then(data => {
        setTenant(data);
        // Inyectar colores dinámicos del cliente
        document.documentElement.style.setProperty('--primary-color', data.brandColor);
      });
  }, []);

  return tenant;
}