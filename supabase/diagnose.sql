select policyname, cmd, roles::text, qual::text, with_check::text, permissive
from pg_policies
where schemaname = 'public' and tablename = 'offerteverzoeken';
