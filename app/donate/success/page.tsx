'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // Новый импорт взамен устаревшего
import Link from 'next/link';

// Инициализируем клиент Supabase для браузера
const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadOrder = async () => {
      const invId = searchParams.get('InvId');
      if (!invId) {
        router.push('/');
        return;
      }
      
      // Используем новый экземпляр клиента
      const supabase = createClient();
      
      // Ищем заказ по robokassa_invoice_id
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            computers (*),
            custom_builds (*)
          )
        `)
        .eq('robokassa_invoice_id', parseInt(invId))
        .single();
      
      if (!error && data) {
        setOrder(data);
      }
      
      setLoading(false);
    };
    
    loadOrder();
  }, [searchParams, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-white text-lg">Загрузка информации о заказе...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-[#1a1b1f] border border-green-500 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">✅</div>
            <h1 className="text-4xl font-bold mb-2">Спасибо за заказ!</h1>
            <p className="text-gray-400">
              Номер заказа: {order?.id?.slice(0, 8)}...
            </p>
          </div>
          
          <div className="border-t border-gray-700 pt-6 mt-6">
            <h2 className="text-2xl font-semibold mb-4">Детали заказа</h2>
            
            <div className="space-y-4">
              {order?.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <p className="font-medium">
                      {item.computers?.title || item.custom_builds?.title || 'Товар'}
                    </p>
                    <p className="text-sm text-gray-400">Количество: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">{item.price?.toLocaleString('ru-RU')} ₽</p>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-4 mt-2">
                <p className="text-xl font-bold">Итого:</p>
                <p className="text-2xl font-bold text-purple-400">
                  {order?.total_price?.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-6 mt-6">
            <h3 className="font-semibold mb-2">Информация о доставке</h3>
            <p className="text-gray-400">Адрес: {order?.delivery_address || 'Не указан'}</p>
            <p className="text-gray-400">Телефон: {order?.phone || 'Не указан'}</p>
            <p className="text-sm text-gray-500 mt-4">
              Наш менеджер свяжется с вами в ближайшее время для уточнения деталей доставки.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center mt-8">
            <Link 
              href="/catalog"
              className="bg-purple-600 px-6 py-3 rounded-xl hover:bg-purple-700 transition"
            >
              Вернуться в каталог
            </Link>
            <Link 
              href="/profile/orders"
              className="border border-purple-600 px-6 py-3 rounded-xl hover:bg-purple-600/10 transition"
            >
              Мои заказы
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
