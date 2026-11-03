BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  in_stock    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer'
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  phone   VARCHAR(30),
  address VARCHAR(250)
);

CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  status     VARCHAR(30) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  price      INTEGER NOT NULL CHECK (price >= 0),
  PRIMARY KEY (order_id, product_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100) NOT NULL DEFAULT '!';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);

-- ---------- Тестовые данные (каталог) ----------
INSERT INTO categories (name) VALUES
  ('Ноутбуки'), ('Смартфоны'), ('Аксессуары')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, price, category_id, in_stock)
SELECT v.name, v.price, c.id, v.in_stock
FROM (VALUES
  ('Ноутбук Lenovo IdeaPad 3', 250000, 'Ноутбуки',   TRUE),
  ('Ноутбук ASUS VivoBook 15', 320000, 'Ноутбуки',   TRUE),
  ('Смартфон Samsung Galaxy A55', 180000, 'Смартфоны', TRUE),
  ('Смартфон Xiaomi Redmi Note 13', 110000, 'Смартфоны', FALSE),
  ('Мышь Logitech M185', 6500, 'Аксессуары', TRUE),
  ('Наушники JBL Tune 510BT', 18000, 'Аксессуары', TRUE)
) AS v(name, price, category, in_stock)
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);

COMMIT;

-- Проверка:
-- SELECT * FROM products;
