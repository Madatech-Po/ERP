-- ==========================================
-- مدير المحل - Database Schema (Supabase / PostgreSQL)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CATEGORIES TABLE
create table categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PRODUCTS TABLE
create table products (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    category_id uuid references categories(id) on delete set null,
    unit text not null, -- e.g., 'قطعة', 'كيلو', 'علبة'
    purchase_price numeric(12, 2) not null default 0.00,
    selling_price numeric(12, 2) not null default 0.00,
    opening_quantity numeric(12, 3) not null default 0.000,
    minimum_stock numeric(12, 3) not null default 0.000,
    image_url text,
    is_deleted boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SUPPLIERS TABLE
create table suppliers (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    phone text,
    address text,
    notes text,
    is_deleted boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PURCHASES (Invoices)
create table purchases (
    id uuid primary key default uuid_generate_v4(),
    supplier_id uuid not null references suppliers(id) on delete restrict,
    date date not null default current_date,
    invoice_number text not null,
    total_amount numeric(12, 2) not null default 0.00,
    paid_amount numeric(12, 2) not null default 0.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. PURCHASE ITEMS
create table purchase_items (
    id uuid primary key default uuid_generate_v4(),
    purchase_id uuid not null references purchases(id) on delete cascade,
    product_id uuid not null references products(id) on delete restrict,
    quantity numeric(12, 3) not null,
    purchase_price numeric(12, 2) not null,
    subtotal numeric(12, 2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. SUPPLIER PAYMENTS
create table supplier_payments (
    id uuid primary key default uuid_generate_v4(),
    supplier_id uuid not null references suppliers(id) on delete restrict,
    payment_date date not null default current_date,
    amount numeric(12, 2) not null,
    reference text, -- check number, bank transfer ID, etc.
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. DAILY SALES
create table daily_sales (
    id uuid primary key default uuid_generate_v4(),
    date date not null,
    product_id uuid not null references products(id) on delete restrict,
    sold_quantity numeric(12, 3) not null default 0.000,
    purchase_price numeric(12, 2) not null, -- Captured purchase price at time of sale (COGS)
    selling_price numeric(12, 2) not null,  -- Captured selling price at time of sale
    revenue numeric(12, 2) not null,       -- sold_quantity * selling_price
    cogs numeric(12, 2) not null,          -- sold_quantity * purchase_price
    gross_profit numeric(12, 2) not null,  -- revenue - cogs
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(date, product_id)
);

-- 8. STOCK MOVEMENTS (History of stock changes)
create table stock_movements (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid not null references products(id) on delete restrict,
    type text not null check (type in ('opening', 'purchase', 'sale', 'adjustment')),
    quantity numeric(12, 3) not null, -- positive for additions, negative for reductions
    reference_id uuid, -- points to purchase_item.id, daily_sales.id, etc.
    date date not null default current_date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. EXPENSES
create table expenses (
    id uuid primary key default uuid_generate_v4(),
    category text not null, -- e.g., 'إيجار', 'كهرباء', 'رواتب', 'أخرى'
    amount numeric(12, 2) not null,
    date date not null default current_date,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. SETTINGS (Store Settings - Single Row)
create table settings (
    id uuid primary key default uuid_generate_v4(),
    store_name text not null default 'مدير المحل',
    phone text,
    address text,
    currency text not null default 'ج.م',
    logo_url text,
    low_stock_alert numeric(12, 3) not null default 5.000,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default single settings row
insert into settings (store_name) values ('مدير المحل') on conflict do nothing;

-- ==========================================
-- DYNAMIC VIEWS FOR CALCULATIONS (No Stored Calculated Values)
-- ==========================================

-- A. Current Stock View
create or replace view v_current_stock as
select 
    p.id as product_id,
    p.name as product_name,
    p.opening_quantity,
    p.minimum_stock,
    coalesce(sum(m.quantity), 0) + p.opening_quantity as current_stock
from products p
left join stock_movements m on p.id = m.product_id
group by p.id, p.name, p.opening_quantity, p.minimum_stock;

-- B. Supplier Balances View
-- Outstanding Balance = Total Invoiced Purchases - Paid In Purchases - Additional Payments
create or replace view v_supplier_balances as
with purchase_totals as (
    select 
        supplier_id,
        coalesce(sum(total_amount), 0) as total_purchases,
        coalesce(sum(paid_amount), 0) as paid_in_purchases
    from purchases
    group by supplier_id
),
payment_totals as (
    select 
        supplier_id,
        coalesce(sum(amount), 0) as total_payments
    from supplier_payments
    group by supplier_id
)
select 
    s.id as supplier_id,
    s.name as supplier_name,
    coalesce(pt.total_purchases, 0) as total_purchased,
    (coalesce(pt.paid_in_purchases, 0) + coalesce(pay.total_payments, 0)) as total_paid,
    (coalesce(pt.total_purchases, 0) - (coalesce(pt.paid_in_purchases, 0) + coalesce(pay.total_payments, 0))) as outstanding_balance
from suppliers s
left join purchase_totals pt on s.id = pt.supplier_id
left join payment_totals pay on s.id = pay.supplier_id
where s.is_deleted = false;

-- C. Profit and Financials Reports View
-- Computes daily sales metrics
create or replace view v_daily_financials as
with daily_sales_metrics as (
    select 
        date,
        sum(revenue) as total_revenue,
        sum(cogs) as total_cogs,
        sum(gross_profit) as total_gross_profit
    from daily_sales
    group by date
),
daily_expenses as (
    select 
        date,
        sum(amount) as total_expenses
    from expenses
    group by date
)
select 
    coalesce(s.date, e.date) as date,
    coalesce(s.total_revenue, 0) as revenue,
    coalesce(s.total_cogs, 0) as cogs,
    coalesce(s.total_gross_profit, 0) as gross_profit,
    coalesce(e.total_expenses, 0) as expenses,
    (coalesce(s.total_gross_profit, 0) - coalesce(e.total_expenses, 0)) as net_profit
from daily_sales_metrics s
full outer join daily_expenses e on s.date = e.date;


-- ==========================================
-- TRANSACTIONAL DATABASE FUNCTIONS (RPCs)
-- ==========================================

-- 1. Function to save purchase invoice atomically
create or replace function save_purchase_invoice(
    p_supplier_id uuid,
    p_invoice_number text,
    p_date date,
    p_total_amount numeric,
    p_paid_amount numeric,
    p_items jsonb -- Array of {product_id, quantity, purchase_price, subtotal}
) returns uuid as $$
declare
    v_purchase_id uuid;
    v_item jsonb;
    v_item_id uuid;
begin
    -- 1. Insert Purchase Invoice Header
    insert into purchases (supplier_id, date, invoice_number, total_amount, paid_amount)
    values (p_supplier_id, p_date, p_invoice_number, p_total_amount, p_paid_amount)
    returning id into v_purchase_id;

    -- 2. Loop and Insert Invoice Items & Create Stock Movements
    for v_item in select * from jsonb_array_elements(p_items) loop
        insert into purchase_items (purchase_id, product_id, quantity, purchase_price, subtotal)
        values (
            v_purchase_id, 
            (v_item->>'product_id')::uuid, 
            (v_item->>'quantity')::numeric, 
            (v_item->>'purchase_price')::numeric, 
            (v_item->>'subtotal')::numeric
        ) returning id into v_item_id;

        -- Create stock movement (positive)
        insert into stock_movements (product_id, type, quantity, reference_id, date)
        values (
            (v_item->>'product_id')::uuid,
            'purchase',
            (v_item->>'quantity')::numeric,
            v_item_id,
            p_date
        );
    end loop;

    return v_purchase_id;
end;
$$ language plpgsql security definer;


-- 2. Function to save daily sales atomically
create or replace function save_daily_sales(
    p_date date,
    p_sales_items jsonb -- Array of {product_id, sold_quantity, purchase_price, selling_price}
) returns boolean as $$
declare
    v_item jsonb;
    v_sales_id uuid;
    v_revenue numeric;
    v_cogs numeric;
    v_profit numeric;
begin
    -- 1. Remove existing sales and stock movements for this date
    -- Remove stock movements linked to daily sales of this date
    delete from stock_movements 
    where type = 'sale' 
      and reference_id in (select id from daily_sales where date = p_date);
      
    -- Remove the daily sales entries
    delete from daily_sales where date = p_date;

    -- 2. Insert new daily sales and stock movements
    for v_item in select * from jsonb_array_elements(p_sales_items) loop
        -- Skip if quantity is zero
        if (v_item->>'sold_quantity')::numeric > 0 then
            v_revenue := (v_item->>'sold_quantity')::numeric * (v_item->>'selling_price')::numeric;
            v_cogs := (v_item->>'sold_quantity')::numeric * (v_item->>'purchase_price')::numeric;
            v_profit := v_revenue - v_cogs;

            insert into daily_sales (date, product_id, sold_quantity, purchase_price, selling_price, revenue, cogs, gross_profit)
            values (
                p_date,
                (v_item->>'product_id')::uuid,
                (v_item->>'sold_quantity')::numeric,
                (v_item->>'purchase_price')::numeric,
                (v_item->>'selling_price')::numeric,
                v_revenue,
                v_cogs,
                v_profit
            ) returning id into v_sales_id;

            -- Create stock movement (negative)
            insert into stock_movements (product_id, type, quantity, reference_id, date)
            values (
                (v_item->>'product_id')::uuid,
                'sale',
                -((v_item->>'sold_quantity')::numeric),
                v_sales_id,
                p_date
            );
        end if;
    end loop;

    return true;
end;
$$ language plpgsql security definer;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS for all tables
alter table categories enable row level security;
alter table products enable row level security;
alter table suppliers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table supplier_payments enable row level security;
alter table daily_sales enable row level security;
alter table stock_movements enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;

-- Create public access policies (for MVP simplicity, allow all actions)
-- In production, these should be locked down to auth.uid()
create policy "Allow public access to categories" on categories for all using (true);
create policy "Allow public access to products" on products for all using (true);
create policy "Allow public access to suppliers" on suppliers for all using (true);
create policy "Allow public access to purchases" on purchases for all using (true);
create policy "Allow public access to purchase_items" on purchase_items for all using (true);
create policy "Allow public access to supplier_payments" on supplier_payments for all using (true);
create policy "Allow public access to daily_sales" on daily_sales for all using (true);
create policy "Allow public access to stock_movements" on stock_movements for all using (true);
create policy "Allow public access to expenses" on expenses for all using (true);
create policy "Allow public access to settings" on settings for all using (true);
