import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const outSum = formData.get('OutSum') as string;
    const invId = formData.get('InvId') as string; // это robokassa_invoice_id
    const signatureValue = formData.get('SignatureValue') as string;
    
    // Проверяем подпись
    const expectedSignature = md5(`${outSum}:${invId}:${process.env.ROBOKASSA_PASS2}`);
    
    if (expectedSignature.toLowerCase() !== signatureValue?.toLowerCase()) {
      console.error('Неверная подпись для заказа:', invId);
      return new Response('BAD SIGNATURE', { status: 400 });
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Находим заказ по robokassa_invoice_id
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, user_id, payment_status')
      .eq('robokassa_invoice_id', parseInt(invId))
      .single();
    
    if (findError || !order) {
      console.error('Заказ не найден:', invId);
      return new Response('ORDER NOT FOUND', { status: 404 });
    }
    
    // 2. Обновляем статус заказа
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        status: 'processing', // или 'completed', зависит от твоей логики
        paid_at: new Date().toISOString()
      })
      .eq('id', order.id);
    
    if (updateError) {
      console.error('Ошибка обновления заказа:', updateError);
      return new Response('DB ERROR', { status: 500 });
    }
    
    // 3. Очищаем корзину пользователя
    const { error: cartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', order.user_id);
    
    if (cartError) {
      console.error('Ошибка очистки корзины:', cartError);
      // Не возвращаем ошибку, т.к. заказ уже оплачен
    }
    
    // 4. Возвращаем OK с номером инвойса Robokassa
    return new Response(`OK${invId}`);
    
  } catch (error) {
    console.error('Ошибка обработки callback:', error);
    return new Response('ERROR', { status: 500 });
  }
}