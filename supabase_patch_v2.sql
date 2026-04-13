-- ============================================================
-- PATCH: Add new dropdown categories for v2 requirements
-- Run in Supabase SQL Editor after the original schema
-- ============================================================

insert into public.dropdown_options (category, value, sort_order) values
  -- System locations
  ('system_location', 'Regal', 1),
  ('system_location', 'Head Office (HO)', 2),
  ('system_location', 'Trade Show', 3),

  -- Updated show statuses (per requirements doc)
  ('show_status', 'In Progress', 5),
  ('show_status', 'Finished', 6),

  -- Merchandise items
  ('merchandise_item', 'Tote Bags', 1),
  ('merchandise_item', 'Pens', 2),
  ('merchandise_item', 'Post-it Notes', 3),
  ('merchandise_item', 'QR Code Cards', 4),
  ('merchandise_item', 'Beer Koozies', 5),
  ('merchandise_item', 'Shot Glasses', 6),
  ('merchandise_item', 'Playing Cards', 7),

  -- Cleaning supplies
  ('cleaning_item', 'Multipurpose Spray', 1),
  ('cleaning_item', 'Lysol Wipes', 2),
  ('cleaning_item', 'Kleenex', 3),
  ('cleaning_item', 'Windex', 4),
  ('cleaning_item', 'Stainless Steel Cleaner', 5),
  ('cleaning_item', 'Magic Eraser', 6),
  ('cleaning_item', 'Microfiber Cloths', 7),
  ('cleaning_item', 'Paper Towels', 8),
  ('cleaning_item', 'Trash Bin with Trash Bags', 9),
  ('cleaning_item', 'First Aid Kit', 10),
  ('cleaning_item', 'WD-40', 11),
  ('cleaning_item', 'Band-Aids', 12),

  -- Office supplies
  ('office_item', 'Markers / Sharpies / Pens', 1),
  ('office_item', 'Business Card Holder', 2),
  ('office_item', 'Mesh Pen Holder', 3),
  ('office_item', 'Lanyards', 4),
  ('office_item', 'Scissors and Utility Knife', 5),
  ('office_item', 'Packing Tape', 6),
  ('office_item', 'Duct Tape', 7),
  ('office_item', 'Zip Ties (Large)', 8),
  ('office_item', 'Bungee Cord', 9),
  ('office_item', 'Stapler & Staples', 10),

  -- Electrical supplies
  ('electrical_item', 'Extension Cords', 1),
  ('electrical_item', 'Power Strip', 2),
  ('electrical_item', 'Calibration Weight', 3),
  ('electrical_item', 'Drill', 4),

  -- Misc supplies
  ('misc_item', 'Bag Stand', 1),
  ('misc_item', 'Brochure Stand', 2),
  ('misc_item', 'Vacuum', 3),
  ('misc_item', 'Water', 4),

  -- Default checklist items
  ('checklist_item', 'Electrical setup complete', 1),
  ('checklist_item', 'Cleaning supplies packed', 2),
  ('checklist_item', 'Lead retrieval device collected', 3),
  ('checklist_item', 'Systems powered on and tested', 4),
  ('checklist_item', 'Booth signage installed', 5),
  ('checklist_item', 'Marketing materials stocked', 6),

  -- Default brochures
  ('brochure_item', 'Stealth', 1),
  ('brochure_item', 'Contact + Halo', 2),
  ('brochure_item', 'Gravity', 3),
  ('brochure_item', 'InFoil', 4),
  ('brochure_item', 'Lab', 5),
  ('brochure_item', 'Large Bag', 6),
  ('brochure_item', 'Lumber', 7),
  ('brochure_item', 'Meat Pump', 8),
  ('brochure_item', 'Metal Detector', 9),
  ('brochure_item', 'Mod Surface', 10),
  ('brochure_item', 'Multi AP', 11),
  ('brochure_item', 'Pharma', 12),
  ('brochure_item', 'Pipeline', 13),
  ('brochure_item', 'Vector', 14),
  ('brochure_item', 'Vent Tube', 15),
  ('brochure_item', 'Vertex', 16),
  ('brochure_item', 'Web', 17),
  ('brochure_item', 'Raptor', 18),
  ('brochure_item', 'Checkweigher', 19),
  ('brochure_item', 'Combo', 20),
  ('brochure_item', 'XL', 21),
  ('brochure_item', 'Tri Fold', 22),
  ('brochure_item', 'Interceptor', 23),
  ('brochure_item', 'Interceptor DF', 24),
  ('brochure_item', 'Interceptor MD', 25)

on conflict (category, value) do nothing;
