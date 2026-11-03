DO $$
DECLARE
  target_email text := NULL;
  uid int;
  oid int;
BEGIN
  SELECT id INTO uid FROM users
  WHERE target_email IS NULL OR email = target_email
  ORDER BY id DESC LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'Пользователь не найден: сначала зарегистрируйтесь через API.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM orders WHERE user_id = uid) THEN
    RAISE NOTICE 'У пользователя % уже есть заказы — ничего не добавлено.', uid;
    RETURN;
  END IF;

  -- Заказ 1: ноутбук x1 + мышь x2
  INSERT INTO orders (user_id, status) VALUES (uid, 'new') RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT oid, id, 1, price FROM products WHERE name = 'Ноутбук Lenovo IdeaPad 3';
  INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT oid, id, 2, price FROM products WHERE name = 'Мышь Logitech M185';

  -- Заказ 2: только мышь x1 (мышь встречается в двух заказах — удобно для relation filter some)
  INSERT INTO orders (user_id, status) VALUES (uid, 'paid') RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_id, quantity, price)
    SELECT oid, id, 1, price FROM products WHERE name = 'Мышь Logitech M185';

  RAISE NOTICE 'Созданы демо-заказы для пользователя %.', uid;
END $$;

-- Проверка:
-- SELECT o.id, o.user_id, o.status, p.name, oi.quantity, oi.price
-- FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
-- ORDER BY o.id;
