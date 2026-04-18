-- 1. Nuke existing schema to start completely fresh
DROP TABLE IF EXISTS maintenance_logs, procurement_triggers, consumption_history, pcb_component_mapping, pcbs, components, users CASCADE;

-- 2. Users Table
CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'Admin'
);

-- 3. Components Table
CREATE TABLE components (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    current_stock BIGINT NOT NULL CHECK (current_stock >= 0),
    monthly_required BIGINT DEFAULT 1000 CHECK (monthly_required > 0),
    quarantined_stock BIGINT DEFAULT 0 CHECK (quarantined_stock >= 0),
    is_low_stock BOOLEAN DEFAULT FALSE
);

-- 3.1 The 20% Trigger Rule
CREATE OR REPLACE FUNCTION update_low_stock_flag()
RETURNS trigger AS $$
BEGIN
  NEW.is_low_stock := NEW.current_stock < (COALESCE(NEW.monthly_required, 0) * 0.2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_low_stock BEFORE INSERT OR UPDATE OF current_stock, monthly_required ON components FOR EACH ROW EXECUTE FUNCTION update_low_stock_flag();

-- 4. PCBs Table
CREATE TABLE pcbs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pcb_name VARCHAR(100) UNIQUE NOT NULL
);

-- 5. PCB-Component Mapping
CREATE TABLE pcb_component_mapping (
    pcb_id INT NOT NULL REFERENCES pcbs(id) ON DELETE CASCADE,
    component_id INT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
    quantity_required BIGINT NOT NULL CHECK (quantity_required > 0), 
    PRIMARY KEY (pcb_id, component_id)
);

-- 6. Consumption History (Audit Trail)
CREATE TABLE consumption_history (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pcb_id INT NOT NULL REFERENCES pcbs(id),
    component_id INT NOT NULL REFERENCES components(id),
    quantity_deducted BIGINT NOT NULL CHECK (quantity_deducted > 0), 
    production_date TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Maintenance Logs
CREATE TABLE maintenance_logs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_id INT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('rework', 'scrap', 'recover')),
    quantity INT NOT NULL CHECK (quantity > 0),
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Procurement Triggers
CREATE TABLE procurement_triggers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_id INT NOT NULL REFERENCES components(id),
    trigger_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Resolved','Cancelled'))
);
CREATE UNIQUE INDEX uniq_open_procurement ON procurement_triggers(component_id) WHERE status = 'Pending';

-- 9. Inject Initial Data
INSERT INTO users (username, password_hash, role) VALUES ('admin', 'admin123', 'Admin');

INSERT INTO components (part_number, component_name, current_stock, monthly_required) VALUES 
('CAP-10UF-50V', '10uF 50V Capacitor', 500, 2000),         
('CAP-100NF-50V', '100nF Ceramic Capacitor', 3000, 8000),  
('RES-10K-0805', '10K Ohm Resistor SMD', 1500, 5000),      
('RES-1K-0805', '1K Ohm Resistor SMD', 2200, 6000),        
('IC-ESP32-WROOM', 'ESP32 Microcontroller', 50, 200),      
('IC-LM2596', 'Buck Converter IC', 120, 400),              
('DIODE-SS34', 'Schottky Diode SS34', 800, 2500),          
('CON-2PIN-T', '2-Pin Terminal Block', 12, 100),           
('CON-3PIN-T', '3-Pin Terminal Block', 40, 300),           
('IND-47UH', '47uH Power Inductor', 75, 350);              

INSERT INTO pcbs (pcb_name) VALUES ('PCB_A1_Controller'), ('PCB_B7_LED_Driver'), ('PCB_C3_Power_Module'), ('PCB_D4_WiFi_Interface');

INSERT INTO pcb_component_mapping (pcb_id, component_id, quantity_required) VALUES 
(1, 1, 2), (1, 2, 6), (1, 3, 4), (1, 5, 1),
(2, 1, 1), (2, 4, 3), (2, 6, 1), (2, 7, 2),
(3, 1, 3), (3, 6, 2), (3, 10, 1), (3, 7, 2),
(4, 2, 5), (4, 3, 6), (4, 5, 1), (4, 9, 1);