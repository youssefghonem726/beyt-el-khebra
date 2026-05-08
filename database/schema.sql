-- =========================================
-- USERS TABLE
-- =========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    supabase_uid VARCHAR(128) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(50),
    role VARCHAR CHECK (role IN ('client', 'owner', 'staff')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- FILES TABLE
-- =========================================
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    url TEXT,
    file_type VARCHAR(20) CHECK (file_type IN ('cover', 'content', 'preview', 'package_image')),
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- =========================================
-- ORDERS TABLE
-- =========================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    status VARCHAR(40) CHECK (
        status IN (
            'UNPRICED_PENDING',
            'PRICED_PENDING_CONFIRMATION',
            'CONFIRMED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
            'CLOSED'
        )
    ),
    quantity INTEGER,
    total_price DECIMAL(10,2),
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- =========================================
-- ORDER STATUS HISTORY TABLE
-- =========================================
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    updated_by INTEGER,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- =========================================
-- PACKAGES TABLE
-- =========================================
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    bag_type VARCHAR(10) DEFAULT 'cloth' CHECK (bag_type IN ('cloth', 'plastic', 'nylon')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- =========================================
-- ITEMS TABLE
-- =========================================
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER,
    item_type VARCHAR(10) CHECK (item_type IN ('book', 'poster', 'sticker', 'card')),
    quantity INTEGER,
    size VARCHAR(50),
    print_side VARCHAR(10) CHECK (print_side IN ('single', 'double')),
    casing VARCHAR(50),
    cover_file INTEGER,
    content_file INTEGER,
    preview_file INTEGER,
    cover_weight INTEGER,
    cover_finish VARCHAR(50),
    cover_color VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (package_id) REFERENCES packages(id),
    FOREIGN KEY (cover_file) REFERENCES files(id),
    FOREIGN KEY (content_file) REFERENCES files(id),
    FOREIGN KEY (preview_file) REFERENCES files(id)
);

-- =========================================
-- PRICING TABLE
-- =========================================
CREATE TABLE Pricing (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Pages
    "Front" FLOAT,
    "Front_and_back" FLOAT,

    -- Covers
    "Digital_Cover_300g" FLOAT,
    "Digital_Cover_200g" FLOAT,
    "Offset_Cover_200g" FLOAT,
    "Offset_Cover_300g" FLOAT,

    -- Coil sizes
    "Coil_size_10" FLOAT,
    "Coil_size_12" FLOAT,
    "Coil_size_14" FLOAT,
    "Coil_size_16" FLOAT,
    "Coil_size_18" FLOAT,
    "Coil_size_20" FLOAT,
    "Coil_size_22" FLOAT,
    "Coil_size_25" FLOAT,
    "Coil_size_28" FLOAT,
    "Coil_size_30" FLOAT,
    "Coil_size_32" FLOAT,
    "Coil_size_35" FLOAT,

    -- Custom pricing
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);