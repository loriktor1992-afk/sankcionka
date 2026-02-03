import { NextResponse } from 'next/server';

// Простая аутентификация (в продакшене используйте более безопасную систему)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Измените на свой пароль

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Создаем токен сессии (простой вариант)
      const response = NextResponse.json({ success: true, message: 'Вход выполнен' });
      
      // Устанавливаем cookie с токеном
      response.cookies.set('admin-session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 часа
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Неверный логин или пароль' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
