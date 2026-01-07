-- Create damage reports table
CREATE TABLE public.damage_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Location data
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  location_name TEXT,
  
  -- Image data
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Analysis results
  overall_condition TEXT NOT NULL DEFAULT 'unknown',
  total_damages INTEGER NOT NULL DEFAULT 0,
  priority TEXT DEFAULT 'low',
  confidence_score DOUBLE PRECISION DEFAULT 0,
  
  -- Detailed detections as JSONB
  detections JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  device_info TEXT,
  capture_method TEXT DEFAULT 'upload', -- 'upload', 'camera', 'drone'
  weather_conditions TEXT,
  road_type TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'archived'
  notes TEXT
);

-- Enable RLS (public access for hackathon demo)
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access for demo
CREATE POLICY "Anyone can view damage reports" 
ON public.damage_reports 
FOR SELECT 
USING (true);

-- Allow public insert for demo
CREATE POLICY "Anyone can create damage reports" 
ON public.damage_reports 
FOR INSERT 
WITH CHECK (true);

-- Allow public update for demo
CREATE POLICY "Anyone can update damage reports" 
ON public.damage_reports 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_damage_reports_updated_at
BEFORE UPDATE ON public.damage_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_damage_reports_location ON public.damage_reports (latitude, longitude);
CREATE INDEX idx_damage_reports_status ON public.damage_reports (status);
CREATE INDEX idx_damage_reports_condition ON public.damage_reports (overall_condition);
CREATE INDEX idx_damage_reports_created_at ON public.damage_reports (created_at DESC);

-- Create storage bucket for damage images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'damage-images',
  'damage-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for public access
CREATE POLICY "Anyone can view damage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'damage-images');

CREATE POLICY "Anyone can upload damage images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'damage-images');

-- Enable realtime for damage reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.damage_reports;