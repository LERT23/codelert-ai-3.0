import React, { useState, useEffect } from 'react';

export const GoogleAuthModal: React.FC<{ onClose: () => void, onLogin: (email: string) => void }> = ({ onClose, onLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('codelert_last_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleNext = () => {
    if (email.includes('@')) {
      localStorage.setItem('codelert_last_email', email);
      setStep(2);
    } else {
      alert('Введіть дійсну адресу');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-gray-800 font-sans">
        <div className="p-8 flex flex-col items-center">
          <svg className="w-12 h-12 mb-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          
          {step === 1 ? (
            <>
              <h2 className="text-2xl font-normal mb-2">Увійдіть</h2>
              <p className="text-gray-600 mb-8">Використовуйте свій обліковий запис Google</p>
              
              <div className="w-full mb-8">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="Електронна адреса або номер телефону"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div className="w-full flex justify-between items-center mt-4">
                <button onClick={onClose} className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded">Скасувати</button>
                <button 
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
                >
                  Далі
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-normal mb-2">Дозволи</h2>
              <p className="text-gray-600 mb-6 text-center">CodeLert AI запитує доступ до вашого облікового запису</p>
              
              <div className="w-full bg-gray-50 p-4 rounded border border-gray-200 mb-8 text-sm text-gray-700">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Перегляд вашої електронної адреси</li>
                  <li>Перегляд вашого імені та профілю</li>
                  <li>Доступ до базової інформації</li>
                </ul>
              </div>
              
              <div className="w-full flex justify-between items-center mt-4">
                <button onClick={() => setStep(1)} className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded">Назад</button>
                <button 
                  onClick={() => onLogin(email)}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
                >
                  Дозволити
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
