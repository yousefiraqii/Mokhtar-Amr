-- Re-link assets after the space-name cleanup (Project N -> Project_N, 
-- Research Papers -> Research_Papers, PDF renames).
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor).
-- No-op if the paths are already updated.

-- Projects (photos + PDFs)
UPDATE projects SET
  image_url   = 'Pojects/Project_1/photo_2026-09-11_20-12-22.jpg',
  image_url_2 = 'Pojects/Project_1/photo_2026-09-11_20-12-30.jpg',
  pdf_url     = 'Pojects/Project_1/AquaPure_Integrated_Natural_Filtration_and_Desalination_System_1.pdf'
WHERE id = 'ee31739d-ac5d-460c-81ee-68f6f1a2cef5';

UPDATE projects SET
  image_url   = 'Pojects/Project_2/photo_2026-09-11_20-13-15.jpg',
  image_url_2 = 'Pojects/Project_2/photo_2026-09-11_20-13-32.jpg',
  pdf_url     = 'Pojects/Project_2/proposal_260701_161429-1.pdf'
WHERE id = '85c193ef-479f-4ebc-b1c5-46f811efdec5';

UPDATE projects SET
  image_url   = 'Pojects/Project_3/photo_2026-09-11_20-13-57.jpg',
  image_url_2 = 'Pojects/Project_3/photo_2026-09-11_20-14-09.jpg',
  pdf_url     = 'Pojects/Project_3/Poster_17107_(2).pdf'
WHERE id = '870379d2-500d-4d58-a778-120257bcc54d';

UPDATE projects SET
  image_url   = 'Pojects/Project_4/photo_2026-09-11_20-15-05.jpg',
  image_url_2 = 'Pojects/Project_4/photo_2026-09-11_20-15-12.jpg',
  pdf_url     = 'Pojects/Project_4/Poster_17212_(2).pdf'
WHERE id = '9f36ad45-688a-444e-a435-bffe1a7e1f8e';

UPDATE projects SET
  image_url   = 'Pojects/Project_5/photo_2026-09-11_20-15-37.jpg',
  image_url_2 = 'Pojects/Project_5/photo_2026-09-11_20-15-45.jpg',
  pdf_url     = 'Pojects/Project_5/Group_17211.pdf'
WHERE id = 'e4d1c7b1-5514-41da-8d2b-4fddae9a51f5';

UPDATE projects SET
  image_url = 'Pojects/Project_6/1.jpg',
  pdf_url   = 'Pojects/Project_6/17101_(2).pdf'
WHERE id = '4158f478-6a1f-4051-a17a-0cc5be53fea0';

-- Research papers (covers + PDFs)
UPDATE research_papers SET
  image_url = 'Research_Papers/1/photo_2026-09-11_20-42-12.jpg',
  pdf_url   = 'Research_Papers/1/AquaPure_Integrated_Natural_Filtration_and_Desalination_System_1.pdf'
WHERE id = 'e6f3e08f-6ae4-40b7-80ed-19f8c252866d';

UPDATE research_papers SET
  image_url = 'Research_Papers/2/photo_2026-09-11_20-42-00.jpg',
  pdf_url   = 'Research_Papers/2/Melioidosis_research_paper.pdf'
WHERE id = '2da1ac1e-2afb-493e-b3ab-2d8bd5e303d7';