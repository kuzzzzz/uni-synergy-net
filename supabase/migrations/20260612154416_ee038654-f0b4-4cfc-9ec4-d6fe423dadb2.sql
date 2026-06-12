
-- Idempotent demo seed for faculty defense
DO $$
DECLARE
  u0 uuid := 'a86bc3bd-20a7-43c6-89fb-a36aaab4e184'; -- existing lead (James)
  u1 uuid := '10000000-0000-0000-0000-000000000001'; -- Amara
  u2 uuid := '10000000-0000-0000-0000-000000000002'; -- Kwame
  u3 uuid := '10000000-0000-0000-0000-000000000003'; -- Nadia
  u4 uuid := '10000000-0000-0000-0000-000000000004'; -- Liam
  u5 uuid := '10000000-0000-0000-0000-000000000005'; -- Priya
  u6 uuid := '10000000-0000-0000-0000-000000000006'; -- Marcus
  u7 uuid := '10000000-0000-0000-0000-000000000007'; -- Sophia
  pw text;
  -- skill ids
  s_python uuid; s_ml uuid; s_dl uuid; s_nlp uuid; s_cv uuid;
  s_react uuid; s_ts uuid; s_node uuid; s_pg uuid; s_neo uuid;
  s_algos uuid; s_ds uuid; s_stats uuid; s_la uuid; s_prob uuid;
  s_latex uuid; s_writing uuid; s_thesis uuid; s_speak uuid; s_pm uuid;
  s_ui uuid; s_fig uuid; s_sql uuid; s_java uuid; s_git uuid;
  -- interests
  i_ai uuid; i_eth uuid; i_edu uuid; i_open uuid; i_health uuid; i_data uuid; i_research uuid; i_web uuid;
  -- groups & projects
  g1 uuid := '11111111-1111-1111-1111-111111111111';
  g2 uuid := '22222222-2222-2222-2222-222222222222';
  g3 uuid := '33333333-3333-3333-3333-333333333333';
  p1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  p2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
  -- Look up skill UUIDs by name
  SELECT id INTO s_python  FROM public.skills WHERE name='Python';
  SELECT id INTO s_ml      FROM public.skills WHERE name='Machine Learning';
  SELECT id INTO s_dl      FROM public.skills WHERE name='Deep Learning';
  SELECT id INTO s_nlp     FROM public.skills WHERE name='NLP';
  SELECT id INTO s_cv      FROM public.skills WHERE name='Computer Vision';
  SELECT id INTO s_react   FROM public.skills WHERE name='React';
  SELECT id INTO s_ts      FROM public.skills WHERE name='TypeScript';
  SELECT id INTO s_node    FROM public.skills WHERE name='Node.js';
  SELECT id INTO s_pg      FROM public.skills WHERE name='PostgreSQL';
  SELECT id INTO s_neo     FROM public.skills WHERE name='Neo4j';
  SELECT id INTO s_algos   FROM public.skills WHERE name='Algorithms';
  SELECT id INTO s_ds      FROM public.skills WHERE name='Data Structures';
  SELECT id INTO s_stats   FROM public.skills WHERE name='Statistics';
  SELECT id INTO s_la      FROM public.skills WHERE name='Linear Algebra';
  SELECT id INTO s_prob    FROM public.skills WHERE name='Probability';
  SELECT id INTO s_latex   FROM public.skills WHERE name='LaTeX';
  SELECT id INTO s_writing FROM public.skills WHERE name='Academic Writing';
  SELECT id INTO s_thesis  FROM public.skills WHERE name='Thesis Defense';
  SELECT id INTO s_speak   FROM public.skills WHERE name='Public Speaking';
  SELECT id INTO s_pm      FROM public.skills WHERE name='Project Management';
  SELECT id INTO s_ui      FROM public.skills WHERE name='UI/UX Design';
  SELECT id INTO s_fig     FROM public.skills WHERE name='Figma';
  SELECT id INTO s_sql     FROM public.skills WHERE name='SQL';
  SELECT id INTO s_java    FROM public.skills WHERE name='Java';
  SELECT id INTO s_git     FROM public.skills WHERE name='Git';

  SELECT id INTO i_ai      FROM public.interests WHERE name='Artificial Intelligence';
  SELECT id INTO i_eth     FROM public.interests WHERE name='Data Ethics';
  SELECT id INTO i_edu     FROM public.interests WHERE name='EdTech';
  SELECT id INTO i_open    FROM public.interests WHERE name='Open Source';
  SELECT id INTO i_health  FROM public.interests WHERE name='HealthTech';
  SELECT id INTO i_data    FROM public.interests WHERE name='Data Science';
  SELECT id INTO i_research FROM public.interests WHERE name='Academic Research';
  SELECT id INTO i_web     FROM public.interests WHERE name='Web Development';

  -- Create auth users (skip if any already exist)
  pw := crypt('Demo1234!', gen_salt('bf'));
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated','authenticated','amara.boateng@demo.ucc.edu', pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amara Boateng"}', now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated','authenticated','kwame.mensah@demo.ucc.edu',  pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kwame Mensah"}',  now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u3, 'authenticated','authenticated','nadia.owusu@demo.ucc.edu',   pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nadia Owusu"}',   now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u4, 'authenticated','authenticated','liam.oconnor@demo.ucc.edu',  pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Liam O''Connor"}',now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u5, 'authenticated','authenticated','priya.sharma@demo.ucc.edu',  pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}',  now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u6, 'authenticated','authenticated','marcus.tan@demo.ucc.edu',    pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Tan"}',    now(), now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000', u7, 'authenticated','authenticated','sophia.reyes@demo.ucc.edu',  pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sophia Reyes"}',  now(), now(),'','','','')
  ON CONFLICT (id) DO NOTHING;

  -- Insert auth identities (required for password login on some Supabase versions)
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  FROM auth.users u
  WHERE u.id IN (u1,u2,u3,u4,u5,u6,u7)
  ON CONFLICT DO NOTHING;

  -- Enrich profiles (trigger created baseline rows)
  UPDATE public.profiles SET full_name='James Carter', department='Computer Science', year='M.Sc Year 1',
    bio='Graph databases, recommender systems, full-stack TypeScript. Building UCC.',
    avatar_url=NULL WHERE id=u0;
  UPDATE public.profiles SET department='Computer Science', year='M.Sc Year 2',
    bio='Deep learning researcher focused on medical imaging. Loves teaching Python.' WHERE id=u1;
  UPDATE public.profiles SET department='Computer Science', year='M.Sc Year 1',
    bio='Backend & databases. PostgreSQL, distributed systems, Neo4j.' WHERE id=u2;
  UPDATE public.profiles SET department='Information Systems', year='M.Sc Year 1',
    bio='HCI & UX researcher. Designs equitable EdTech experiences.' WHERE id=u3;
  UPDATE public.profiles SET department='Computer Science', year='Ph.D Year 2',
    bio='NLP & graph ML. Happy to mentor on thesis writing and LaTeX.' WHERE id=u4;
  UPDATE public.profiles SET department='Statistics', year='M.Sc Year 2',
    bio='Statistical learning, A/B testing, evaluation metrics for recsys.' WHERE id=u5;
  UPDATE public.profiles SET department='Computer Science', year='B.Sc Year 4',
    bio='React + TypeScript enthusiast. Looking for thesis collaborators.' WHERE id=u6;
  UPDATE public.profiles SET department='Computer Science', year='M.Sc Year 1',
    bio='Public speaker, project management. Helps teams stay on track.' WHERE id=u7;

  -- USER SKILLS (designed for visible complementarity with James)
  -- James: strong in React/TS/Node, weak in ML/Stats/LaTeX
  INSERT INTO public.user_skills (user_id, skill_id, level, can_teach) VALUES
    (u0, s_react,'expert',true), (u0, s_ts,'strong',true), (u0, s_node,'strong',true),
    (u0, s_pg,'strong',true),    (u0, s_neo,'strong',true), (u0, s_algos,'medium',false),
    (u0, s_ml,'weak',false),     (u0, s_stats,'weak',false),(u0, s_latex,'weak',false),
    (u0, s_writing,'medium',false),(u0, s_git,'strong',true),
  -- Amara: strong ML/DL/Python (covers James's weak)
    (u1, s_python,'expert',true),(u1, s_ml,'expert',true), (u1, s_dl,'strong',true),
    (u1, s_cv,'strong',true),    (u1, s_stats,'strong',true),(u1, s_react,'weak',false),
  -- Kwame: backend, complements little (peer-strong overlap)
    (u2, s_pg,'expert',true), (u2, s_sql,'strong',true), (u2, s_neo,'medium',false),
    (u2, s_java,'strong',true),(u2, s_algos,'strong',true),(u2, s_ml,'weak',false),
  -- Nadia: UX/UI strong, weak in algos
    (u3, s_ui,'expert',true), (u3, s_fig,'expert',true), (u3, s_react,'medium',false),
    (u3, s_algos,'weak',false),(u3, s_writing,'strong',true),
  -- Liam: NLP/LaTeX/thesis - covers many of James's weak
    (u4, s_nlp,'expert',true), (u4, s_ml,'strong',true), (u4, s_latex,'expert',true),
    (u4, s_writing,'expert',true),(u4, s_thesis,'expert',true),(u4, s_python,'strong',true),
    (u4, s_react,'weak',false),
  -- Priya: stats/probability/LA
    (u5, s_stats,'expert',true),(u5, s_prob,'expert',true),(u5, s_la,'strong',true),
    (u5, s_python,'medium',false),(u5, s_ml,'medium',false),
  -- Marcus: weak in many areas - learner
    (u6, s_react,'medium',false),(u6, s_ts,'weak',false), (u6, s_ml,'weak',false),
    (u6, s_algos,'weak',false),  (u6, s_git,'medium',false),
  -- Sophia: speaking, PM
    (u7, s_speak,'expert',true), (u7, s_pm,'expert',true),(u7, s_writing,'strong',true),
    (u7, s_thesis,'medium',false),(u7, s_python,'weak',false)
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- INTERESTS
  INSERT INTO public.user_interests (user_id, interest_id) VALUES
    (u0,i_ai),(u0,i_open),(u0,i_data),(u0,i_research),
    (u1,i_ai),(u1,i_health),(u1,i_data),
    (u2,i_open),(u2,i_data),
    (u3,i_edu),(u3,i_eth),
    (u4,i_ai),(u4,i_research),(u4,i_eth),
    (u5,i_data),(u5,i_research),
    (u6,i_web),(u6,i_open),
    (u7,i_edu),(u7,i_research)
  ON CONFLICT (user_id, interest_id) DO NOTHING;

  -- AVAILABILITY (weekly blocks)
  INSERT INTO public.availability (user_id, day_of_week, start_time, end_time) VALUES
    (u0,1,'14:00','17:00'),(u0,3,'10:00','12:00'),(u0,5,'15:00','18:00'),
    (u1,1,'14:00','16:00'),(u1,4,'09:00','12:00'),
    (u2,2,'13:00','17:00'),(u2,5,'10:00','13:00'),
    (u3,3,'10:00','12:00'),(u3,5,'15:00','17:00'),
    (u4,1,'16:00','18:00'),(u4,4,'14:00','17:00'),
    (u5,2,'09:00','11:00'),(u5,4,'15:00','17:00'),
    (u6,3,'18:00','21:00'),(u6,6,'10:00','14:00'),
    (u7,1,'10:00','12:00'),(u7,3,'13:00','15:00')
  ON CONFLICT DO NOTHING;

  -- CONNECTIONS: James <-> peers (mix of accepted and pending)
  INSERT INTO public.connection_requests (from_user, to_user, status, message) VALUES
    (u0,u1,'accepted','Hey Amara, would love to collaborate on the ML side of UCC.'),
    (u0,u4,'accepted','Hi Liam, your NLP background would be invaluable.'),
    (u2,u0,'accepted','James — happy to help with the Postgres modelling.'),
    (u7,u0,'accepted','Could mentor on the defense presentation.'),
    (u5,u0,'pending','Saw your recsys work. Want to talk evaluation?'),
    (u6,u0,'pending','Looking for a thesis collaborator.'),
    (u3,u1,'accepted','Let''s pair UX research with your DL pipeline.'),
    (u4,u2,'accepted','Need help indexing my paper corpus in Postgres.')
  ON CONFLICT (from_user, to_user) DO NOTHING;

  -- GROUP MEMBERSHIPS
  INSERT INTO public.group_members (group_id, user_id) VALUES
    (g1,u0),(g1,u2),(g1,u4),(g1,u6),
    (g2,u0),(g2,u1),(g2,u4),(g2,u5),
    (g3,u0),(g3,u4),(g3,u7),(g3,u3)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- PROJECT MEMBERSHIPS
  INSERT INTO public.project_members (project_id, user_id, role) VALUES
    (p1,u0,'owner'),(p1,u1,'member'),(p1,u3,'member'),(p1,u7,'member'),
    (p2,u0,'owner'),(p2,u4,'member'),(p2,u5,'member'),(p2,u2,'member')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- MESSAGES: direct + group + project chat
  INSERT INTO public.messages (sender_id, recipient_id, content, created_at) VALUES
    (u0,u1,'Hi Amara! Want to pair on the recommender baseline this week?', now() - interval '3 days'),
    (u1,u0,'Yes — Thursday 2pm works. I''ll prep the Colab notebook.',       now() - interval '3 days' + interval '12 min'),
    (u0,u4,'Liam, sharing my LaTeX template — could you review chapter 3?',  now() - interval '2 days'),
    (u4,u0,'On it. Will leave comments by tomorrow EOD.',                    now() - interval '2 days' + interval '30 min'),
    (u2,u0,'Pushed the schema migration. Indexes look good in EXPLAIN.',     now() - interval '1 day'),
    (u0,u2,'Nice, p95 dropped from 410ms to 38ms. Huge.',                    now() - interval '1 day' + interval '6 min');

  INSERT INTO public.messages (sender_id, group_id, content, created_at) VALUES
    (u4, g2, 'Reading "Attention is All You Need" tonight. Anyone joining?',                       now() - interval '4 hours'),
    (u1, g2, 'In. I''ll bring the slide deck from the seminar.',                                    now() - interval '3 hours 40 min'),
    (u0, g2, 'I''ll record the discussion and post the transcript here.',                           now() - interval '3 hours 20 min'),
    (u2, g1, 'Mock interview problem: design Twitter''s timeline. Ideas?',                          now() - interval '6 hours'),
    (u6, g1, 'Fan-out on write for celebrities, fan-out on read for the rest?',                     now() - interval '5 hours 40 min'),
    (u7, g3, 'Defense rehearsal Friday 4pm — please bring your slide outline.',                     now() - interval '1 day');

  INSERT INTO public.messages (sender_id, project_id, content, created_at) VALUES
    (u0, p1, 'Sprint goal: ship the matching API endpoint with tests.', now() - interval '2 days'),
    (u1, p1, 'I''ll wire the embeddings service into the scoring fn.',  now() - interval '2 days' + interval '15 min'),
    (u3, p1, 'Will deliver onboarding wireframes by Wednesday.',        now() - interval '1 day'),
    (u4, p2, 'Federation round 3 converged at 0.91 F1. Logging committed.', now() - interval '8 hours');

  -- Extra MILESTONES for second project
  INSERT INTO public.milestones (project_id, title, description, due_date, completed, order_index) VALUES
    (p2, 'Define threat model',           'Adversarial assumptions for federated rounds.', current_date - 10, true,  0),
    (p2, 'Implement secure aggregation',  'Differential privacy noise calibration.',       current_date + 7,  false, 1),
    (p2, 'Benchmark on FEMNIST',          'Compare against centralized baseline.',         current_date + 21, false, 2)
  ON CONFLICT DO NOTHING;

  -- More SESSIONS spanning the demo week
  INSERT INTO public.sessions (group_id, project_id, organizer_id, title, description, scheduled_at, duration_min, location) VALUES
    (g2, NULL, u4, 'Transformer paper club',     'Walk through self-attention end to end.',        now() + interval '1 day 18 hours', 90, 'Library Seminar Room 2'),
    (g1, NULL, u2, 'Mock system-design',         'Live whiteboarding on a Twitter-scale timeline.', now() + interval '2 days 15 hours',60, 'CS Lab B'),
    (g3, NULL, u7, 'Defense dry run',            'Practice 20-minute presentation with Q&A.',      now() + interval '3 days 16 hours',90, 'Online (Zoom)'),
    (NULL, p1, u0, 'Sprint review — Matching API','Demo recommender endpoint to the team.',         now() + interval '4 days 14 hours',45, 'Online'),
    (NULL, p2, u0, 'Federated round retrospective','Discuss accuracy and privacy budget.',          now() + interval '5 days 11 hours',60, 'CS Lab A')
  ON CONFLICT DO NOTHING;

  -- More RESOURCES (public + project/group scoped)
  INSERT INTO public.resources (owner_id, title, description, url, resource_type, project_id, group_id, tags) VALUES
    (u4, 'Stanford CS224N — NLP with Deep Learning', 'Full lecture series.', 'https://web.stanford.edu/class/cs224n/', 'link', NULL, g2, ARRAY['nlp','deep-learning']),
    (u2, 'Designing Data-Intensive Applications', 'Reference for backend / DB design.', 'https://dataintensive.net/', 'link', p1, NULL, ARRAY['systems','database']),
    (u1, 'PyTorch Lightning quickstart', 'Production-grade training loops.', 'https://lightning.ai/docs/pytorch/stable/', 'link', p1, NULL, ARRAY['pytorch','ml']),
    (u7, 'How to defend your thesis (Nature)', 'Practical advice from supervisors.', 'https://www.nature.com/articles/d41586-022-01136-w', 'link', NULL, g3, ARRAY['thesis','defense']),
    (u5, 'Evaluation metrics for recommender systems', 'Precision@K, MAP, NDCG explained.', 'https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)', 'link', p1, NULL, ARRAY['evaluation','recsys']);

  -- NOTIFICATIONS for James (drives the bell icon during demo)
  INSERT INTO public.notifications (user_id, type, body, link, read) VALUES
    (u0, 'connection_request', 'Priya Sharma sent you a connection request.', '/connections', false),
    (u0, 'connection_request', 'Marcus Tan sent you a connection request.',   '/connections', false),
    (u0, 'message',            'Amara Boateng replied in your DM.',            '/messages',    false),
    (u0, 'session',            'Defense dry run scheduled for Friday 4pm.',    '/calendar',    true);
END $$;
