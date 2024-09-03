-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create data_models table
CREATE TABLE data_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create field_types table
CREATE TABLE field_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  ui_component VARCHAR(50),
  data_type VARCHAR(50) NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create data_model_fields table
CREATE TABLE data_model_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  field_type_id UUID REFERENCES field_types(id),
  required BOOLEAN DEFAULT false,
  unique BOOLEAN DEFAULT false,
  default_value TEXT,
  default_script TEXT,
  options JSONB,
  validation_rules JSONB,
  related_model_id UUID REFERENCES data_models(id),
  multiple BOOLEAN DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (model_id, name),
  UNIQUE (model_id, column_name)
);

-- Create a table for managing data model relationships
CREATE TABLE data_model_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  target_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- e.g., 'one-to-many', 'many-to-many'
  source_field_id UUID REFERENCES data_model_fields(id) ON DELETE CASCADE,
  target_field_id UUID REFERENCES data_model_fields(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_model_id, target_model_id, source_field_id, target_field_id)
);

-- Create a table for storing UI layouts
CREATE TABLE ui_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  layout_type VARCHAR(50) NOT NULL, -- e.g., 'list', 'detail', 'form'
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (model_id, name, layout_type)
);

-- Create a table for managing workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_model_id UUID REFERENCES data_models(id),
  trigger_event VARCHAR(50) NOT NULL, -- e.g., 'create', 'update', 'delete'
  actions JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for API keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create a table for audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Reference to your user table
  action VARCHAR(50) NOT NULL,
  model_id UUID REFERENCES data_models(id),
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);