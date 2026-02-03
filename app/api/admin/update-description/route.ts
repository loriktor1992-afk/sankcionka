import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// Проверка аутентификации
async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin-session');
  return session?.value === 'authenticated';
}

export async function POST(request: Request) {
  try {
    // Проверяем авторизацию
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { make, model, slug, description } = await request.json();

    if (!make || !model || !slug) {
      return NextResponse.json(
        { success: false, message: 'Недостаточно данных' },
        { status: 400 }
      );
    }

    // Путь к файлу модели
    const modelFilePath = path.join(process.cwd(), 'data', 'models', `${make}.json`);

    // Читаем файл
    const fileContent = await fs.readFile(modelFilePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Находим конкретный автомобиль и обновляем описание
    let found = false;
    if (Array.isArray(data)) {
      for (const instance of data) {
        if (instance.slug === slug) {
          instance.description = description;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return NextResponse.json(
        { success: false, message: 'Автомобиль не найден' },
        { status: 404 }
      );
    }

    // Сохраняем обновленные данные
    await fs.writeFile(modelFilePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Описание обновлено'
    });
  } catch (error) {
    console.error('Ошибка обновления описания:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
