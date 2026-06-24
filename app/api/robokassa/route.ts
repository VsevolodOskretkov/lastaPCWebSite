import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function md5(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function POST(request: Request) {
  try {
    const { items, totalAmount, userId, deliveryAddress, phone } = await request.json();
    
    // Генерируем уникальный номер заказа для Robokassa
    const robokassaInvoiceId = Date.now();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Создаём заказ в таблице orders
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_price: totalAmount,
        status: 'pending',           // pending, processing, completed, cancelled
        payment_method: 'robokassa',
        payment_status: 'pending',    // pending, paid, failed
        delivery_address: deliveryAddress || null,
        phone: phone || null,
        robokassa_invoice_id: robokassaInvoiceId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // 2. Создаём записи в order_items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      computer_id: item.type === 'ready_pc' ? item.id : null,
      custom_build_id: item.type === 'custom_build' ? item.id : null,
      quantity: item.quantity,
      price: item.price
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    // 3. Формируем подпись для Robokassa
    const signature = md5(
      `${process.env.ROBOKASSA_LOGIN}:${totalAmount}:${robokassaInvoiceId}:${process.env.ROBOKASSA_PASS1}`
    );
    
    // 4. Строим URL для редиректа
    const robokassaUrl = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
    robokassaUrl.searchParams.set('MrchLogin', process.env.ROBOKASSA_LOGIN!);
    robokassaUrl.searchParams.set('OutSum', totalAmount.toString());
    robokassaUrl.searchParams.set('InvId', robokassaInvoiceId.toString());
    robokassaUrl.searchParams.set('SignatureValue', await signature);
    robokassaUrl.searchParams.set('Description', `Заказ #${order.id.slice(0, 8)}`);
    robokassaUrl.searchParams.set('Culture', 'ru');
    
    // Сохраняем URL платежа в заказе
    await supabase
      .from('orders')
      .update({ payment_url: robokassaUrl.toString() })
      .eq('id', order.id);
    
    // Для тестов (убрать в продакшене)
    if (process.env.NODE_ENV === 'development') {
      robokassaUrl.searchParams.set('IsTest', '1');
    }
    
    return NextResponse.json({ 
      url: robokassaUrl.toString(),
      orderId: order.id,
      robokassaInvoiceId: robokassaInvoiceId
    });
    
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    return NextResponse.json(
      { error: 'Не удалось создать платёж' },
      { status: 500 }
    );
  }
}