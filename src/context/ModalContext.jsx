import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import './Modal.css';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = useCallback((title, message) => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: null,
      onCancel: null
    });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, onCancel) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = async () => {
    if (modal.onConfirm) {
      try {
        await modal.onConfirm();
      } catch (err) {
        console.error("Modal confirm action failed", err);
      }
    }
    closeModal();
  };

  const handleCancel = () => {
    if (modal.onCancel) modal.onCancel();
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {modal.isOpen && (
        <div className="custom-modal-overlay animate-fade-in" onClick={handleCancel}>
          <div className="custom-modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-wrapper">
              {modal.type === 'alert' ? <AlertCircle className="icon-alert" /> : <HelpCircle className="icon-confirm" />}
            </div>
            
            <div className="modal-text">
              <h3>{modal.title}</h3>
              <p>{modal.message}</p>
            </div>

            <div className="modal-btns">
              {modal.type === 'confirm' && (
                <button className="btn-ghost" onClick={handleCancel}>Cancelar</button>
              )}
              <button className="btn-primary" onClick={handleConfirm}>
                {modal.type === 'confirm' ? 'Confirmar' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
}
