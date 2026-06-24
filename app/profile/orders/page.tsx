'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

// Создаем клиент один раз вне компонента
const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadOrders = async () => {
      // Инициализируем новый правильный клиент
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/reg';
        return;
      }
      
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
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setOrders(data);
      }
      
      setLoading(false);
    };
    
    loadOrders();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-lg">Загрузка заказов...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Мои заказы</h1>
        
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1b1f] rounded-3xl border border-gray-800">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-400">У вас пока нет заказов</p>
            <Link href="/catalog" className="text-purple-400 hover:underline mt-4 inline-block">
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-[#1a1b1f] border border-gray-800 rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">
                      Заказ от {order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU') : '—'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Номер: {order.id?.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-2xl font-bold text-purple-400">
                      {order.total_price?.toLocaleString('ru-RU')} ₽
                    </p>
                    <span className={`inline-block text-sm px-3 py-1 rounded-full mt-1 ${
                      order.payment_status === 'paid' 
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-yellow-600/20 text-yellow-400'
                    }`}>
                      {order.payment_status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Товары:</p>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any, idx: number) => (
                      <p key={idx} className="text-sm text-gray-200">
                        • {item.computers?.title || item.custom_builds?.title || 'Товар'} × {item.quantity}
                      </p>
                    ))}
                  </div>
                </div>
                
                {(order.delivery_address || order.phone) && (
                  <div className="border-t border-gray-700 pt-4 mt-4 text-sm text-gray-400 space-y-1">
                    <p>Доставка: {order.delivery_address || 'Не указана'}</p>
                    <p>Телефон: {order.phone || 'Не указан'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
