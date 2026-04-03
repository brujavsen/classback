import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

export const showToast = (message, type = 'info') => {
  const bgColors = {
    error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
    success: 'linear-gradient(to right, #00b09b, #96c93d)',
    info: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    warning: 'linear-gradient(to right, #f59e0b, #fbbf24)',
  };

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "center", // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    style: {
      background: bgColors[type] || bgColors.info,
      borderRadius: '8px',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  }).showToast();
};
