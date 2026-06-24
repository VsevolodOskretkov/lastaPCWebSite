'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Добавлен отсутствующий импорт

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Получаем invId прямо из URL-параметров
  const invId = searchParams.get('invId');
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Здесь будет ваша логика useEffect для проверки статуса платежа
  useEffect(() => {
    if (invId) {
      // Имитация загрузки данных о заказе
      setLoading(false);
    }
  }, [invId]);

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-[#1a1b1f] border border-red-500 rounded-3xl p-8 text-center">
          <div className="text-7xl mb-6">❌</div>
          <h1 className="text-4xl font-bold mb-4">Ошибка оплаты</h1>
          <p className="text-gray-400 mb-6">
            К сожалению, произошла ошибка при обработке платежа.
          </p>
          
          {invId && (
            <p className="text-sm text-gray-500 mb-6">
              Номер заказа: {invId}
            </p>
          )}
          
          <p className="text-gray-500 mb-8">
            Пожалуйста, попробуйте ещё раз или выберите другой способ оплаты.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/cart"
              className="bg-purple-600 px-6 py-3 rounded-xl hover:bg-purple-700 transition"
            >
              Вернуться в корзину
            </Link>
            <Link 
              href="/catalog"
              className="border border-purple-600 px-6 py-3 rounded-xl hover:bg-purple-600/10 transition"
            >
              Продолжить покупки
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
