import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { GlobalDeleteModal } from '../components/Modals';

interface DeleteModalContextType {
  confirmDelete: (itemName: string, onConfirm: () => void) => void;
}

const DeleteModalContext = createContext<DeleteModalContextType | undefined>(undefined);

export const useDeleteModal = () => {
  const context = useContext(DeleteModalContext);
  if (!context) {
    throw new Error('useDeleteModal must be used within a DeleteModalProvider');
  }
  return context;
};

export const DeleteModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const confirmDelete = (name: string, onConfirm: () => void) => {
    setItemName(name);
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <DeleteModalContext.Provider value={{ confirmDelete }}>
      {children}
      <GlobalDeleteModal 
        isOpen={isOpen} 
        onClose={handleCancel} 
        onConfirm={handleConfirm} 
        itemName={itemName} 
      />
    </DeleteModalContext.Provider>
  );
};
