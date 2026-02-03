'use client';

import { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsAdmin(data.isAuthenticated);
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAdmin(true);
        setShowLogin(false);
        setUsername('');
        setPassword('');
        window.location.reload(); // Перезагружаем страницу для обновления
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAdmin(false);
      window.location.reload();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  }

  const goToAdmin = () => {
    window.location.href = '/admin';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isAdmin ? (
        <>
          {!showLogin ? (
            <button
              onClick={() => setShowLogin(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all"
            >
              🔑 Админ
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-2xl p-6 w-72">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Вход для администратора</h3>
              <form onSubmit={handleLogin}>
                <input
                  type="text"
                  placeholder="Логин"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-900"
                  required
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-gray-900"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Вход...' : 'Войти'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all text-gray-900"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="flex gap-2 items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <button
            onClick={goToAdmin}
            className="font-medium bg-green-700 hover:bg-green-800 px-3 py-1 rounded transition-all text-sm"
          >
            Панель
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-all text-sm"
          >
            Выход
          </button>
        </div>
      )}
    </div>
  );
}
