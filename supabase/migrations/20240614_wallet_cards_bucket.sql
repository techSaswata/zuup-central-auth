-- Create the wallet-cards storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wallet-cards',
  'wallet-cards',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload their own card image
CREATE POLICY IF NOT EXISTS "wallet_cards_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wallet-cards');

-- Allow everyone to read (public bucket)
CREATE POLICY IF NOT EXISTS "wallet_cards_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wallet-cards');

-- Allow authenticated users to update/overwrite their file
CREATE POLICY IF NOT EXISTS "wallet_cards_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wallet-cards');
